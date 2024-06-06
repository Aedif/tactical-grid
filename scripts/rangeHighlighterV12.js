import { getHexOffsets } from './measurer.js';

/**
 * Range Highlighter with warning fixes for v12
 * Will eventually replace the normal RangeHighlighter class
 */
export class RangeHighlighterV12 {
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

    canvas.interface.grid.addHighlightLayer(this.highlightId);
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
    const hl = canvas.interface.grid.getHighlightLayer(this.highlightId);
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
    const grid = canvas.grid;
    const d = canvas.dimensions;

    let { x, y } = canvas.tokens.getSnappedPoint({ x: this.token.x, y: this.token.y });

    const maxDistance = this.ranges[this.ranges.length - 1].range;

    const tokenHeight = Math.ceil(this.token.document.height);
    const tokenWidth = Math.ceil(this.token.document.width);

    const distanceV = maxDistance + Math.max(0, (1 - tokenHeight) * canvas.dimensions.distance);
    const distanceH = maxDistance + Math.max(0, (1 - tokenWidth) * canvas.dimensions.distance);

    // Get number of rows and columns
    const snappedPoint = canvas.grid.getOffset({ x: d.width, y: d.height });
    const maxRow = snappedPoint.i;
    const maxCol = snappedPoint.j;

    let nRows = Math.ceil((distanceH * 1.5) / d.distance / (d.size / grid.sizeY));
    let nCols = Math.ceil((distanceV * 1.5) / d.distance / (d.size / grid.sizeX));
    [nRows, nCols] = [Math.min(nRows, maxRow), Math.min(nCols, maxCol)];

    // Get the offset of the token origin relative to the top-left grid space
    const offset = grid.getOffset({ x, y });
    let row0 = offset.i;
    let col0 = offset.j;

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
            const measureDistance = range.measureDistance ?? canvas.grid.measurePath.bind(canvas.grid);
            for (let i = 0; i < tokenPositions.length; i++) {
              let cd = measureDistance([tokenPositions[i], pos]).distance;

              if (cd <= range.range) {
                this._highlightGridPosition(hl, pos, range);

                // Mirror, 2 lines of symmetry
                this._highlightGridPosition(hl, { x: (col0 - (c - col0) - wEven) * gs, y: pos.y }, range);

                this._highlightGridPosition(
                  hl,
                  { x: (col0 - (c - col0) - wEven) * gs, y: (row0 - (r - row0) - hEven) * gs },
                  range
                );

                this._highlightGridPosition(hl, { x: pos.x, y: (row0 - (r - row0) - hEven) * gs }, range);

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
              let cd = canvas.grid.measurePath([tokenPositions[i], pos]).distance;

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

    const vertices = canvas.grid.getShape();
    vertices.forEach((v) => {
      v.x = v.x * shrink + x + canvas.grid.size / 2;
      v.y = v.y * shrink + y + canvas.grid.size / 2;
    });

    shape = new PIXI.Polygon(vertices);

    // shape = new PIXI.Polygon(
    //   canvas.grid.grid.getPolygon(
    //     x + offsetX / 2,
    //     y + offsetY / 2,
    //     Math.ceil(canvas.grid.sizeX) - offsetX,
    //     Math.ceil(canvas.grid.sizeY) - offsetY
    //   )
    // );

    if (Number.isFinite(color)) layer.beginFill(color, alpha);
    if (Number.isFinite(lineColor)) layer.lineStyle(lineWidth, lineColor, lineAlpha);
    else layer.lineStyle(0);
    layer.drawShape(shape).endFill();
  }

  _getTokenGridPositions(tx, ty) {
    const positions = [];

    if (canvas.grid.type !== CONST.GRID_TYPES.SQUARE && this.token.document.width == this.token.document.height) {
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
