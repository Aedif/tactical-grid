import { MODULE_CONFIG } from '../applications/settings.js';

export const MODULE_ID = 'aedifs-tactical-grid';

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
    let squareWrap;

    if (isNewerVersion('11', game.version)) {
      squareWrap = libWrapper.register(
        MODULE_ID,
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
}

export function unregisterGridWrappers() {
  if (typeof libWrapper === 'function') {
    for (const wrp of registeredWrappers) {
      libWrapper.unregister(MODULE_ID, wrp, false);
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
  if (c.x === p.x && c.y === p.y) return { x: p.x, y: p.y };
  let vX = p.x - c.x;
  let vY = p.y - c.y;
  let magV = Math.sqrt(vX * vX + vY * vY);
  if (magV <= c.r) return { x: p.x, y: p.y };
  return { x: c.x + (vX / magV) * c.r, y: c.y + (vY / magV) * c.r };
}

// =======================================================
// Code Taken from MidiQOL and modified to not output logs
// =======================================================

const FULL_COVER = 999;
const THREE_QUARTERS_COVER = 5;
const HALF_COVER = 2;
export function computeCoverBonus(attacker, target) {
  let coverBonus = null;
  if (!attacker) return null;

  let calculator;
  if (MODULE_CONFIG.cover.calculator === 'midi-qol') {
    calculator = MidiQOL?.configSettings()?.optionalRules?.coverCalculation ?? 'none';
  } else {
    calculator = MODULE_CONFIG.cover.calculator;
  }

  switch (calculator) {
    case 'levelsautocover':
      if (
        !game.modules.get('levelsautocover')?.active ||
        !game.settings.get('levelsautocover', 'apiMode')
      )
        return null;

      const coverData = AutoCover.calculateCover(
        attacker.document ? attacker : attacker.object,
        target.document ? target : target.object
      );

      const coverDetail = AutoCover.getCoverData();
      if (coverData.rawCover === 0) coverBonus = FULL_COVER;
      else if (coverData.rawCover > coverDetail[1].percent) coverBonus = 0;
      else if (coverData.rawCover < coverDetail[0].percent) coverBonus = THREE_QUARTERS_COVER;
      else if (coverData.rawCover < coverDetail[1].percent) coverBonus = HALF_COVER;
      if (coverData.obstructingToken) coverBonus = Math.max(2, coverBonus);
      break;
    case 'simbuls-cover-calculator':
      if (!game.modules.get('simbuls-cover-calculator')?.active) return null;
      if (globalThis.CoverCalculator) {
        const coverData = globalThis.CoverCalculator.Cover(
          attacker.document ? attacker : attacker.object,
          target
        );
        if (attacker === target) {
          coverBonus = 0;
          break;
        }
        if (coverData?.data?.results.cover === 3) coverBonus = FULL_COVER;
        else coverBonus = -coverData?.data?.results.value ?? 0;
      }
      break;
    case 'tokenvisibility':
      if (!game.modules.get('tokenvisibility')?.active) return null;
      const coverValue = calcTokenVisibilityCover(attacker, target);
      switch (coverValue) {
        case 1:
          coverBonus = HALF_COVER;
          break;
        case 2:
          coverBonus = THREE_QUARTERS_COVER;
          break;
        case 3:
          coverBonus = FULL_COVER;
          break;
        case 0:
        default:
          coverBonus = 0;
      }
      break;
    case 'tokencover':
      {
        if (!game.modules.get('tokencover')?.active) return null;

        let coverCalc = attacker.tokenCover?.coverCalc;
        if (!coverCalc) {
          attacker.tokencover = {
            coverCalc: new (game.modules.get('tokencover').api.CoverCalculator)(attacker),
          };
          coverCalc = attacker.tokencover.coverCalc;
        }

        const coverValue = coverCalc.percentCover(target);
        if (coverValue < (game.settings.get('tokencover', 'cover-trigger-percent-low') ?? 0.5))
          coverBonus = 0;
        else if (
          coverValue < (game.settings.get('tokencover', 'cover-trigger-percent-medium') ?? 0.75)
        )
          coverBonus = HALF_COVER;
        else if (coverValue < (game.settings.get('tokencover', 'cover-trigger-percent-high') ?? 1))
          coverBonus = THREE_QUARTERS_COVER;
        else coverBonus = FULL_COVER;
      }
      break;
    case 'pf2e-perception':
      {
        if (!game.modules.get('pf2e-perception')?.active) return null;
        const coverValue = game.modules.get('pf2e-perception').api.token.getCover(attacker, target);
        switch (coverValue) {
          case undefined:
            coverBonus = 0;
            break;
          case 'lesser':
            coverBonus = HALF_COVER;
            break;
          case 'standard':
            coverBonus = THREE_QUARTERS_COVER;
            break;
          case 'greater':
            coverBonus = FULL_COVER;
            break;
          case 'greater-prone':
            coverBonus = FULL_COVER;
            break;
          default:
            coverBonus = 0;
        }
      }
      break;
    case 'none':
    default:
      coverBonus = null;
      break;
  }
  return coverBonus;
}

function calcTokenVisibilityCover(attacker, target) {
  const api = game.modules.get('tokenvisibility')?.api;
  const attackerToken = attacker;
  const targetToken = target;
  if (!api || !attackerToken || !targetToken) return null;

  const coverCalc = new api.CoverCalculator(attackerToken, targetToken);

  return coverCalc.targetCover();

  // const version = game.modules.get('tokenvisibility')?.version;
  // let coverValue;
  // if (isNewerVersion(version, '0.5.3')) {
  //   const cover = api.CoverCalculator.coverCalculations(attackerToken, [targetToken]);
  //   coverValue = cover.get(targetToken) ?? 0;
  // } else {
  //   const cover = api.CoverCalculator.coverCalculations([attackerToken], [targetToken]);
  //   coverValue = cover[attackerToken.id][targetToken.id] ?? 0;
  // }
  // return coverValue;
}

// ===================
// End of MidiQOL code
// ===================

export function tokenHasEffect(token, efName) {
  if (token.document.actorLink) {
    return actorHasEffect(token.actor, efName);
  } else {
    if (game.system.id === 'pf2e') {
      return (token.document.delta?.items || []).some(
        (item) => item.name === efName && _activePF2EItem(item)
      );
    } else {
      let has = (token.document.effects || []).some(
        (ef) => !ef.disabled && !ef.isSuppressed && ef.label === efName
      );
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
    return (actor.effects || []).some(
      (ef) => !ef.disabled && !ef.isSuppressed && ef.name === efName
    );
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
