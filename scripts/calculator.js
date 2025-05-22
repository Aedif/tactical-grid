import { MODULE_CLIENT_CONFIG, MODULE_CONFIG } from '../applications/settings.js';
import { getHexOffsets } from './measurer.js';
import { tokenHasEffect } from './utils.js';

// TODO: implement click-left

export let TEXT_STYLE;

export class TacticalGridCalculator {
  _highlightLayerName = 'TGC';

  /**
   * Handles a generic request to display distances to tokens.
   * The function will guess the origin of the measurements based on the current canvas state such as an active Ruler or Token previews
   * @param {*} param0
   */
  showDistances({ gridSpaces = true, useControlledToken = false, position } = {}) {
    const token = useControlledToken ? canvas.tokens.controlled[0] : canvas.tokens.preview.children[0];
    if (token) return this.showDistanceLabelsFromToken(token);

    this.position = position;
    this.snap =
      canvas.grid.type !== CONST.GRID_TYPES.GRIDLESS &&
      !game.keyboard.isModifierActive(foundry.helpers.interaction.KeyboardManager.MODIFIER_KEYS.SHIFT);
  }

  /**
   * Clears highlights created by TacticalGridCalculator
   */
  clearHighlightLayer() {
    canvas.interface.grid.clearHighlightLayer(this._highlightLayerName);
  }

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
   * Highlights grid bellow the provided token
   * @param {Token} token
   * @returns
   */
  highlightTokenGridPosition(token) {
    this.clearHighlightLayer();
    const layer = this.getHighlightLayer();
    if (!layer) return;

    let shape;
    if (MODULE_CONFIG.measurement.gridlessCircle && canvas.grid.type === CONST.GRID_TYPES.GRIDLESS) {
      shape = new PIXI.Ellipse(token.center.x, token.center.y, token.w / 2, token.h / 2);
    } else {
      shape = new PIXI.Rectangle(token.x, token.y, token.w, token.h);
    }

    if (Number.isFinite(MODULE_CONFIG.marker.color))
      layer.beginFill(MODULE_CONFIG.marker.color, MODULE_CONFIG.marker.alpha);
    if (Number.isFinite(MODULE_CONFIG.marker.border))
      layer.lineStyle(2, MODULE_CONFIG.marker.color, MODULE_CONFIG.marker.alpha);
    else layer.lineStyle(0);

    layer.drawShape(shape).endFill();
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
   * Displays distance from origin point to all visible tokens.
   * @param {object} originPoint
   */
  showDistanceLabelsFromPoint(originPoint) {
    this.deleteLabels();

    const visibleTokens = this.getVisibleTokens();
    for (const token of visibleTokens) {
      const toPoints = DistanceUtilities.targetPoints(originPoint, token);

      const distances = toPoints.map((p) => {
        return {
          distance: DistanceCalculator.calculateDistance(originPoint, p, token, {
            originToken,
          }),
        };
      });

      if (distances.length) {
        if (MODULE_CONFIG.measurement.shortestDistance) {
          const smallest = distances.reduce((d1, d2) => (d1.distance < d2.distance ? d1 : d2));
          this.addUpdateLabel(token, token.w / 2, token.h / 2, this.genLabel(smallest.distance));
        } else {
          distances.forEach((d) => {
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
  showDistanceLabelsFromToken(originToken) {
    if (!originToken) return;

    this.deleteLabels();

    const visibleTokens = this.getVisibleTokens();
    for (const token of visibleTokens) {
      const fromPoint = DistanceUtilities.nearestOriginPoint(originToken, token);
      const toPoints = DistanceUtilities.targetPoints(fromPoint, token);

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

      const distances = toPoints.map((p) => {
        return {
          distance: DistanceCalculator.calculateDistance(fromPoint, p, token, {
            originToken,
          }),
          cover: p.cover,
        };
      });

      if (distances.length) {
        if (MODULE_CONFIG.measurement.shortestDistance) {
          const smallest = distances.reduce((d1, d2) => (d1.distance < d2.distance ? d1 : d2));
          this.addUpdateLabel(token, token.w / 2, token.h / 2, this.genLabel(smallest.distance), smallest.cover);
        } else {
          distances.forEach((d) => {
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
  }
}

export class DistanceUtilities {
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
    const center = oToken.center;
    if (canvas.grid.type === CONST.GRID_TYPES.GRIDLESS) {
      if (MODULE_CONFIG.measurement.gridlessCircle) {
        return DistanceUtilities.nearestPointToCircle(
          { ...center, r: Math.min(oToken.w, oToken.h) / 2 },
          tToken.center
        );
      } else {
        return DistanceUtilities.nearestPointToRectangle(
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
    if (!gridPoints.length) return center;

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
    return closest;
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

      points.push({ ...target, offsetX: token.w / 2, offsetY: token.h / 2 });
    } else if (canvas.grid.type !== CONST.GRID_TYPES.SQUARE && token.document.width == token.document.height) {
      // Hexagonal Grid
      const offsets = getHexOffsets(token);
      if (offsets) {
        for (const offset of offsets) {
          const offsetX = token.w * offset[0];
          const offsetY = token.h * offset[1];
          points.push({ x: token.x + offsetX, y: token.y + offsetY, offsetX, offsetY });
        }
      }
    }

    // Square Grid or fallback
    if (!points.length) {
      for (let h = 0; h < token.h / canvas.grid.size; h++) {
        for (let w = 0; w < token.w / canvas.grid.size; w++) {
          const offsetY = canvas.grid.size * h + canvas.grid.size / 2;
          const offsetX = canvas.grid.size * w + canvas.grid.size / 2;
          points.push({ x: token.x + offsetX, y: token.y + offsetY, offsetX, offsetY });
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
  /**
   * Calculate distance between coordinate points and/or tokens
   * @param {*} originPoint
   * @param {*} targetPoint
   * @param {*} targetToken
   * @param {*} param3
   * @returns
   */
  static calculateDistance(originPoint, targetPoint, targetToken, { originToken, gridSpaces = true } = {}) {
    // Delegate distance measurements to PF2e's `distanceTo` util
    if (game.system.id === 'pf2e' && targetToken && originToken) {
      return this._applyPrecision(originToken.distanceTo(targetToken));
    }

    targetToken = targetToken?.document;
    originToken = originToken?.document;

    if (MODULE_CONFIG.measurement.includeElevation) {
      const sdr = canvas.grid.size / canvas.dimensions.distance;

      if (originPoint.z == null) originPoint.z = Math.floor((originToken ? originToken.elevation : 0) * sdr);
      if (originPoint.height == null) originPoint.height = Math.floor((originToken?.width || 0) * canvas.grid.size);
      if (targetPoint.z == null) targetPoint.z = Math.floor((targetToken ? targetToken.elevation : 0) * sdr);
      if (targetPoint.height == null) targetPoint.height = Math.floor((targetToken?.width || 0) * canvas.grid.size);
    } else {
      originPoint.z = 0;
      originPoint.height = 0;
      targetPoint.z = 0;
      targetPoint.height = 0;
    }

    let dx = originPoint.x - targetPoint.x,
      dy = originPoint.y - targetPoint.y;

    let distance;
    const d = canvas.dimensions;
    if (canvas.grid.type === CONST.GRID_TYPES.GRIDLESS || !gridSpaces) {
      let dz = Math.abs(originPoint.z - targetPoint.z);
      // Take into account token z-axis heights by subtracting the lower token
      if (originPoint.z < targetPoint.z) {
        if (originToken) dz -= originToken.width * canvas.grid.size;
      } else if (targetPoint.z < originPoint.z) {
        if (targetToken) dz -= targetToken.width * canvas.grid.size;
      }
      if (dz < 0) dz = 0;

      distance = (Math.sqrt(dx * dx + dy * dy + dz * dz) / d.size) * d.distance;
    } else if (canvas.grid.type !== CONST.GRID_TYPES.SQUARE) {
      distance = this.getHexDistance(origin, targetPoint, { gridSpaces });
    } else {
      let dz;
      // If originPoint and target are on the same plane we ignore z component
      if (originPoint.z === targetPoint.z) dz = 0;
      else if (originPoint.z > targetPoint.z && originPoint.z < targetPoint.z + targetPoint.height) dz = 0;
      else if (targetPoint.z > originPoint.z && targetPoint.z < originPoint.z + originPoint.height) dz = 0;
      else {
        originPoint.z = canvas.tokens.getSnappedPoint({ x: 0, y: originPoint.z }).y;
        targetPoint.z = canvas.tokens.getSnappedPoint({ x: 0, y: targetPoint.z }).y;
        dz =
          Math.abs(
            Math.min(
              originPoint.z + originPoint.height - targetPoint.z,
              targetPoint.z + targetPoint.height - originPoint.z
            )
          ) + (canvas.grid.sizeX ?? canvas.grid.w);
      }

      let nx = Math.abs(Math.ceil(dx / d.size)),
        ny = Math.abs(Math.ceil(dy / d.size)),
        nd = Math.min(nx, ny),
        nz = Math.ceil(dz / d.size),
        sorted = [nx, ny, nz].sort((a, b) => a - b),
        moves = {
          doubleDiagonal: sorted[0],
          diagonal: sorted[1] - sorted[0],
          straight: sorted[2] - sorted[1],
        };

      distance =
        Math.floor(
          moves.doubleDiagonal * MODULE_CONFIG.measurement.doubleDiagonalMultiplier +
            moves.diagonal * MODULE_CONFIG.measurement.diagonalMultiplier +
            moves.straight
        ) * d.distance;
    }

    return this._applyPrecision(distance);
  }

  static _applyPrecision(distance) {
    let precision = 10 ** MODULE_CONFIG.measurement.precision;
    let number = parseFloat(
      (Math.round(distance * precision) / precision).toFixed(MODULE_CONFIG.measurement.precision)
    );
    return number + MODULE_CONFIG.distanceCalcOffset;
  }

  static getHexDistance(origin, target, options) {
    let dz;
    // If origin and target are on the same plane we ignore z component
    if (origin.z === target.z) dz = 0;
    else if (origin.z > target.z && origin.z < target.z + target.height) dz = 0;
    else if (target.z > origin.z && target.z < origin.z + origin.height) dz = 0;
    else {
      origin.z = canvas.tokens.getSnappedPoint({ x: 0, y: origin.z }).y;
      target.z = canvas.tokens.getSnappedPoint({ x: 0, y: target.z }).y;
      dz =
        Math.abs(Math.min(origin.z + origin.height - target.z, target.z + target.height - origin.z)) +
        (canvas.grid.sizeX ?? canvas.grid.w);
    }

    if (dz != 0) {
      let dx = target.x - origin.x;
      let dy = target.y - origin.y;
      let mag = Math.max(Math.sqrt(dx * dx + dy * dy), 0.0000001);
      let angle = Math.atan(dz / mag);
      let length = mag / Math.cos(angle);

      let ray = Ray.fromAngle(0, 0, angle, length);
      const segments = [{ ray }];
      return canvas.grid.grid.measureDistances(segments, options)[0];
    } else {
      return canvas.grid.measureDistance(origin, target, options);
    }
  }
}
