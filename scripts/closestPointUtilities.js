/**
 * Utilities to help find the closest points between tokens and points on the scene.
 */
export class ClosestPointUtilities {
  /**
   * Return a shape name for the given token
   * @param {Token} token
   * @returns
   */
  static isShape(token) {
    const shape = token.document.shape;
    if (shape === CONST.TOKEN_SHAPES.ELLIPSE_1 || shape === CONST.TOKEN_SHAPES.ELLIPSE_2) {
      if (token.document.height === token.document.width) return 'circle';
      else return 'ellipse';
    }
    return 'rectangle';
  }

  /**
   * Process token bounds into an appropriate shape
   * @param {String} name
   * @param {PIXI.Rectangle} bounds
   * @returns
   */
  static shapeFromBounds(name, bounds) {
    if (name === 'rectangle') return bounds;
    else if (name === 'circle')
      return {
        x: bounds.x + bounds.width / 2,
        y: bounds.y + bounds.height / 2,
        r: bounds.width / 2,
      };
    return {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2,
      rx: bounds.width / 2,
      ry: bounds.height / 2,
    };
  }

  /**
   * Utility to perform a result swap. Required for tokens of different shapes
   * @param {object} result
   * @returns
   */
  static swapResult(result) {
    return {
      pointA: result.pointB,
      pointB: result.pointA,
    };
  }

  /**
   * Closest point from point to token
   * @param {{x, y}} point
   * @param {Token} token
   * @returns
   */
  static pointToToken(point, token) {
    if (canvas.grid.type !== CONST.GRID_TYPES.GRIDLESS) {
      return this.pointToTokenGrid(point, token);
    }

    const name = this.isShape(token);
    const shape = this.shapeFromBounds(name, token.bounds);

    switch (name) {
      case 'rectangle':
        return this.pointToRectangle(point, shape);
      case 'circle':
        return this.pointToCircle(point, shape);
      case 'ellipse':
        return this.pointToEllipse(point, shape);
    }
  }

  static pointToTokenGrid(point, token) {
    return this.closestGridPoint(point, this.occupiedGridPoints(token));
  }

  /**
   * Calculates 2 closest points between tokens
   * @param {Token} tokenA
   * @param {Token} tokenB
   * @returns {{pointA: {x, y}, pointB: {x,y}}}
   */
  static tokenToToken(tokenA, tokenB) {
    if (canvas.grid.type !== CONST.GRID_TYPES.GRIDLESS) {
      return this.tokenToTokenGrid(tokenA, tokenB);
    }

    const aName = this.isShape(tokenA);
    const bName = this.isShape(tokenB);
    const aShape = this.shapeFromBounds(aName, tokenA.bounds);
    const bShape = this.shapeFromBounds(bName, tokenB.bounds);

    // Keep order consistent for asymmetric functions
    const pairKey = [aName, bName].sort().join('-');

    switch (pairKey) {
      case 'rectangle-rectangle':
        return this.rectangleToRectangle(aShape, bShape);

      case 'circle-circle':
        return this.circleToCircle(aShape, bShape);

      case 'circle-rectangle':
        return aName === 'rectangle'
          ? this.rectangleToCircle(aShape, bShape)
          : this.swapResult(this.rectangleToCircle(bShape, aShape));

      case 'circle-ellipse':
        return aName === 'circle'
          ? this.circleToEllipse(aShape, bShape)
          : this.swapResult(this.circleToEllipse(bShape, aShape));

      case 'ellipse-rectangle':
        return aName === 'rectangle'
          ? this.rectangleToEllipse(aShape, bShape)
          : this.swapResult(this.rectangleToEllipse(bShape, aShape));

      case 'ellipse-ellipse':
        return this.ellipseToEllipse(aShape, bShape);

      default:
        throw new Error(`Unsupported token shape pair: ${aName}, ${bName}`);
    }
  }

  // --- Grid Points ---

  static tokenToTokenGrid(tokenA, tokenB) {
    const closestPoint = this.rectangleToRectangle(tokenA.bounds, tokenB.bounds).pointA;

    const pointA = this.closestGridPoint(closestPoint, this.occupiedGridPoints(tokenA));
    const pointB = this.closestGridPoint(pointA, this.occupiedGridPoints(tokenB));

    return { pointA, pointB };
  }

  static closestGridPoint(point, gridPoints, elevation) {
    let closest = gridPoints[0];
    let cDistance = this.squaredEuclidean(closest, point);
    for (let i = 1; i < gridPoints.length; i++) {
      const d = this.squaredEuclidean(gridPoints[i], point);
      if (d < cDistance) {
        closest = gridPoints[i];
        cDistance = d;
      }
    }

    return { ...closest, elevation };
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
   * Returns coordinates of grid spaces occupied by the token
   * @param {Token} token
   */
  static occupiedGridPoints(token) {
    const offsets = token.document.getOccupiedGridSpaceOffsets();
    return offsets.map((offset) => canvas.grid.getTopLeftPoint(offset));
  }

  // --- Point to Shapes ---

  static pointToRectangle(point, rect) {
    return {
      x: Math.clamp(point.x, rect.x, rect.x + rect.width),
      y: Math.clamp(point.y, rect.y, rect.y + rect.height),
    };
  }

  static pointToCircle(point, circle) {
    if (circle.x === point.x && circle.y === point.y) return { x: point.x, y: point.y };
    let vX = point.x - circle.x;
    let vY = point.y - circle.y;
    let magV = Math.sqrt(vX * vX + vY * vY);
    if (magV <= circle.r) return { x: point.x, y: point.y };
    return { x: circle.x + (vX / magV) * circle.r, y: circle.y + (vY / magV) * circle.r };
  }

  static pointToEllipse(point, c) {
    const dx = point.x - c.x;
    const dy = point.y - c.y;
    const scale = Math.sqrt((dx * dx) / (c.rx * c.rx) + (dy * dy) / (c.ry * c.ry));

    if (scale <= 1) return { x: point.x, y: point.y };

    return {
      x: c.x + dx / scale,
      y: c.y + dy / scale,
    };
  }

  // --- Shape to Shape ---

  static rectangleToRectangle(rectA, rectB) {
    const ax = Math.clamp(rectB.x, rectA.x, rectA.x + rectA.width);
    const ay = Math.clamp(rectB.y, rectA.y, rectA.y + rectA.height);
    const bx = Math.clamp(rectA.x, rectB.x, rectB.x + rectB.width);
    const by = Math.clamp(rectA.y, rectB.y, rectB.y + rectB.height);
    return {
      pointA: { x: ax, y: ay },
      pointB: { x: bx, y: by },
    };
  }

  static rectangleToCircle(rect, circle) {
    const closestRect = this.pointToRectangle({ x: circle.x, y: circle.y }, rect);
    return { pointA: closestRect, pointB: this.pointToCircle(closestRect, circle) };
  }

  static rectangleToEllipse(rect, ellipse) {
    const closestRect = this.pointToRectangle({ x: ellipse.x, y: ellipse.y }, rect);
    return { pointA: closestRect, pointB: this.pointToEllipse(closestRect, ellipse) };
  }

  static circleToCircle(c1, c2) {
    const dx = c2.x - c1.x;
    const dy = c2.y - c1.y;
    const dist = Math.hypot(dx, dy);
    const ux = dx / dist;
    const uy = dy / dist;
    return {
      pointA: { x: c1.x + ux * c1.r, y: c1.y + uy * c1.r },
      pointB: { x: c2.x - ux * c2.r, y: c2.y - uy * c2.r },
    };
  }

  static circleToEllipse(circle, ellipse) {
    const dirX = ellipse.x - circle.x;
    const dirY = ellipse.y - circle.y;
    const mag = Math.hypot(dirX, dirY);
    const ux = dirX / mag;
    const uy = dirY / mag;
    const pointOnCircle = { x: circle.x + ux * circle.r, y: circle.y + uy * circle.r };
    return { pointA: pointOnCircle, pointB: this.pointToEllipse(pointOnCircle, ellipse) };
  }

  static ellipseToEllipse(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;

    const normA = (dx * dx) / (a.rx * a.rx) + (dy * dy) / (a.ry * a.ry);
    const normB = (dx * dx) / (b.rx * b.rx) + (dy * dy) / (b.ry * b.ry);

    // Overlapping or one inside the other
    if (normA <= 1 || normB <= 1) {
      const sharedPoint = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      return {
        pointA: sharedPoint,
        pointB: sharedPoint,
      };
    }

    const mag = Math.hypot(dx, dy);

    const ux = dx / mag;
    const uy = dy / mag;

    return {
      pointA: this.pointToEllipse({ x: a.x + ux * a.rx, y: a.y + uy * a.ry }, a),
      pointB: this.pointToEllipse({ x: b.x - ux * b.rx, y: b.y - uy * b.ry }, b),
    };
  }
}
