import { MODULE_CONFIG } from '../applications/settings.js';
import { getHexOffsets } from './measurer.js';

class RangeHighlighter {
  constructor(token, ranges, { roundToken = false } = {}) {
    this.token = token;
    this.roundToken = roundToken;

    if (ranges instanceof Array) {
      this.ranges = ranges.sort((r1, r2) => r1.range - r2.range);
    } else {
      this.ranges = [ranges];
    }

    this.ranges.map((d) => {
      if (d.color) d.color = new PIXI.Color(d.color).toNumber();
      if (d.lineColor) d.lineColor = new PIXI.Color(d.lineColor).toNumber();
      return d;
    });

    canvas.grid.addHighlightLayer(this.highlightId);
    this.token._tgRange = this;
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
      this.ranges = this.ranges.sort((r1, r2) => r2.range - r1.range);
      for (const r of this.ranges) {
        let shape;

        if (this.roundToken) {
          shape = new PIXI.Ellipse(
            this.token.center.x,
            this.token.center.y,
            r.range * canvas.dimensions.distancePixels + this.token.w / 2,
            r.range * canvas.dimensions.distancePixels + this.token.h / 2
          );
        } else {
          const width = this.token.w + r.range * 2 * canvas.dimensions.distancePixels;
          const height = this.token.h + r.range * 2 * canvas.dimensions.distancePixels;

          shape = new PIXI.RoundedRectangle(
            this.token.center.x - width / 2,
            this.token.center.y - height / 2,
            width,
            height,
            r.range * canvas.dimensions.distancePixels
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
    const maxDistance = this.ranges[this.ranges.length - 1].range;
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

        let withinRange;
        for (let j = 0; j < this.ranges.length; j++) {
          for (let i = 0; i < tokenPositions.length; i++) {
            let cd = canvas.grid.measureDistance(
              tokenPositions[i],
              { x: gx, y: gy },
              { gridSpaces: true }
            );

            if (cd <= this.ranges[j].range) {
              this._highlightGridPosition(hl, {
                x: gx,
                y: gy,
                ...this.ranges[j],
              });
              withinRange = this.ranges[j];
              break;
            }
          }
          if (withinRange) break;
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
  nRows = Math.floor(nRows);
  nCols = Math.floor(nCols);
  const grid = new Array(nCols);
  for (let i = 0; i < nCols; i++) {
    grid[i] = new Array(nRows);
  }
  return grid;
}

export function registerRangeHighlightHooks() {
  // Refresh highlights
  Hooks.on('refreshToken', (token) => {
    if (token._tgRange) {
      token._tgRange.highlightGrid();
    } else if (token._original?._tgRange) {
      // borrow original tokens RangeHighlighter
      token._tgRange = token._original._tgRange;
      token._tgRange.token = token;
      token._tgRange.highlightGrid();
    }
  });

  // Remove highlights
  Hooks.on('destroyToken', (token) => {
    // Return RangeHighlighter to the original token on drag-end
    if (token._tgRange && token._original) {
      token._tgRange.token = token._original;
      token._original._tgRange.highlightGrid();
    } else if (token._tgRange) {
      RangeHighlightAPI.clearRangeHighlight(token);
    }
  });

  Hooks.on('hoverToken', (token, hoverIn) => {
    if (!MODULE_CONFIG.range.token.enabled) return;
    if (MODULE_CONFIG.range.token.combatOnly && !game.combat?.started) return;
    if (hoverIn && token.actor) {
      RangeHighlightAPI.rangeHighlight(token);
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

        RangeHighlightAPI.rangeHighlight(token, { item });
      })
      .on('mouseleave', (event) => {
        const token = sheet.token?.object;
        if (token) TacticalGrid.clearRangeHighlight(token);
      });
  });
}

export class RangeHighlightAPI {
  /**
   * Highlights ranges around the token using either the supplied range values or automatically calculated system specific ranges if only a token or a token and an item are provided.
   * @param {Token} token                                  Token to highlight the ranges around
   * @param {Array[Number]|Array[Object]|null} opts.ranges Array of ranges as numerical values or objects defining the range and look of the highlight
   *                                                        e.g. [5, 30, 60]
   *                                                        e.g. [ {range: 30, color: '#00ff00', alpha: 0.1, lineColor: '#00ff00', lineWidth: 2, lineAlpha: 0.4, shrink: 0.8, }]
   * @param {Item} opts.item                               Item to be evaluated by the system specific range calculator to determine `ranges` automatically
   * @param {Boolean} opts.roundToken                      If `true` the token will be treated as a circle instead of a rectangle on gridless scenes
   * @returns {null}
   */
  static rangeHighlight(token, { ranges, roundToken = MODULE_CONFIG.range.roundToken, item } = {}) {
    if (!ranges) {
      let rangeCalculator;
      switch (game.system.id) {
        case 'dnd5e':
          rangeCalculator = Dnd5eRange;
          break;
        case 'pf2e':
          rangeCalculator = Pf2eRange;
          break;
        default:
          rangeCalculator = SystemRange;
      }

      if (item) ranges = rangeCalculator.getItemRange(item, token);
      else ranges = rangeCalculator.getTokenRange(token);
    }

    if (ranges.length === 0) {
      RangeHighlightAPI.clearRangeHighlight(token);
      return;
    }

    if (Number.isFinite(ranges[0])) {
      const colors = MODULE_CONFIG.range.colors;
      ranges = ranges
        .sort((a, b) => a - b)
        .map((d, i) => {
          return {
            range: d,
            ...(i < colors.length ? colors[i] : MODULE_CONFIG.range.defaultColor),
          };
        });
    }

    new RangeHighlighter(token, ranges, { roundToken });
  }

  /**
   * Clears highlights applied using TacticalGrid.rangeHighlight(...)
   * @param {Token} token Token to remove the highlights from
   */
  static clearRangeHighlight(token) {
    if (token._tgRange) {
      token._tgRange.clear();
      token._tgRange = null;
    }
  }
}

class SystemRange {
  static getTokenRange(token) {
    return [5];
  }

  static getItemRange(item, token) {
    return [];
  }
}

class Dnd5eRange extends SystemRange {
  static getTokenRange(token) {
    const actor = token.actor;
    const allRanges = new Set([5]);

    actor.items
      .filter(
        (item) =>
          item.system.equipped &&
          item.system.actionType === 'mwak' &&
          ['martialM', 'simpleM', 'natural', 'improv'].includes(item.system.weaponType)
      )
      .forEach((item) => {
        const ranges = this.getItemRange(item, token).sort();
        ranges.forEach((d) => allRanges.add(d));
      });

    return Array.from(allRanges);
  }

  static getItemRange(item, token) {
    const ranges = [];

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

      if (range) ranges.push(range);
      if (longRange) ranges.push(longRange);
    }

    return ranges;
  }
}

class Pf2eRange extends SystemRange {
  static getItemRange(item) {
    const ranges = [];

    let range = item.range?.increment;
    let longRange = item.range?.max;

    let rangeVal = item.system.range?.value;
    if (rangeVal) {
      rangeVal = parseInt(rangeVal);
      if (Number.isFinite(rangeVal)) range = rangeVal;
    }

    if (range) ranges.push(range);
    if (longRange) ranges.push(longRange);

    return ranges;
  }
}
