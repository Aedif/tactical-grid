import { MODULE_CONFIG } from '../applications/settings.js';
import { getHexOffsets } from './measurer.js';

export class RangeHighlighter {
  constructor(token, distances, { borderColor, roundToken = false } = {}) {
    this.token = token;
    this.roundToken = roundToken;

    this.borderColor = borderColor ? new PIXI.Color(borderColor).toNumber() : null;
    this.fillColor = '#0000ff';
    if (distances instanceof Array) {
      this.distances = distances.sort((r1, r2) => r1.reach - r2.reach);
    } else {
      this.distances = [distances];
    }

    this.distances.map((d) => {
      if (d.color) d.color = new PIXI.Color(d.color).toNumber();
      if (d.lineColor) d.lineColor = new PIXI.Color(d.lineColor).toNumber();
      return d;
    });

    canvas.grid.addHighlightLayer(this.highlightId);
    this.token._tgReach = this;
    this.highlightGrid();
  }

  get highlightId() {
    return `RangeHighlighter.${this.token.document.id}`;
  }

  clear() {
    const grid = canvas.grid;
    const hl = grid.getHighlightLayer(this.highlightId);
    hl.clear();
  }

  highlightGrid() {
    // Clear the existing highlight layer
    const grid = canvas.grid;
    const hl = grid.getHighlightLayer(this.highlightId);

    //if (this.token._animation) return;

    hl.clear();

    // If we are in grid-less mode, highlight the shape directly
    if (grid.type === CONST.GRID_TYPES.GRIDLESS) {
      this.distances = this.distances.sort((r1, r2) => r2.reach - r1.reach);
      for (const r of this.distances) {
        let shape;

        if (this.roundToken) {
          shape = new PIXI.Ellipse(
            this.token.center.x,
            this.token.center.y,
            r.reach * canvas.dimensions.distancePixels + this.token.w / 2,
            r.reach * canvas.dimensions.distancePixels + this.token.h / 2
          );
        } else {
          const width = this.token.w + r.reach * 2 * canvas.dimensions.distancePixels;
          const height = this.token.h + r.reach * 2 * canvas.dimensions.distancePixels;

          shape = new PIXI.RoundedRectangle(
            this.token.center.x - width / 2,
            this.token.center.y - height / 2,
            width,
            height,
            r.reach * canvas.dimensions.distancePixels
          );
        }

        this._drawShape(hl, shape, r);
      }
    }

    // Otherwise, highlight specific grid positions
    else {
      this._highlightGridPositions(hl);
    }
  }

  _drawShape(hl, shape, { color, alpha = 0.1, lineColor, lineAlpha = 0.3, lineWidth = 2 } = {}) {
    if (!color && !lineColor) color = 0xffffff;

    if (Number.isFinite(color)) hl.beginFill(color, alpha);
    if (Number.isFinite(lineColor)) hl.lineStyle(lineWidth, lineColor, lineAlpha);

    hl.drawShape(shape).endFill();
  }

  _addLine(line, dIndex) {
    if (this.polyLines[dIndex].has(line)) {
      this.uniquePolyLines[dIndex].delete(line);
    } else {
      this.uniquePolyLines[dIndex].add(line);
    }
  }

  _highlightGridPositions(hl) {
    const grid = canvas.grid.grid;
    const d = canvas.dimensions;
    const { x, y } = this.token;
    const maxDistance = this.distances[this.distances.length - 1].reach;
    const distanceV =
      maxDistance + Math.max(0, (1 - this.token.document.height) * canvas.dimensions.distance);
    const distanceH =
      maxDistance + Math.max(0, (1 - this.token.document.width) * canvas.dimensions.distance);

    // Get number of rows and columns
    const [maxRow, maxCol] = grid.getGridPositionFromPixels(d.width, d.height);
    let nRows = Math.ceil((distanceH * 1.5) / d.distance / (d.size / grid.h));
    let nCols = Math.ceil((distanceV * 1.5) / d.distance / (d.size / grid.w));
    [nRows, nCols] = [Math.min(nRows, maxRow), Math.min(nCols, maxCol)];

    // Get the offset of the template origin relative to the top-left grid space
    const [tx, ty] = grid.getTopLeft(x, y);
    const [row0, col0] = grid.getGridPositionFromPixels(tx, ty);

    // Identify grid coordinates covered by the template Graphics
    const hRows = row0 + nRows + this.token.document.height;
    const hCols = col0 + nCols + this.token.document.width;

    const tokenPositions = this._getTokenGridPositions();
    const positions = constructGridArray(
      nRows * 2 + this.token.document.height,
      nCols * 2 + this.token.document.width
    );
    for (let r = row0 - nRows; r < hRows; r++) {
      for (let c = col0 - nCols; c < hCols; c++) {
        const [gx, gy] = grid.getPixelsFromGridPosition(r, c);

        let withinReach;
        for (let j = 0; j < this.distances.length; j++) {
          for (let i = 0; i < tokenPositions.length; i++) {
            let cd = canvas.grid.measureDistance(
              tokenPositions[i],
              { x: gx, y: gy },
              { gridSpaces: true }
            );

            if (cd <= this.distances[j].reach) {
              this._highlightGridPosition(hl, {
                x: gx,
                y: gy,
                ...this.distances[j],
              });
              withinReach = this.distances[j];
              break;
            }
          }
          if (withinReach) break;
        }
      }
    }

    return positions;
  }

  _highlightGridPosition(
    layer,
    {
      x,
      y,
      color,
      alpha = 0.1,
      shape,
      shrink = 0.8,
      lineColor,
      lineWidth = 2,
      lineAlpha = 0.3,
    } = {}
  ) {
    if (!layer.highlight(x, y)) return;

    if (canvas.grid.grid.getPolygon) {
      const offsetX = canvas.grid.w * (1.0 - shrink);
      const offsetY = canvas.grid.h * (1.0 - shrink);
      shape = new PIXI.Polygon(
        canvas.grid.grid.getPolygon(
          x + offsetX / 2,
          y + offsetY / 2,
          Math.ceil(canvas.grid.w) - offsetX,
          Math.ceil(canvas.grid.h) - offsetY
        )
      );
    } else {
      const s = canvas.dimensions.size;
      const offset = s * (1.0 - shrink);
      shape = new PIXI.Rectangle(x + offset / 2, y + offset / 2, s - offset, s - offset);
    }
    if (Number.isFinite(color)) layer.beginFill(color, alpha);
    if (Number.isFinite(lineColor)) layer.lineStyle(lineWidth, lineColor, lineAlpha);
    layer.drawShape(shape).endFill();
  }

  _getTokenGridPositions() {
    const positions = [];

    if (
      canvas.grid.type !== CONST.GRID_TYPES.SQUARE &&
      this.token.document.width == this.token.document.height
    ) {
      // Hexagonal Grid
      const offsets = getHexOffsets(this.token);
      if (offsets) {
        for (const offset of offsets) {
          const offsetX = this.token.w * offset[0];
          const offsetY = this.token.h * offset[1];
          positions.push({
            x: this.token.x + offsetX,
            y: this.token.y + offsetY,
          });
        }
      }
    }

    // Fallback on square if hex is not in use or token width does not match height
    if (!positions.length) {
      for (let h = 0; h < this.token.h / canvas.grid.size; h++) {
        for (let w = 0; w < this.token.w / canvas.grid.size; w++) {
          const offsetY = canvas.grid.size * h;
          const offsetX = canvas.grid.size * w;
          positions.push({
            x: this.token.x + offsetX,
            y: this.token.y + offsetY,
          });
        }
      }
    }
    return positions;
  }
}

// recursive exploration using `shiftPosition`
function constructGridArray(nRows, nCols) {
  const grid = new Array(nCols);
  for (let i = 0; i < nCols; i++) {
    grid[i] = new Array(nRows);
  }
  return grid;
}

export function registerRangeHighlightHooks() {
  // Refresh highlights
  Hooks.on('refreshToken', (token) => {
    if (token._tgReach) {
      token._tgReach.highlightGrid();
    } else if (token._original?._tgReach) {
      // borrow original tokens RangeHighlighter
      token._tgReach = token._original._tgReach;
      token._tgReach.token = token;
      token._tgReach.highlightGrid();
    }
  });

  // Remove highlights
  Hooks.on('destroyToken', (token) => {
    // Return RangeHighlighter to the original token on drag-end
    if (token._tgReach && token._original) {
      token._tgReach.token = token._original;
      token._original._tgReach.highlightGrid();
    }
  });

  // Item Reach Highlighting
  let reachCalculator;
  switch (game.system.id) {
    case 'dnd5e':
      reachCalculator = Dnd5eReach;
      break;
    case 'pf2e':
      reachCalculator = Pf2eReach;
      break;
    default:
      reachCalculator = SystemReach;
  }

  Hooks.on('hoverToken', (token, hoverIn) => {
    if (!MODULE_CONFIG.range.token.enabled) return;
    if (MODULE_CONFIG.range.token.combatOnly && !game.combat?.started) return;
    if (hoverIn && token.actor) {
      RangeHighlightAPI.rangeHighlight(token, reachCalculator.getTokenRange(token));
    } else {
      RangeHighlightAPI.clearRangeHighlight(token);
    }
  });

  const selectors = {
    itemHover: '.item-name',
    item: '.item',
    itemId: 'data-item-id',
  };

  Hooks.on('renderActorSheet', (sheet, form, options) => {
    if (!MODULE_CONFIG.range.item.enabled) return;
    if (MODULE_CONFIG.range.item.combatOnly && !game.combat?.started) return;

    const actor = sheet.object;

    $(form)
      .find(selectors.itemHover)
      .on('mouseenter', (event) => {
        const token = sheet.token?.object;
        if (!token) return;

        const itemId = $(event.target).closest(`[${selectors.itemId}]`).attr(selectors.itemId);
        const item = actor.items.get(itemId);

        if (!item) {
          TacticalGrid.clearRangeHighlight(token);
          return;
        }

        const distances = reachCalculator.getItemRange(item, token);
        RangeHighlightAPI.rangeHighlight(token, distances);
      })
      .on('mouseleave', (event) => {
        const token = sheet.token?.object;
        if (token) TacticalGrid.clearRangeHighlight(token);
      });
  });
}

class SystemReach {
  static getTokenRange(token) {
    return [5];
  }

  static getItemRange(item, token) {
    return [];
  }
}

class Dnd5eReach extends SystemReach {
  static getTokenRange(token) {
    const actor = token.actor;
    const reaches = new Set([5]);

    actor.items
      .filter(
        (item) =>
          item.system.equipped &&
          item.system.actionType === 'mwak' &&
          ['martialM', 'simpleM', 'natural', 'improv'].includes(item.system.weaponType)
      )
      .forEach((item) => {
        const distances = this.getItemRange(item, token).sort();
        distances.forEach((d) => reaches.add(d));
      });

    return Array.from(reaches);
  }

  static getItemRange(item, token) {
    const distances = [];

    if (item.system.range) {
      let range = item.system.range.value || 0;
      let longRange = item.system.range.long || 0;
      const actor = token.actor;

      if (foundry.utils.getProperty(actor, 'flags.midi-qol.sharpShooter') && range < longRange)
        range = longRange;
      if (
        item.system.actionType === 'rsak' &&
        foundry.utils.getProperty(actor, 'flags.dnd5e.spellSniper')
      ) {
        range = 2 * range;
        longRange = 2 * longRange;
      }

      if (item.system.range.units === 'touch') {
        range = 5;
        longRange = 0;
        if (item.system.properties?.rch) range *= 2;
      }

      if (['mwak', 'msak', 'mpak'].includes(item.system.actionType) && !item.system.properties?.thr)
        longRange = 0;

      if (range) distances.push(range);
      if (longRange) distances.push(longRange);
    }

    return distances;
  }
}

class Pf2eReach extends SystemReach {
  static getItemRange(item) {
    const distances = [];

    let range = item.range?.increment;
    let longRange = item.range?.max;

    let rangeVal = item.system.range?.value;
    if (rangeVal) {
      rangeVal = parseInt(rangeVal);
      if (Number.isFinite(rangeVal)) range = rangeVal;
    }

    if (range) distances.push(range);
    if (longRange) distances.push(longRange);

    return distances;
  }
}

export class RangeHighlightAPI {
  /**
   * Draws a highlight around the provided token using the provided distances
   * @param {Token} token
   * @param {Array[Number]|Array[Object]|null} distances
   * @param {Object} options
   * @returns
   */
  static rangeHighlight(token, distances, options) {
    if (!distances) {
      let reachCalculator;
      switch (game.system.id) {
        case 'dnd5e':
          reachCalculator = Dnd5eReach;
          break;
        case 'pf2e':
          reachCalculator = Pf2eReach;
          break;
        default:
          reachCalculator = SystemReach;
      }

      distances = reachCalculator.getTokenRange(token);
    }

    if (distances.length === 0) {
      RangeHighlightAPI.clearRangeHighlight(token);
      return;
    }

    if (Number.isFinite(distances[0])) {
      const colors = MODULE_CONFIG.range.colors;
      distances = distances
        .sort((a, b) => a - b)
        .map((d, i) => {
          return {
            reach: d,
            ...(i < colors.length ? colors[i] : MODULE_CONFIG.range.defaultColor),
          };
        });
    }

    new RangeHighlighter(token, distances, options);
  }

  /**
   * Clears highlights applied using TacticalGrid.rangeHighlight(...)
   * @param {Token} token token to remove the highlights from
   */
  static clearRangeHighlight(token) {
    if (token._tgReach) {
      token._tgReach.clear();
      token._tgReach = null;
    }
  }
}
