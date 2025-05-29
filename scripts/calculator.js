import { MODULE_CLIENT_CONFIG, MODULE_CONFIG } from '../applications/settings.js';
import { getHexOffsets } from './measurer.js';
import { tokenHasEffect } from './utils.js';

// TODO: implement click-left

export let TEXT_STYLE;

export class TacticalGridCalculator {
  _highlightLayerName = 'TGC';

  /**
   * Returns highlight layer used by TacticalGridCalculator
   * @returns {GridHighlight}
   */
  getHighlightLayer() {
    return (
      canvas.interface.grid.highlightLayers[this._highlightLayerName] ??
      canvas.interface.grid.addHighlightLayer(this._highlightLayerName)
    );
  }

  /**
   * Clears highlights created by TacticalGridCalculator
   */
  clearHighlightLayer() {
    canvas.interface.grid.clearHighlightLayer(this._highlightLayerName);
  }

  /**
   * Gather valid Token targets for labeling
   * @returns
   */
  getVisibleTokens() {
    let visibleTokens = canvas.tokens.placeables.filter(
      (p) =>
        ((p.visible || p.impreciseVisible) && p.document.disposition !== CONST.TOKEN_DISPOSITIONS.SECRET) ||
        game.user.isGM
    );

    if (MODULE_CONFIG.measurement.ignoreEffect) {
      visibleTokens = visibleTokens.filter((p) => !tokenHasEffect(p, MODULE_CONFIG.measurement.ignoreEffect));
    }
    return visibleTokens;
  }

  /**
   * Handles canvas left-clicks.
   * @param {*} originPoint
   */
  canvasLeftClick(originPoint, { gridSpaces = canvas.grid.type !== CONST.GRID_TYPES.GRIDLESS }) {
    if (!this._measureKeyDown) return;

    if (canvas.tokens.controlled.length === 1) {
      let token = this.createTokenPreview(canvas.tokens.controlled[0], originPoint, gridSpaces);
      this.showDistanceLabelsFromToken(token, { gridSpaces });
    } else {
      this.drawCrossHighlight(originPoint);
      this.showDistanceLabelsFromPoint(originPoint, { gridSpaces });
    }
  }

  createTokenPreview(token, position, snap = true) {
    if (this._tokenClone && this._tokenClone.document.id !== token.document.id) {
      const c = this._tokenClone;
      this._tokenClone = null;
      c.destroy();
    }

    const clone = this._tokenClone ?? token.clone();

    let center = { x: position.x - token.w / 2, y: position.y - token.h / 2 };
    if (snap) center = clone.getSnappedPosition(center);

    clone.document.x = center.x;
    clone.document.y = center.y;

    clone.document.alpha = 0.4;

    clone.draw().then((c) => (c.visible = true));

    this._tokenClone = clone;

    return clone;
  }

  drawCrossHighlight({ x, y } = {}) {
    this.clearHighlightLayer();

    let r = 20;
    let points = [];

    const CROSS_HAIR = [
      [0.0, 0.2],
      [0.5, 0.7],
      [0.7, 0.5],
      [0.2, 0.0],
      [0.7, -0.5],
      [0.5, -0.7],
      [0.0, -0.2],
      [-0.5, -0.7],
      [-0.7, -0.5],
      [-0.2, 0.0],
      [-0.7, 0.5],
      [-0.5, 0.7],
    ];

    CROSS_HAIR.forEach((p) => points.push(x + p[0] * r, y + p[1] * r));
    const shape = new PIXI.Polygon(points);

    const layer = this.getHighlightLayer();
    layer.beginFill(MODULE_CONFIG.marker.color, MODULE_CONFIG.marker.alpha);
    if (MODULE_CONFIG.marker.border)
      layer.lineStyle(
        canvas.grid.thickness,
        MODULE_CONFIG.marker.border,
        Math.min(MODULE_CONFIG.marker.alpha * 1.5, 1.0)
      );

    layer.drawShape(shape).endFill();
  }

  /**
   * Displays distance from origin point to all visible tokens.
   * @param {object} originPoint
   */
  showDistanceLabelsFromPoint(originPoint, { gridSpaces = canvas.grid.type !== CONST.GRID_TYPES.GRIDLESS } = {}) {
    if (!originPoint) return;
    originPoint = { ...originPoint };

    if (gridSpaces == null) {
      gridSpaces =
        canvas.grid.type !== CONST.GRID_TYPES.GRIDLESS &&
        !game.keyboard.isModifierActive(foundry.helpers.interaction.KeyboardManager.MODIFIER_KEYS.SHIFT);
    }

    const visibleTokens = this.getVisibleTokens();
    for (const token of visibleTokens) {
      const fromPoint = { ...originPoint };
      const toPoints = DistanceUtilities.targetPoints(originPoint, token);

      if (MODULE_CONFIG.measurement.volumetricTokens) {
        fromPoint.elevation = DistanceUtilities.determineVolumetricPointElevation(fromPoint, token);
      }

      // Calculate distances
      toPoints.forEach((p) => {
        p.distance = DistanceCalculator.calculateDistance(fromPoint, p, token, {
          gridSpaces,
        });
      });

      // Display distances as labels
      if (toPoints.length) {
        if (MODULE_CONFIG.measurement.shortestDistance) {
          const smallest = toPoints.reduce((d1, d2) => (d1.distance < d2.distance ? d1 : d2));
          this.addUpdateLabel(token, token.w / 2, token.h / 2, this.genLabel(smallest.distance));
        } else {
          toPoints.forEach((d) => {
            this.addUpdateLabel(token, d.offsetX, d.offsetY, this.genLabel(d.distance));
          });
        }
      }
    }
  }

  /**
   * Displays distance from origin token to all other visible tokens.
   * @param {Token} originToken
   */
  showDistanceLabelsFromToken(originToken, { gridSpaces } = {}) {
    if (!originToken) return;

    if (gridSpaces == null) {
      gridSpaces =
        canvas.grid.type !== CONST.GRID_TYPES.GRIDLESS &&
        !game.keyboard.isModifierActive(foundry.helpers.interaction.KeyboardManager.MODIFIER_KEYS.SHIFT);
    }

    const visibleTokens = this.getVisibleTokens();
    for (const token of visibleTokens) {
      if (token.id === originToken.id) continue;

      const fromPoint = DistanceUtilities.nearestOriginPoint(originToken, token);
      const toPoints = DistanceUtilities.targetPoints(fromPoint, token);

      if (MODULE_CONFIG.measurement.volumetricTokens) {
        const { originElevation, targetElevation } = DistanceUtilities.determineVolumetricTokenElevation(
          originToken,
          token
        );

        fromPoint.elevation = originElevation;
        toPoints.forEach((p) => (p.elevation = targetElevation));
      }

      /// Calculate Cover
      if (MODULE_CONFIG.cover.calculator !== 'none' && (!MODULE_CONFIG.cover.combatOnly || game.combat?.started)) {
        if (originToken.id !== token.id) {
          try {
            cover = computeCoverBonus(originToken, token);
            if (cover) toPoints.forEach((p) => (p.cover = cover));
          } catch (e) {
            console.error(e);
          }
        }
      }

      // Calculate distances
      toPoints.forEach((p) => {
        p.distance = DistanceCalculator.calculateDistance(fromPoint, p, token, {
          originToken,
          gridSpaces,
        });
      });

      // Display distances as labels
      if (toPoints.length) {
        if (MODULE_CONFIG.measurement.shortestDistance) {
          const smallest = toPoints.reduce((d1, d2) => (d1.distance < d2.distance ? d1 : d2));
          this.addUpdateLabel(token, token.w / 2, token.h / 2, this.genLabel(smallest.distance), smallest.cover);
        } else {
          toPoints.forEach((d) => {
            this.addUpdateLabel(token, d.offsetX, d.offsetY, this.genLabel(d.distance), d.cover);
          });
        }
      }
    }
  }

  /**
   * Create a string label for a given distance measurement
   * @param {object} distance
   * @returns {String}
   */
  genLabel(distance) {
    return `${distance} ${canvas.scene.grid.units}`;
  }

  /**
   * Adds a distance/cover label on top of the token at the provided coordinates
   * @param {Token} token
   * @param {Number} x
   * @param {Number} y
   * @param {String} text
   * @param {Number} cover
   * @returns
   */
  addUpdateLabel(token, x, y, text, cover) {
    if (cover != null) {
      const labels = MODULE_CONFIG.cover;
      if (cover <= 0 && labels.noCover) text += `\n${labels.noCover}`;
      if (cover === 2 && labels.halfCover) text += `\n${labels.halfCover}`;
      if (cover === 5 && labels.threeQuartersCover) text += `\n${labels.threeQuartersCover}`;
      if (cover > 5 && labels.totalCover) text += `\n${labels.totalCover}`;
    }

    if (token._atgLabels) {
      for (const t of token._atgLabels) {
        if (t.atgX === x && t.atgY === y) {
          t.text = text;
          return;
        }
      }
    }

    if (!TEXT_STYLE) {
      TEXT_STYLE = foundry.canvas.containers.PreciseText.getTextStyle({
        ...MODULE_CONFIG.measurement,
        fontFamily: [MODULE_CONFIG.measurement.fontFamily, 'fontAwesome'].join(','),
      });
    }

    // Scale Font Size to Grid Size if needed
    if (
      MODULE_CONFIG.measurement.enableFontScaling &&
      MODULE_CONFIG.measurement.baseGridSize &&
      MODULE_CONFIG.measurement.baseGridSize !== canvas.dimensions.size
    ) {
      TEXT_STYLE.fontSize =
        MODULE_CONFIG.measurement.fontSize * (canvas.dimensions.size / MODULE_CONFIG.measurement.baseGridSize);
    } else {
      TEXT_STYLE.fontSize = MODULE_CONFIG.measurement.fontSize;
    }

    let pText = new foundry.canvas.containers.PreciseText(text, TEXT_STYLE);
    pText.anchor.set(0.5);

    // Apply to _impreciseMesh (Vision5e support) if it's visible
    if (token.impreciseVisible) {
      pText = canvas.tokens.addChild(pText);
      pText.x = token.x + x;
      pText.y = token.y + y;
    } else {
      pText = token.addChild(pText);
      pText.x = x;
      pText.y = y;
    }
    pText.atgX = x;
    pText.atgY = y;

    if (token._atgLabels) token._atgLabels.push(pText);
    else token._atgLabels = [pText];
  }

  hideLabels() {
    this.deleteLabels();

    canvas.interface.grid.destroyHighlightLayer(this._highlightLayerName);

    if (MODULE_CLIENT_CONFIG.broadcastMeasures) {
      const message = {
        handlerName: 'measures',
        args: { userId: game.user.id, sceneId: canvas.scene.id },
        type: 'hide',
      };
      game.socket.emit(`module.${MODULE_ID}`, message);
    }
  }

  /**
   * Deletes token labels created by TacticalGridCalculator
   */
  deleteLabels() {
    canvas.tokens.placeables.forEach((p) => {
      if (p._atgLabels) {
        p._atgLabels.forEach((t) => t.parent.removeChild(t)?.destroy());
        delete p._atgLabels;
      }
    });

    if (CONFIG.debug.atg) {
      canvas.controls.debug.clear();
    }

    if (this._tokenClone) {
      const c = this._tokenClone;
      this._tokenClone = null;
      c.destroy();
    }
  }
}

export class DistanceUtilities {
  /**
   * Instead of treating a token as a 2d platform, treat it as a volume, changing the originPoint
   * elevation in a manner that compensates for token height
   * @param {*} originPoint
   * @param {*} token
   */
  static determineVolumetricTokenElevation(originToken, targetToken) {
    const originTop = Math.ceil(originToken.document.height) * canvas.grid.distance + originToken.document.elevation;
    const originBottom = originToken.document.elevation;
    const targetTop = Math.ceil(targetToken.document.height) * canvas.grid.distance + targetToken.document.elevation;
    const targetBottom = targetToken.document.elevation;

    let originElevation;
    let targetElevation;

    if (originTop <= targetBottom) {
      originElevation = originTop - canvas.grid.distance;
      targetElevation = targetBottom;
    } else if (originBottom >= targetTop) {
      originElevation = originBottom;
      targetElevation = targetTop - canvas.grid.distance;
    } else {
      originElevation = originBottom;
      targetElevation = originBottom;
    }

    return { originElevation, targetElevation };
  }

  static determineVolumetricPointElevation(originPoint, targetToken) {
    const targetTop = Math.ceil(targetToken.document.height) * canvas.grid.distance + targetToken.document.elevation;
    const targetBottom = targetToken.document.elevation;

    if (originPoint.elevation < targetTop && originPoint.elevation > targetBottom) {
      return targetBottom;
    } else if (originPoint.elevation >= targetTop) {
      return originPoint.elevation - (targetTop - canvas.grid.distance - targetBottom);
    }

    return originPoint.elevation;
  }

  /**
   * Calculates squared euclidean distance between two points
   * @param {object} p1
   * @param {object} p2
   * @returns
   */
  static squaredEuclidean(p1, p2) {
    return (p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2;
  }

  /**
   * Find the closest point on the origin token, to the target token
   * @param {Token} oToken origin token
   * @param {Token} tToken target token
   * @returns {x, y} closest grid space or border edge (gridless)
   */
  static nearestOriginPoint(oToken, tToken) {
    let point;

    const center = oToken.center;
    if (canvas.grid.type === CONST.GRID_TYPES.GRIDLESS) {
      if (MODULE_CONFIG.measurement.gridlessCircle) {
        point = DistanceUtilities.nearestPointToCircle(
          { ...center, r: Math.min(oToken.w, oToken.h) / 2 },
          tToken.center
        );
      } else {
        point = DistanceUtilities.nearestPointToRectangle(
          {
            minX: center.x - oToken.w / 2,
            minY: center.y - oToken.h / 2,
            maxX: center.x + oToken.w / 2,
            maxY: center.y + oToken.h / 2,
          },
          tToken.center
        );
      }
    }
    if (point) return { ...point, elevation: oToken.document.elevation };

    let gridPoints = [];
    if (canvas.grid.type !== CONST.GRID_TYPES.SQUARE && oToken.document.width == oToken.document.height) {
      const offsets = getHexOffsets(oToken);
      if (offsets) {
        for (const offset of offsets) {
          gridPoints.push({
            x: center.x - oToken.w / 2 + oToken.w * offset[0],
            y: center.y - oToken.h / 2 + oToken.h * offset[1],
          });
        }
      }
    }

    if (!gridPoints.length) {
      for (let h = 0; h < oToken.h / canvas.grid.size; h++) {
        for (let w = 0; w < oToken.w / canvas.grid.size; w++) {
          gridPoints.push({
            x: center.x - oToken.w / 2 + canvas.grid.size * w + canvas.grid.size / 2,
            y: center.y - oToken.h / 2 + canvas.grid.size * h + canvas.grid.size / 2,
          });
        }
      }
    }

    // Find the grid point with the shortest distance to tToken
    if (!gridPoints.length) return { ...center, elevation: oToken.document.elevation };

    const tCenter = tToken.center;
    let closest = gridPoints[0];
    let cDistance = DistanceUtilities.squaredEuclidean(closest, tCenter);
    for (let i = 1; i < gridPoints.length; i++) {
      const d = DistanceUtilities.squaredEuclidean(gridPoints[i], tCenter);
      if (d < cDistance) {
        closest = gridPoints[i];
        cDistance = d;
      }
    }
    return { ...closest, elevation: oToken.document.elevation };
  }

  /**
   * Calculates coordinates on the token to be used in distance calculations along with offsets for where the distance label is to be shown
   * @param {PIXI.Point} originPoint point from which distances are to be calculated
   * @param {Token} token token to which distances are to be calculated
   * @returns {Array[]}
   */
  static targetPoints(originPoint, token) {
    const points = [];

    // Gridless
    if (canvas.grid.type === CONST.GRID_TYPES.GRIDLESS) {
      let target = {};

      const b = token.bounds;
      if (MODULE_CONFIG.measurement.gridlessCircle) {
        target = DistanceUtilities.nearestPointToCircle(
          { ...token.center, r: Math.min(b.width, b.height) / 2 },
          originPoint
        );
      } else {
        target = DistanceUtilities.nearestPointToRectangle(
          {
            minX: b.x,
            minY: b.y,
            maxX: b.x + b.width,
            maxY: b.y + b.height,
          },
          originPoint
        );
      }

      points.push({ ...target, offsetX: token.w / 2, offsetY: token.h / 2, elevation: token.document.elevation });
    } else if (canvas.grid.type !== CONST.GRID_TYPES.SQUARE && token.document.width == token.document.height) {
      // Hexagonal Grid
      const offsets = getHexOffsets(token);
      if (offsets) {
        for (const offset of offsets) {
          const offsetX = token.w * offset[0];
          const offsetY = token.h * offset[1];
          points.push({
            x: token.x + offsetX,
            y: token.y + offsetY,
            offsetX,
            offsetY,
            elevation: token.document.elevation,
          });
        }
      }
    }

    // Square Grid or fallback
    if (!points.length) {
      for (let h = 0; h < token.h / canvas.grid.size; h++) {
        for (let w = 0; w < token.w / canvas.grid.size; w++) {
          const offsetY = canvas.grid.size * h + canvas.grid.size / 2;
          const offsetX = canvas.grid.size * w + canvas.grid.size / 2;
          points.push({
            x: token.x + offsetX,
            y: token.y + offsetY,
            offsetX,
            offsetY,
            elevation: token.document.elevation,
          });
        }
      }
    }

    return points;
  }

  /**
   * Find the nearest point on a circle given a point on the scene
   * @param {object} c {x, y, r}
   * @param {object} p {x, y}
   * @returns nearest point {x, y}
   */
  static nearestPointToCircle(c, p) {
    // If c === p, return any edge
    if (c.x === p.x && c.y === p.y) return { x: p.x, y: p.y };
    let vX = p.x - c.x;
    let vY = p.y - c.y;
    let magV = Math.sqrt(vX * vX + vY * vY);
    if (magV <= c.r) return { x: p.x, y: p.y };
    return { x: c.x + (vX / magV) * c.r, y: c.y + (vY / magV) * c.r };
  }

  /**
   * Find the nearest point on a rectangle given a point on the scene
   * @param {object} rect {minX, maxX, minY, maxY}
   * @param {object} p {x, y}
   * @returns nearest point {x, y}
   */
  static nearestPointToRectangle(rect, p) {
    const nearest = { x: p.x, y: p.y };
    if (p.x < rect.minX) nearest.x = rect.minX;
    else if (p.x > rect.maxX) nearest.x = rect.maxX;

    if (p.y < rect.minY) nearest.y = rect.minY;
    else if (p.y > rect.maxY) nearest.y = rect.maxY;
    return nearest;
  }
}

class DistanceCalculator {
  static calculateDistance(originPoint, targetPoint, targetToken, { originToken, gridSpaces = true } = {}) {
    // Delegate distance measurements to PF2e's `distanceTo` util
    if (game.system.id === 'pf2e' && targetToken && originToken) {
      return this._applyPrecision(originToken.distanceTo(targetToken));
    }

    const result = canvas.grid.measurePath([originPoint, targetPoint]);
    return this._applyPrecision(gridSpaces ? result.distance : result.euclidean);
  }

  static _applyPrecision(distance) {
    let precision = 10 ** MODULE_CONFIG.measurement.precision;
    let number = parseFloat(
      (Math.round(distance * precision) / precision).toFixed(MODULE_CONFIG.measurement.precision)
    );
    return number + MODULE_CONFIG.distanceCalcOffset;
  }
}
