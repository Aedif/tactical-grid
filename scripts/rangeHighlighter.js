import { MODULE_CONFIG } from '../applications/settings.js';
import { getHexOffsets } from './measurer.js';
import {
  getRangeCalculator,
  registerActorSheetHooks,
  registerExternalModuleHooks,
} from './rangeExtSupport.js';

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
    this.highlight();
  }

  get highlightId() {
    return `RangeHighlighter.${this.token.document.id}`;
  }

  clear() {
    const grid = canvas.grid;
    const hl = grid.getHighlightLayer(this.highlightId);
    hl.clear();
    clearTimeout(this._timer);
  }

  highlight() {
    const now = new Date().getTime();

    if (
      canvas.grid.type !== CONST.GRID_TYPES.GRIDLESS &&
      this._timeSinceLastHighlight &&
      now - this._timeSinceLastHighlight < 150
    ) {
      clearTimeout(this._timer);
      this._timer = setTimeout(this._highlightGrid.bind(this), 150);
    } else {
      this._highlightGrid();
    }
  }

  _highlightGrid() {
    this._timeSinceLastHighlight = new Date().getTime();

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
    let { x, y } = grid.getSnappedPosition(
      this.token.x,
      this.token.y,
      canvas.tokens.gridPrecision,
      { token: this.token }
    );

    const maxDistance = this.ranges[this.ranges.length - 1].range;

    const tokenHeight = Math.ceil(this.token.document.height);
    const tokenWidth = Math.ceil(this.token.document.width);

    const distanceV = maxDistance + Math.max(0, (1 - tokenHeight) * canvas.dimensions.distance);
    const distanceH = maxDistance + Math.max(0, (1 - tokenWidth) * canvas.dimensions.distance);

    // Get number of rows and columns
    const [maxRow, maxCol] = grid.getGridPositionFromPixels(d.width, d.height);
    let nRows = Math.ceil((distanceH * 1.5) / d.distance / (d.size / grid.h));
    let nCols = Math.ceil((distanceV * 1.5) / d.distance / (d.size / grid.w));
    [nRows, nCols] = [Math.min(nRows, maxRow), Math.min(nCols, maxCol)];

    // Get the offset of the template origin relative to the top-left grid space
    const [row0, col0] = grid.getGridPositionFromPixels(x, y);

    // Identify grid coordinates roughly covered by anticipated max range
    const hRows = row0 + nRows + tokenHeight;
    const hCols = col0 + nCols + tokenWidth;

    const tokenPositions = this._getTokenGridPositions(x, y);
    for (let r = row0 - nRows; r < hRows; r++) {
      for (let c = col0 - nCols; c < hCols; c++) {
        const [x, y] = grid.getPixelsFromGridPosition(r, c);

        let withinRange;
        for (let j = 0; j < this.ranges.length; j++) {
          for (let i = 0; i < tokenPositions.length; i++) {
            let cd = canvas.grid.measureDistance(tokenPositions[i], { x, y }, { gridSpaces: true });

            if (cd <= this.ranges[j].range) {
              this._highlightGridPosition(hl, x, y, this.ranges[j]);
              withinRange = this.ranges[j];
              break;
            }
          }
          if (withinRange) break;
        }
      }
    }
  }

  _highlightGridPosition(
    layer,
    x,
    y,
    { color, alpha = 0.1, shape, shrink = 0.8, lineColor, lineWidth = 2, lineAlpha = 0.3 } = {}
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

  _getTokenGridPositions(tx, ty) {
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
            x: tx + offsetX,
            y: ty + offsetY,
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

          //let [x, y] = canvas.grid.grid.getTopLeft(tx + offsetX, ty + offsetY);
          positions.push({ x: tx + offsetX, y: ty + offsetY });
        }
      }
    }
    return positions;
  }
}

export function registerRangeHighlightHooks() {
  // Refresh highlights
  Hooks.on('refreshToken', (token) => {
    if (token._tgRange) {
      token._tgRange.highlight();
    } else if (token._original?._tgRange) {
      // borrow original tokens RangeHighlighter
      token._tgRange = token._original._tgRange;
      token._tgRange.token = token;
      token._tgRange.highlight();
    }
  });

  // Remove highlights
  Hooks.on('destroyToken', (token) => {
    // Return RangeHighlighter to the original token on drag-end
    if (token._tgRange && token._original) {
      token._tgRange.token = token._original;
      token._original._tgRange.highlight();
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

  registerActorSheetHooks();
  registerExternalModuleHooks();
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
      const rangeCalculator = getRangeCalculator();
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
   * Parses Item uuid and attempts to highlight ranges for any associated tokens
   * @param {String} uuid            Item uuid
   * @param {Object} opts.roundToken If `true` tokens will be treated as a circles instead of a rectangles on gridless scenes
   */
  static async rangeHighlightItemUuid(uuid, { roundToken = MODULE_CONFIG.range.roundToken } = {}) {
    const { tokens, item } = await _tokensAndItemFromItemUuid(uuid);
    tokens?.forEach((t) => this.rangeHighlight(t, { item, roundToken }));
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

  /**
   * Parses Item uuid and attempts to clear range highlights on any associated tokens
   * @param {*} uuid
   */
  static async clearRangeHighlightItemUuid(uuid) {
    const { tokens } = await _tokensAndItemFromItemUuid(uuid);
    tokens?.forEach((t) => this.clearRangeHighlight(t));
  }
}

async function _tokensAndItemFromItemUuid(uuid) {
  const item = await fromUuid(uuid);
  if (!item) return {};
  const embedded = parseUuid(uuid).embedded;
  const tokenId = embedded[embedded.findIndex((t) => t === 'Token') + 1];
  const token = canvas.tokens.get(tokenId);

  let tokens;
  if (token) tokens = [token];
  else tokens = item.actor?.getActiveTokens(true) || [];

  return { tokens, item };
}

export function itemRangeHighlightEnabled() {
  if (!MODULE_CONFIG.range.item.enabled) return false;
  if (MODULE_CONFIG.range.item.combatOnly && !game.combat?.started) return false;
  return true;
}
