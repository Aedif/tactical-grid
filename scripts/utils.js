import { MODULE_CONFIG } from '../applications/settings.js';

export const MODULE_ID = 'aedifs-tactical-grid';

// Because PF2e is a special snowflake
export function cleanLayerName(layer) {
  return layer.name.replace('PF2e', '');
}

export function getGridColorString() {
  let color = canvas.scene?.grid?.color ?? '#000000';
  if (color instanceof Color) color = color.toString();
  return color;
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
 * Applicable to v11 & v12
 * OVERRIDING SquareGrid and HexagonalGrid draw line functions
 * Contains original implementation of the functions with just the line width adjusted
 */
export function registerGridWrappers(lineWidth) {
  if (foundry.utils.isNewerVersion(game.version, 12)) return;
  unregisterGridWrappers();

  let squareWrap;

  if (isNewerVersion('11', game.version)) {
    squareWrap = libWrapper.register(
      MODULE_ID,
      'SquareGrid.prototype._drawLine',
      function (points, lineColor, lineAlpha) {
        let line = new PIXI.Graphics();
        line.lineStyle(lineWidth, lineColor, lineAlpha).moveTo(points[0], points[1]).lineTo(points[2], points[3]);
        return line;
      },
      'OVERRIDE'
    );
  } else {
    squareWrap = libWrapper.register(
      MODULE_ID,
      'SquareGrid.prototype.draw',
      function (options = {}) {
        Object.getPrototypeOf(SquareGrid).prototype.draw.call(this, options);
        // SquareGrid.prototype.draw.call(this, options);
        let { color, alpha, dimensions } = foundry.utils.mergeObject(this.options, options);

        // Set dimensions
        this.width = dimensions.width;
        this.height = dimensions.height;

        // Need to draw?
        if (alpha === 0) return this;

        // Vertical lines
        let nx = Math.floor(dimensions.width / dimensions.size);
        const grid = new PIXI.Graphics();
        for (let i = 1; i < nx; i++) {
          let x = i * dimensions.size;
          grid.lineStyle(lineWidth, color, alpha).moveTo(x, 0).lineTo(x, dimensions.height);
        }

        // Horizontal lines
        let ny = Math.ceil(dimensions.height / dimensions.size);
        for (let i = 1; i < ny; i++) {
          let y = i * dimensions.size;
          grid.lineStyle(lineWidth, color, alpha).moveTo(0, y).lineTo(dimensions.width, y);
        }
        this.addChild(grid);
        return this;
      },
      'OVERRIDE'
    );
  }

  let hexWrap = libWrapper.register(
    MODULE_ID,
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

export function unregisterGridWrappers() {
  for (const wrp of registeredWrappers) {
    libWrapper.unregister(MODULE_ID, wrp, false);
  }
  registeredWrappers = [];
}

// ===================
// End of MidiQOL code
// ===================

export function tokenHasEffect(token, efName) {
  if (token.document.actorLink) {
    return actorHasEffect(token.actor, efName);
  } else {
    if (game.system.id === 'pf2e') {
      return (token.document.delta?.items || []).some((item) => item.name === efName && _activePF2EItem(item));
    } else {
      let has = (token.document.effects || []).some((ef) => !ef.disabled && !ef.isSuppressed && ef.label === efName);
      if (has) return true;
      return actorHasEffect(token.actor, efName);
    }
  }
}

function actorHasEffect(actor, efName) {
  if (!actor) return false;

  if (game.system.id === 'pf2e') {
    return (actor.items || []).some((item) => item.name === efName && _activePF2EItem(item));
  } else {
    return (actor.effects || []).some((ef) => !ef.disabled && !ef.isSuppressed && ef.name === efName);
  }
}

const PF2E_ITEM_TYPES = ['condition', 'effect', 'weapon', 'equipment'];
function _activePF2EItem(item) {
  if (PF2E_ITEM_TYPES.includes(item.type)) {
    if ('active' in item) {
      return item.active;
    } else if ('isEquipped' in item) {
      return item.isEquipped;
    } else {
      return true;
    }
  }
  return false;
}
