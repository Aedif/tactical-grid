import { getHexOffsets } from './measurer.js';

export class ReachHighlighter {
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
      if (d.color != null) d.color = new PIXI.Color(d.color).toNumber();
      if (d.lineColor != null) d.lineColor = new PIXI.Color(d.lineColor).toNumber();
      return d;
    });

    canvas.grid.addHighlightLayer(this.highlightId);
    this.token._tgReach = this;
    this.highlightGrid();
  }

  get highlightId() {
    return `ReachHighlighter.${this.token.document.id}`;
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

    if (this.token._animation) return;

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
                border: this.distances[j].lineColor,
                color: this.distances[j].color,
                alpha: this.distances[j].alpha,
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

  _renderLines(layer) {
    for (let i = 0; i < this.distances.length; i++) {
      layer.lineStyle(5, this.distances[i].color, Math.min(0.5 * 1.5, 1.0));
      let it = this.uniquePolyLines[i].values();
      let result = it.next();
      while (!result.done) {
        let line = result.value[0];
        // console.log('Drawing line', line);
        layer.moveTo(line[0], line[1]);
        layer.lineTo(line[2], line[3]);
        result = it.next();
      }
    }
  }

  _highlightGridPosition(
    layer,
    { x, y, color = 0x33bbff, border = null, alpha = 0.1, shape = null, shrink = 0.8 } = {}
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

    layer.beginFill(color, alpha);
    if (Number.isFinite(border)) layer.lineStyle(2, border, Math.min(alpha * 1.5, 1.0));
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

export function registerReachHighlightHooks() {
  Hooks.on('refreshToken', (token) => {
    if (token._tgReach) {
      token._tgReach.highlightGrid();
    }
  });

  const selectors = {
    itemHover: '.item-name',
    item: '.item',
    itemId: 'data-item-id',
    reaches: ['system.range.value', 'system.range.long'],
    colors: ['#00ff00', '#ffdd00', '#ff0000'],
  };

  Hooks.on('renderActorSheet', (sheet, form, options) => {
    const actor = options.actor;

    $(form)
      .find(selectors.itemHover)
      .on('mouseenter', (event) => {
        const token = sheet.token?.object;
        if (!token) return;

        const itemId = $(event.target).closest(selectors.item).attr(selectors.itemId);
        const item = actor.items.get(itemId);

        if (!item) {
          TacticalGrid.clearReach(token);
          return;
        }

        const distances = [];
        for (let i = 0; i < selectors.reaches.length; i++) {
          let r = selectors.reaches[i];
          let range = foundry.utils.getProperty(item, r);
          if (range) {
            let color = i < selectors.colors.length ? selectors.colors[i] : '#ff00c8';
            distances.push({ reach: Number(range), color, lineColor: color });
          }
        }

        if (distances.length) {
          TacticalGrid.highlightReach(token, distances, {
            roundToken: false,
          });
        }
      })
      .on('mouseleave', (event) => {
        const token = sheet.token?.object;
        if (token) TacticalGrid.clearReach(token);
      });
  });
}
// recursive exploration using `shiftPosition`

function constructGridArray(nRows, nCols) {
  const grid = new Array(nCols);
  for (let i = 0; i < nCols; i++) {
    grid[i] = new Array(nRows);
  }
  return grid;
}
