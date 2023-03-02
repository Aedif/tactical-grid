import { MODULE_CONFIG } from './settings.js';

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
