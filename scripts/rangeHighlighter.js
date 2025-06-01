import { MODULE_CLIENT_CONFIG, MODULE_CONFIG } from '../applications/settings.js';
import { registerGameSystem, registerModules } from './externalSupport.js';
import { MODULE_ID } from './utils.js';

export class RangeHighlighter {
  /**
   * A map of unique token/range keys and highlight grid offsets
   * When a unique token/range combination is encountered the distances and grid spaces
   * to be highlighted are calculated and then stored and reused using this map
   */
  static _cachedRangeOffsets = new Map();

  constructor(token, ranges) {
    this.token = token;

    if (ranges instanceof Array) this.ranges = ranges;
    else this.ranges = [ranges];

    const grid = canvas.grid;

    // Row and column grid types can be combined for caching purposes
    let gridType = grid.type;
    if (gridType === CONST.GRID_TYPES.HEXODDR || gridType === CONST.GRID_TYPES.HEXEVENR) gridType = 10050;
    else if (gridType === CONST.GRID_TYPES.HEXODDQ || gridType === CONST.GRID_TYPES.HEXEVENQ) gridType = 20050;

    // Part of the unique key where the highlight grid offsets will be stored
    const mainCacheKey = `${this.token.document.width}:${this.token.document.height}:${this.token.document.shape}:${gridType}`;

    // Process ranges ready to be used for highlighting operations
    this.ranges.forEach((range) => {
      if (range.color) range.color = new PIXI.Color(range.color).toNumber();
      if (range.lineColor) range.lineColor = new PIXI.Color(range.lineColor).toNumber();

      if (gridType !== CONST.GRID_TYPES.GRIDLESS) {
        // Full unique key to store highlight grid offsets within
        range.cacheKey = `${mainCacheKey}:${range.range}`;

        // Get the grid space shape and shrink it
        const vertices = grid.getShape();
        vertices.forEach((v) => {
          v.x = v.x * (range.shrink ?? 0.8) + grid.sizeX / 2;
          v.y = v.y * (range.shrink ?? 0.8) + grid.sizeY / 2;
        });

        range.shape = vertices;
      }
    });

    // If the token already has an instance of RangeHighlighter lets swap out with it
    if (this.token._tgRange) {
      this._transferRanges(this.token._tgRange);
    }
    this.token._tgRange = this;

    // Sort ranges from shortest to longest
    // This is crucial for certain operations
    this.ranges = ranges.sort((r1, r2) => r1.range - r2.range);

    // Add a highlight layer to be used for drawing highlights
    canvas.interface.grid.addHighlightLayer(this.highlightId);

    // Immediately perform grid highlighting
    this.highlight();
  }

  /**
   * Merge ranges from the provided RangeHighlighter into this one
   * @param {RangeHighlighter} rangeHighlighter
   */
  _transferRanges(rangeHighlighter) {
    for (const range of rangeHighlighter.ranges) {
      if (range.id) {
        const r = this.ranges.find((r) => r.id === range.id);
        if (!r) this.ranges.push(range);
      }
    }

    rangeHighlighter.clear();
  }

  /**
   * Unique highlight layer id specific to this token
   */
  get highlightId() {
    return `RangeHighlighter.${this.token.document.id}`;
  }

  /**
   * Remove highlights belonging to this RangeHighlighter
   */
  clear() {
    const hl = canvas.interface.grid.getHighlightLayer(this.highlightId);
    hl.clear();
    clearTimeout(this._timer);
  }

  /**
   * Refresh highlights.
   * This operation is throttled for efficiency on scenes with grids
   */
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

  /**
   * Highlight the grid surrounding the token based on the ranges
   */
  _highlightGrid() {
    this._timeSinceLastHighlight = new Date().getTime();

    // Clear the existing highlight layer
    const grid = canvas.grid;
    const hl = canvas.interface.grid.getHighlightLayer(this.highlightId);

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

    hl.clear();

    // If we are in grid-less mode, highlight the shape directly
    if (grid.type === CONST.GRID_TYPES.GRIDLESS) {
      this._highlightGridlessShape(hl);
    }

    // Otherwise, highlight specific grid positions
    else {
      this._highlightGridPositions(hl);
    }
  }

  /**
   * Draw ranges directly as shapes. Called on gridless scenes which do not require grid space highlighting
   * @param {GridHighlight} hl
   */
  _highlightGridlessShape(hl) {
    this.ranges = this.ranges.sort((r1, r2) => r2.range - r1.range);

    const shapes = this.ranges.map((r) => {
      let shape;

      // Token shape
      const tShape = this.token.document.shape;
      const { width, height } = this.token.document.getSize();
      const { x, y } = this.token.center;

      if (tShape === CONST.TOKEN_SHAPES.ELLIPSE_1 || tShape === CONST.TOKEN_SHAPES.ELLIPSE_2) {
        if (width === height) {
          const radius = r.range * canvas.dimensions.distancePixels + width / 2;
          shape = new PIXI.Circle(x, y, radius, radius);
        } else {
          const radiusX = r.range * canvas.dimensions.distancePixels + width / 2;
          const radiusY = r.range * canvas.dimensions.distancePixels + height / 2;

          shape = new PIXI.Ellipse(x, y, radiusX, radiusY);
        }
      } else {
        const rwidth = width + r.range * 2 * canvas.dimensions.distancePixels;
        const rheight = height + r.range * 2 * canvas.dimensions.distancePixels;

        shape = new PIXI.RoundedRectangle(
          x - rwidth / 2,
          y - rheight / 2,
          rwidth,
          rheight,
          r.range * canvas.dimensions.distancePixels
        );
      }

      return { shape, style: r };
    });

    for (let i = 0; i < shapes.length; i++) {
      const { shape, style } = shapes[i];

      // If this is not the first range that has been draw, carve out a hole to draw this range within
      if (i != 0) {
        hl.beginHole();
        hl.drawShape(shape);
        hl.endHole();
      }

      this._drawShape(hl, shape, style);
    }
  }

  /**
   * Draw a simple shape on the highlight layer
   * @param {GridHighlight} hl
   * @param {PIXI.Rectangle|PIXI.Circle|PIXI.Ellipse|PIXI.RoundedRectangle} shape
   * @param {object} style
   */
  _drawShape(hl, shape, { color, alpha = 0.1, lineColor, lineAlpha = 0.3, lineWidth = 2 } = {}) {
    if (!color && !lineColor) color = 0xffffff;

    if (Number.isFinite(color)) hl.beginFill(color, alpha);
    if (Number.isFinite(lineColor)) hl.lineStyle(lineWidth, lineColor, lineAlpha);

    hl.drawShape(shape).endFill();
  }

  /**
   * Calculate distances and highlight grid offsets.
   * @returns
   */
  _cacheRanges() {
    // Identify ranges that have not been cached yet
    const toCacheRanges = this.ranges.filter((range) => {
      if (!range.cache) range.cache = RangeHighlighter._cachedRangeOffsets.get(range.cacheKey);
      return !range.cache;
    });
    if (!toCacheRanges.length) return;

    toCacheRanges.forEach((range) => {
      range.cache = [];
      RangeHighlighter._cachedRangeOffsets.set(range.cacheKey, range.cache);
    });

    // Calculate grid offsets for un-cached ranges
    const ranges = toCacheRanges;

    // Determine the estimated search space using the max range
    const maxRange = (ranges[ranges.length - 1].range / canvas.dimensions.distance) * canvas.dimensions.size;
    const bounds = this.token.bounds;

    const maxBounds = new PIXI.Rectangle(
      bounds.x - maxRange,
      bounds.y - maxRange,
      bounds.width + maxRange * 2,
      bounds.height + maxRange * 2
    );

    if (CONFIG.debug.atg) {
      canvas.controls.debug.clear();
      canvas.controls.debug.lineStyle(2, 0xffffff, 1.0).drawShape(maxBounds);
    }

    // Top-left and bottom-right grid offsets within the max bounds
    const [i0, j0, i1, j1] = canvas.grid.getOffsetRange(maxBounds);

    // Get all the grid spaces occupied by the token
    const occupied = new Set();
    this.token.document.getOccupiedGridSpaceOffsets().forEach((offset) => occupied.add(pack(offset, offset)));

    // Find the edge of the occupied grid spaces
    // Distance measurements will be limited to these
    const edge = new Set();
    for (let offset of occupied) {
      offset = unpack(offset);

      for (let adj of canvas.grid.getAdjacentOffsets(offset)) {
        if (!occupied.has(pack(adj))) {
          edge.add(pack(offset));
          break;
        }
      }
    }

    // Get the coordinates of the top-left most occupied grid space
    // Grid highlight offsets wil be based off of this
    const { x, y } = canvas.grid.getTopLeftPoint(this.token.document._positionToGridOffset());

    // Measure grid distances within the max-bounds and cache spaces within ranges
    for (let i = i0; i <= i1; i++) {
      for (let j = j0; j <= j1; j++) {
        // Ignore token occupied spaces
        if (occupied.has(pack({ i, j }))) continue;

        // Find shortest distance to this grid space from the edge of the token
        let shortest = 99999999999999999;
        for (const t of edge) {
          let cd = canvas.grid.measurePath([unpack(t), { i, j }]).distance;
          if (cd < shortest) shortest = cd;
        }

        // Store the grid space within the caches of ranges it is within
        for (let r = 0; r < ranges.length; r++) {
          const range = ranges[r];
          if (shortest <= range.range) {
            const { x: x0, y: y0 } = canvas.grid.getTopLeftPoint({ i, j });
            range.cache.push({ x: (x0 - x) / canvas.grid.size, y: (y0 - y) / canvas.grid.size });
          }
        }
      }
    }
  }

  /**
   * Highlights grid positions within the ranges
   * @param {GridHighlight} hl
   */
  _highlightGridPositions(hl) {
    this._cacheRanges();

    const pack = function ({ x, y } = {}) {
      return (((x + 32768) << 16) >>> 0) | ((y + 32768) & 0xffff);
    };

    const { x, y } = canvas.grid.getTopLeftPoint(this.token.document._positionToGridOffset());

    const highlighted = new Set();
    for (const range of this.ranges) {
      for (const offset of range.cache) {
        const point = { x: x + offset.x * canvas.grid.size, y: y + offset.y * canvas.grid.size };

        const packed = pack(point);
        if (!highlighted.has(packed)) {
          console.log(point);
          this._highlightGridPosition(hl, point, range);
          highlighted.add(packed);
        }
      }
    }
  }

  /**
   * Highlights grid position using provided shape and style
   * @param {*} layer
   * @param {*} param1
   * @param {*} param2
   * @returns
   */
  _highlightGridPosition(layer, { x, y } = {}, { color, alpha = 0.1, shape } = {}) {
    if (!layer.highlight(x, y)) return;

    if (Number.isFinite(color)) layer.beginFill(color, alpha);
    layer
      .drawShape(
        new PIXI.Polygon(
          shape.map((p) => {
            return { x: p.x + x, y: p.y + y };
          })
        )
      )
      .endFill();
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
      token._original._tgRange = token._tgRange;
      RangeHighlightAPI.clearRangeHighlight(token._original);
    } else if (token._tgRange) {
      RangeHighlightAPI.clearRangeHighlight(token, { force: true });
    }

    TacticalGrid.distanceCalculator.hideLabels();
  });

  Hooks.on('hoverToken', (token, hoverIn) => {
    if (!MODULE_CONFIG.range.token.enabled) return;
    if (!MODULE_CLIENT_CONFIG.rangeHighlighter) return;
    if (MODULE_CONFIG.range.token.combatOnly && !game.combat?.started) return;
    if (!game.user.isGM && !(token.owner || MODULE_CONFIG.range.token.dispositions[token.document.disposition])) return;
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
    if (token.object) checkApplyFlagRanges(token.object);
  });

  Hooks.on('updateToken', (token, change) => {
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

  registerGameSystem();
  registerModules();
}

export class RangeHighlightAPI {
  /**
   *  Returns true if Item range highlighting is enabled
   */
  static get itemHighlightEnabled() {
    if (!MODULE_CONFIG.range.item.enabled) return false;
    if (!MODULE_CLIENT_CONFIG.rangeHighlighter) return false;
    if (MODULE_CONFIG.range.item.combatOnly && !game.combat?.started) return false;
    return true;
  }

  /**
   * Highlights ranges around the token using either the supplied range values or automatically calculated system specific ranges if only a token or a token and an item are provided.
   * @param {Token} token                                  Token to highlight the ranges around
   * @param {Array[Number]|Array[Object]|null} opts.ranges Array of ranges as numerical values or objects defining the range and look of the highlight
   *                                                        e.g. [5, 30, 60]
   *                                                        e.g. [ {range: 30, color: '#00ff00', alpha: 0.1, lineColor: '#00ff00', lineWidth: 2, lineAlpha: 0.4, shrink: 0.8, }]
   * @param {Item} opts.item                               Item to be evaluated by the system specific range calculator to determine `ranges` automatically
   * @returns {null}
   */
  static rangeHighlight(token, { ranges, item } = {}) {
    if (!ranges) {
      if (!this._rangeCalculator) return;

      if (item) ranges = this._rangeCalculator.getItemRange(item, token);
      else ranges = this._rangeCalculator.getTokenRange(token);
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

    new RangeHighlighter(token, ranges);
  }

  /**
   * Parses Item uuid and attempts to highlight ranges for any associated tokens
   * @param {String} uuid            Item uuid
   */
  static async rangeHighlightItemUuid(uuid) {
    const { tokens, item } = await _tokensAndItemFromItemUuid(uuid);
    tokens?.forEach((t) => this.rangeHighlight(t, { item }));
  }

  /**
   * Clears highlights applied using TacticalGrid.rangeHighlight(...)
   * @param {Token|Array[Token]} tokens Tokens to remove the highlights from
   */
  static clearRangeHighlight(tokens, { force = false, id } = {}) {
    if (!(tokens instanceof Array)) tokens = [tokens];

    for (const token of tokens) {
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

const OFFSET = 32768; // Supports coordinates from -32768 to +32767

function pack(offset) {
  return (((offset.i + OFFSET) << 16) >>> 0) | ((offset.j + OFFSET) & 0xffff);
}

function unpack(packed) {
  const i = (packed >>> 16) - OFFSET;
  const j = (packed & 0xffff) - OFFSET;
  return { i, j };
}
