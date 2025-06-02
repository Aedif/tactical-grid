import { MODULE_CLIENT_CONFIG, MODULE_CONFIG } from '../applications/settings.js';
import { computeCoverBonus } from './cover.js';
import { tokenHasEffect } from './utils.js';

export class TacticalGridCalculator {
  _highlightLayerName = 'TGC';

  constructor() {
    this.refreshTextStyle();
  }

  /**
   * Called on setting change to refresh the text style used on labels applied by TacticalGridCalculator
   */
  refreshTextStyle() {
    this._textStyle = foundry.canvas.containers.PreciseText.getTextStyle({
      ...MODULE_CONFIG.measurement,
      fontFamily: [MODULE_CONFIG.measurement.fontFamily, 'fontAwesome'].join(','),
    });
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
  canvasLeftClick(originPoint) {
    if (!this._measureKeyDown) return;

    if (canvas.tokens.controlled.length === 1) {
      let token = this.createTokenPreview(canvas.tokens.controlled[0], originPoint);
      this.showDistanceLabelsFromToken(token);
    } else {
      this.drawCrossHighlight(canvas.grid.getCenterPoint(originPoint));
      this.showDistanceLabelsFromPoint(originPoint);
    }
  }

  createTokenPreview(token, position) {
    if (this._tokenClone && this._tokenClone.document.id !== token.document.id) {
      const c = this._tokenClone;
      this._tokenClone = null;
      c.destroy();
    }

    const clone = this._tokenClone ?? token.clone();

    let center = { x: position.x - token.w / 2, y: position.y - token.h / 2 };
    center = clone.getSnappedPosition(center);

    clone.document.x = center.x;
    clone.document.y = center.y;

    clone.document.alpha = 0.7;
    clone.document.texture.tint = Color.fromString('#00ff00');

    clone.draw().then((c) => (c.visible = true));

    this._tokenClone = clone;

    return clone;
  }

  drawCrossHighlight({ x, y } = {}, skipClear = false) {
    if (!skipClear) this.clearHighlightLayer();

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
  showDistanceLabelsFromPoint(originPoint) {
    if (MODULE_CLIENT_CONFIG.disableTacticalGrid) return;

    originPoint = canvas.grid.getTopLeftPoint(originPoint);

    const visibleTokens = this.getVisibleTokens();
    for (const token of visibleTokens) {
      const fromPoint = { ...originPoint };
      const toPoint = DistanceUtilities.targetPoint(originPoint, token);

      if (MODULE_CONFIG.measurement.volumetricTokens) {
        fromPoint.elevation = DistanceUtilities.determineVolumetricPointElevation(fromPoint, token);
      }

      // Calculate distance
      const distance = DistanceCalculator.calculateDistance(fromPoint, toPoint, token);

      // Display distance
      this.addUpdateLabel(token, token.center, this.genLabel(distance));
    }
  }

  /**
   * Displays distance from origin token to all other visible tokens.
   * @param {Token} originToken
   */
  showDistanceLabelsFromToken(originToken) {
    if (MODULE_CLIENT_CONFIG.disableTacticalGrid) return;

    this.clearHighlightLayer(); // test

    const visibleTokens = this.getVisibleTokens();
    for (const token of visibleTokens) {
      if (token.id === originToken.id) continue;

      const fromPoint = DistanceUtilities.nearestOriginPoint(originToken, token);
      const toPoint = DistanceUtilities.targetPoint(fromPoint, token);

      if (MODULE_CONFIG.measurement.volumetricTokens) {
        const { originElevation, targetElevation } = DistanceUtilities.determineVolumetricTokenElevation(
          originToken,
          token
        );

        fromPoint.elevation = originElevation;
        toPoint.elevation = targetElevation;
      }

      /// Calculate Cover
      let cover;
      if (MODULE_CONFIG.cover.calculator !== 'none' && (!MODULE_CONFIG.cover.combatOnly || game.combat?.started)) {
        cover = computeCoverBonus(originToken, token);
      }

      // Calculate distance
      const distance = DistanceCalculator.calculateDistance(fromPoint, toPoint, token, {
        originToken,
      });

      // Display distance and cover label
      this.addUpdateLabel(token, token.center, this.genLabel(distance), cover);
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
  addUpdateLabel(token, { x, y } = {}, text, cover) {
    if (cover != null) {
      const labels = MODULE_CONFIG.cover;
      if (cover <= 0 && labels.noCover) text += `\n${labels.noCover}`;
      else if (cover === 2 && labels.halfCover) text += `\n${labels.halfCover}`;
      else if (cover === 5 && labels.threeQuartersCover) text += `\n${labels.threeQuartersCover}`;
      else if (cover > 5 && labels.totalCover) text += `\n${labels.totalCover}`;
    }

    if (token._atgLabels) {
      for (const t of token._atgLabels) {
        if (t.atgX === x && t.atgY === y) {
          t.text = text;
          return;
        }
      }
    }

    // Scale Font Size to Grid Size if needed
    if (
      MODULE_CONFIG.measurement.enableFontScaling &&
      MODULE_CONFIG.measurement.baseGridSize &&
      MODULE_CONFIG.measurement.baseGridSize !== canvas.dimensions.size
    ) {
      this._textStyle.fontSize =
        MODULE_CONFIG.measurement.fontSize * (canvas.dimensions.size / MODULE_CONFIG.measurement.baseGridSize);
    } else {
      this._textStyle.fontSize = MODULE_CONFIG.measurement.fontSize;
    }

    let pText = new foundry.canvas.containers.PreciseText(text, this._textStyle);
    pText.anchor.set(0.5);

    // Apply to _impreciseMesh (Vision5e support) if it's visible
    if (token.impreciseVisible) {
      pText = canvas.tokens.addChild(pText);
      pText.x = x;
      pText.y = y;
    } else {
      pText = token.addChild(pText);
      pText.x = x - token.x;
      pText.y = y - token.y;
    }
    pText.atgX = x;
    pText.atgY = y;

    if (token._atgLabels) token._atgLabels.push(pText);
    else token._atgLabels = [pText];
  }

  hideLabels() {
    this.deleteLabels();
    canvas.interface.grid.destroyHighlightLayer(this._highlightLayerName);
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
    if (canvas.grid.type === CONST.GRID_TYPES.GRIDLESS) {
      return { ...DistanceUtilities.nearestPointToToken(tToken.center, oToken), elevation: oToken.document.elevation };
    }

    return this.nearestGridPoint(
      tToken.center,
      DistanceUtilities.getOccupiedGridPoints(oToken),
      oToken.document.elevation
    );
  }

  /**
   * Calculates coordinates on the token to be used in distance calculations
   * @param {PIXI.Point} originPoint point from which distances are to be calculated
   * @param {Token} token token to which distances are to be calculated
   * @returns {Array[]}
   */
  static targetPoint(originPoint, token) {
    if (canvas.grid.type === CONST.GRID_TYPES.GRIDLESS) {
      let target = DistanceUtilities.nearestPointToToken(originPoint, token);
      return { ...target, center: { x: token.w / 2, y: token.h / 2 }, elevation: token.document.elevation };
    } else {
      return this.nearestGridPoint(
        originPoint,
        DistanceUtilities.getOccupiedGridPoints(token),
        token.document.elevation
      );
    }
  }

  /**
   * Returns the grid point nearest to 'point'
   * @param {*} point
   * @param {*} gridPoints
   * @param {*} elevation
   * @returns
   */
  static nearestGridPoint(point, gridPoints, elevation) {
    let closest = gridPoints[0];
    let cDistance = DistanceUtilities.squaredEuclidean(closest, point);
    for (let i = 1; i < gridPoints.length; i++) {
      const d = DistanceUtilities.squaredEuclidean(gridPoints[i], point);
      if (d < cDistance) {
        closest = gridPoints[i];
        cDistance = d;
      }
    }

    return { ...closest, elevation };
  }

  /**
   * Returns coordinates of grid spaces occupied by the token
   * @param {Token} token
   */
  static getOccupiedGridPoints(token) {
    const offsets = token.document.getOccupiedGridSpaceOffsets();
    const elevation = token.document.elevation;

    return offsets.map((offset) => {
      return {
        ...canvas.grid.getTopLeftPoint(offset),
        center: canvas.grid.getCenterPoint(offset),
        elevation,
      };
    });
  }

  static nearestPointToToken(point, token) {
    const shape = token.document.shape;
    const { width, height } = token.document.getSize();
    if (shape === CONST.TOKEN_SHAPES.ELLIPSE_1 || shape === CONST.TOKEN_SHAPES.ELLIPSE_2) {
      if (width === height) return this.nearestPointToCircle({ ...token.center, r: width / 2 }, point);
      else return this.nearestPointToEllipse({ ...token.center, h: width / 2, v: height / 2 }, point);
    } else {
      const { x, y } = token.document;
      return this.nearestPointToRectangle({ minX: x, minY: y, maxX: x + width, maxY: y + height }, point);
    }
  }

  /**
   * Find the nearest point on an ellipse given a point on the scene
   * @param {object} c {x, y, h, v}
   * @param {object} p {x, y}
   * @returns nearest point {x, y}
   */
  static nearestPointToEllipse(c, p) {
    // If p is the center of the ellipse, return any point on the ellipse boundary
    if (c.x === p.x && c.y === p.y) return { x: c.x + c.h, y: c.y };

    // Translate p to origin-relative coordinates
    let dx = p.x - c.x;
    let dy = p.y - c.y;

    // Scale vector by ellipse radii
    let scale = Math.sqrt((dx * dx) / (c.h * c.h) + (dy * dy) / (c.v * c.v));

    // If point is inside the ellipse, return it directly
    if (scale <= 1) return { x: p.x, y: p.y };

    // Scale down the vector to lie on the ellipse
    return {
      x: c.x + dx / scale,
      y: c.y + dy / scale,
    };
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
  static calculateDistance(originPoint, targetPoint, targetToken, { originToken } = {}) {
    // Delegate distance measurements to PF2e's `distanceTo` util
    if (game.system.id === 'pf2e' && targetToken && originToken) {
      return this._applyPrecision(originToken.distanceTo(targetToken));
    }

    const result = canvas.grid.measurePath([originPoint, targetPoint]);
    return this._applyPrecision(result.distance);
  }

  static _applyPrecision(distance) {
    let precision = 10 ** MODULE_CONFIG.measurement.precision;
    let number = parseFloat(
      (Math.round(distance * precision) / precision).toFixed(MODULE_CONFIG.measurement.precision)
    );
    return number + MODULE_CONFIG.distanceCalcOffset;
  }
}
