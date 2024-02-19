import { MODULE_CLIENT_CONFIG, MODULE_CONFIG } from '../applications/settings.js';
import { DistanceMeasurer, getHexOffsets } from './measurer.js';
import {
  getRangeCalculator,
  registerActorSheetHooks,
  registerExternalModuleHooks,
} from './rangeExtSupport.js';
import { MODULE_ID } from './utils.js';

class RangeHighlighter {
  constructor(token, ranges, { roundToken = false } = {}) {
    this.token = token;
    this.roundToken = roundToken;

    if (ranges instanceof Array) this.ranges = ranges;
    else this.ranges = [ranges];

    this.ranges.map((d) => {
      if (d.color) d.color = new PIXI.Color(d.color).toNumber();
      if (d.lineColor) d.lineColor = new PIXI.Color(d.lineColor).toNumber();
      return d;
    });

    if (this.token._tgRange) {
      this._transferRanges(this.token._tgRange);
    }
    this.token._tgRange = this;
    this.ranges = ranges.sort((r1, r2) => r1.range - r2.range);

    canvas.grid.addHighlightLayer(this.highlightId);
    this.highlight();
  }

  _transferRanges(rh) {
    for (const range of rh.ranges) {
      if (range.id) {
        const r = this.ranges.find((r) => r.id === range.id);
        if (!r) this.ranges.push(range);
      }
    }

    rh.clear();
  }

  get highlightId() {
    return `RangeHighlighter.${this.token.document.id}`;
  }

  clear() {
    const hl = canvas.grid.getHighlightLayer(this.highlightId);
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

    if (!hl._tgCustomVisibility) {
      const token = this.token;
      Object.defineProperty(hl, 'visible', {
        get: function () {
          return token.visible;
        },
        set: function () {},
      });
      hl._tgCustomVisibility = true;
    }

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

    // Get the offset of the token origin relative to the top-left grid space
    let [row0, col0] = grid.getGridPositionFromPixels(x, y);

    // Identify grid coordinates roughly covered by anticipated max range
    const hRows = row0 + nRows + tokenHeight;
    const hCols = col0 + nCols + tokenWidth;

    const tokenPositions = this._getTokenGridPositions(x, y);

    if (canvas.grid.type === CONST.GRID_TYPES.SQUARE) {
      const gs = canvas.grid.size;
      row0 = row0 + Math.floor(this.token.document.height / 2);
      col0 = col0 + Math.floor(this.token.document.width / 2);

      const wEven = this.token.document.width % 2 === 0 ? 1 : 0;
      const hEven = this.token.document.height % 2 === 0 ? 1 : 0;

      for (let r = row0; r < hRows; r++) {
        for (let c = col0; c < hCols; c++) {
          const pos = { x: c * gs, y: r * gs };

          let withinRange;
          for (let j = 0; j < this.ranges.length; j++) {
            const range = this.ranges[j];
            const measureDistance =
              range.measureDistance ?? canvas.grid.measureDistance.bind(canvas.grid);
            for (let i = 0; i < tokenPositions.length; i++) {
              let cd = measureDistance(tokenPositions[i], pos, { gridSpaces: true });

              if (cd <= range.range) {
                this._highlightGridPosition(hl, pos, range);

                // Mirror, 2 lines of symmetry
                this._highlightGridPosition(
                  hl,
                  { x: (col0 - (c - col0) - wEven) * gs, y: pos.y },
                  range
                );

                this._highlightGridPosition(
                  hl,
                  { x: (col0 - (c - col0) - wEven) * gs, y: (row0 - (r - row0) - hEven) * gs },
                  range
                );

                this._highlightGridPosition(
                  hl,
                  { x: pos.x, y: (row0 - (r - row0) - hEven) * gs },
                  range
                );

                withinRange = range;
                break;
              }
            }
            if (withinRange) break;
          }
        }
      }
    } else {
      for (let r = row0 - nRows; r < hRows; r++) {
        for (let c = col0 - nCols; c < hCols; c++) {
          const [x, y] = grid.getPixelsFromGridPosition(r, c);
          const pos = { x, y };

          let withinRange;
          for (let j = 0; j < this.ranges.length; j++) {
            const range = this.ranges[j];
            for (let i = 0; i < tokenPositions.length; i++) {
              let cd = canvas.grid.measureDistance(tokenPositions[i], pos, { gridSpaces: true });

              if (cd <= range.range) {
                this._highlightGridPosition(hl, pos, range);
                withinRange = range;
                break;
              }
            }
            if (withinRange) break;
          }
        }
      }
    }
  }

  _drawShape(hl, shape, { color, alpha = 0.1, lineColor, lineAlpha = 0.3, lineWidth = 2 } = {}) {
    if (!color && !lineColor) color = 0xffffff;

    if (Number.isFinite(color)) hl.beginFill(color, alpha);
    if (Number.isFinite(lineColor)) hl.lineStyle(lineWidth, lineColor, lineAlpha);

    hl.drawShape(shape).endFill();
  }

  _highlightGridPosition(
    layer,
    { x, y } = {},
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
    else layer.lineStyle(0);
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
      // For optimization only return the outer edge of the square
      const tokenGridWidth = this.token.w / canvas.grid.size;
      const tokenGridHeight = this.token.h / canvas.grid.size;
      for (let i = 0; i < tokenGridWidth; i++) {
        positions.push({ x: tx + canvas.grid.size * i, y: ty });
      }
      for (let i = 0; i < tokenGridWidth; i++) {
        positions.push({
          x: tx + canvas.grid.size * i,
          y: ty + canvas.grid.size * (tokenGridHeight - 1),
        });
      }
      for (let i = 1; i < tokenGridHeight; i++) {
        positions.push({
          x: tx + canvas.grid.size * (tokenGridWidth - 1),
          y: ty + canvas.grid.size * i,
        });
      }

      for (let i = 1; i < tokenGridHeight; i++) {
        positions.push({ x: tx, y: ty + canvas.grid.size * i });
      }

      // Returns all squares
      // for (let h = 0; h < this.token.h / canvas.grid.size; h++) {
      //   for (let w = 0; w < this.token.w / canvas.grid.size; w++) {
      //     const offsetY = canvas.grid.size * h;
      //     const offsetX = canvas.grid.size * w;

      //     //let [x, y] = canvas.grid.grid.getTopLeft(tx + offsetX, ty + offsetY);
      //     positions.push({ x: tx + offsetX, y: ty + offsetY });
      //   }
      // }
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

    if (
      MODULE_CLIENT_CONFIG.tokenActivatedDistanceMeasure &&
      token._original &&
      canvas.controls.ruler?._state === Ruler.STATES.INACTIVE
    ) {
      DistanceMeasurer.showMeasures();
    }
  });

  // Remove highlights
  Hooks.on('destroyToken', (token) => {
    // Return RangeHighlighter to the original token on drag-end
    if (token._tgRange && token._original) {
      token._tgRange.token = token._original;
      token._original._tgRange.highlight();
    } else if (token._tgRange) {
      RangeHighlightAPI.clearRangeHighlight(token, { force: true });
    }

    if (
      MODULE_CLIENT_CONFIG.tokenActivatedDistanceMeasure &&
      token._original &&
      canvas.controls.ruler?._state === Ruler.STATES.INACTIVE
    ) {
      DistanceMeasurer.hideMeasures();
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

  const checkApplyFlagRanges = function (token) {
    const ranges = token.document.getFlag(MODULE_ID, 'ranges');
    if (ranges) RangeHighlightAPI.rangeHighlight(token, { ranges });
  };

  Hooks.on('createToken', (token) => {
    checkApplyFlagRanges(token);
  });

  Hooks.on('updateToken', (token, change, opts, userId) => {
    const mFlags = change.flags?.[MODULE_ID];
    if (mFlags && token.object) {
      if ('-=ranges' in mFlags || 'ranges' in mFlags) {
        RangeHighlightAPI.clearRangeHighlight(token.object, { force: true });
        checkApplyFlagRanges(token.object);
      }
    }
  });

  Hooks.on('canvasReady', () => {
    for (const token of canvas.tokens.placeables) {
      checkApplyFlagRanges(token);
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

    const colors = MODULE_CONFIG.range.colors;

    // Process numerical and object ranges assigning them color configurations as per module settings
    ranges = ranges
      .sort((a, b) => a.range - b.range)
      .map((r, i) => {
        const c = i < colors.length ? colors[i] : MODULE_CONFIG.range.defaultColor;

        if (Number.isFinite(r)) {
          return {
            range: r,
            ...c,
          };
        } else if (r.color == null && r.lineColor == null) {
          const c = i < colors.length ? colors[i] : MODULE_CONFIG.range.defaultColor;
          return { ...c, ...r };
        }
        return r;
      });

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
  static clearRangeHighlight(token, { force = false, id } = {}) {
    if (token._tgRange) {
      if (force) {
        token._tgRange.clear();
        token._tgRange = null;
        return;
      }
      const ranges = token._tgRange.ranges;
      let nRanges = [];
      for (const range of ranges) {
        if (range.id && range.id !== id) {
          nRanges.push(range);
        }
      }

      if (nRanges.length === 0) {
        token._tgRange.clear();
        token._tgRange = null;
      } else if (nRanges.length !== ranges.length) {
        token._tgRange.ranges = nRanges;
        token._tgRange.highlight();
      }
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

function _getShiftedPosition(dx, dy, token, origin) {
  let { x, y, width, height } = token.document;
  const s = canvas.dimensions.size;

  // Identify the coordinate of the starting grid space
  let x0 = x;
  let y0 = y;
  if (canvas.grid.type !== CONST.GRID_TYPES.GRIDLESS) {
    const c = token.center;
    x0 = width <= 1 ? c.x : x + s / 2;
    y0 = height <= 1 ? c.y : y + s / 2;
  }

  // Shift the position and test collision
  const [x1, y1] = canvas.grid.grid.shiftPosition(x0, y0, dx, dy, { token });
  let collide = token.checkCollision(token.getCenter(x1, y1), { origin });
  return collide ? { x, y } : { x: x1, y: y1 };
}
