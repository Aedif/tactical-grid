import { MODULE_CONFIG } from '../applications/settings.js';

// Because PF2e is a special snowflake
export function cleanLayerName(layer) {
  return layer.name.replace('PF2e', '');
}

export function getGridColorString() {
  return canvas.scene?.grid?.color ?? '#000000';
}

export function getDispositionColor(token) {
  const colors = MODULE_CONFIG.dispositionColors;
  let d = parseInt(token.document.disposition);
  if (token.actor?.hasPlayerOwner) return colors.playerOwner;
  else if (d === CONST.TOKEN_DISPOSITIONS.FRIENDLY) return colors.friendly;
  else if (d === CONST.TOKEN_DISPOSITIONS.NEUTRAL) return colors.neutral;
  else return colors.hostile;
}

let registeredWrappers = [];

/**
 * OVERRIDING SquareGrid and HexagonalGrid draw line functions
 * Contains original implementation of the functions with just the line width adjusted
 */
export function registerGridWrappers(lineWidth) {
  unregisterGridWrappers();
  if (typeof libWrapper === 'function') {
    let squareWrap = libWrapper.register(
      'aedifs-tactical-grid',
      'SquareGrid.prototype._drawLine',
      function (points, lineColor, lineAlpha) {
        let line = new PIXI.Graphics();
        line
          .lineStyle(lineWidth, lineColor, lineAlpha)
          .moveTo(points[0], points[1])
          .lineTo(points[2], points[3]);
        return line;
      },
      'OVERRIDE'
    );

    let hexWrap = libWrapper.register(
      'aedifs-tactical-grid',
      'HexagonalGrid.prototype._drawGrid',
      function ({ color = null, alpha = null } = {}) {
        color = color ?? this.options.color;
        alpha = alpha ?? this.options.alpha;
        const columnar = this.columnar;
        const ncols = Math.ceil(canvas.dimensions.width / this.w);
        const nrows = Math.ceil(canvas.dimensions.height / this.h);

        // Draw Grid graphic
        const grid = new PIXI.Graphics();
        grid.lineStyle({ width: lineWidth, color, alpha });

        // Draw hex rows
        if (columnar) this._drawColumns(grid, nrows, ncols);
        else this._drawRows(grid, nrows, ncols);
        return grid;
      },
      'OVERRIDE'
    );

    registeredWrappers.push(squareWrap);
    registeredWrappers.push(hexWrap);
  }
}

export function unregisterGridWrappers() {
  if (typeof libWrapper === 'function') {
    for (const wrp of registeredWrappers) {
      libWrapper.unregister('aedifs-tactical-grid', wrp, false);
    }
    registeredWrappers = [];
  }
}

/**
 * Find the nearest point on a rectangle given a point on the scene
 * @param {*} rect {minX, maxX, minY, maxY}
 * @param {*} p {x, y}
 * @returns nearest point {x, y}
 */
export function nearestPointToRectangle(rect, p) {
  const nearest = { x: p.x, y: p.y };
  if (p.x < rect.minX) nearest.x = rect.minX;
  else if (p.x > rect.maxX) nearest.x = rect.maxX;

  if (p.y < rect.minY) nearest.y = rect.minY;
  else if (p.y > rect.maxY) nearest.y = rect.maxY;
  return nearest;
}

/**
 * Find the nearest point on a circle given a point on the scene
 * @param {*} c {x, y, r}
 * @param {*} p {x, y}
 * @returns nearest point {x, y}
 */
export function nearestPointToCircle(c, p) {
  // If c === p, return any edge
  if (c.x === p.x && c.y === p.y) return p;
  let vX = p.x - c.x;
  let vY = p.y - c.y;
  let magV = Math.sqrt(vX * vX + vY * vY);
  return { x: c.x + (vX / magV) * c.r, y: c.y + (vY / magV) * c.r };
}
