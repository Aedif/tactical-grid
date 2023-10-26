import { getHexOffsets } from './measurer.js';

let outline_mode = false;

export class ReachHighlighter {
  constructor(token, distances, borderColor = null) {
    this.token = token;

    this.borderColor = borderColor ? new PIXI.Color(borderColor).toNumber() : null;
    this.fillColor = '#0000ff';
    if (distances instanceof Array) {
      this.distances = distances.sort((r1, r2) => r1.reach - r2.reach);
    } else {
      this.distances = [distances];
    }

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
    //test
    if (outline_mode) {
      this.polyLines = {};
      this.uniquePolyLines = {};
      for (let i = 0; i < this.distances.length; i++) {
        this.polyLines[i] = new LineCollection();
        this.uniquePolyLines[i] = new LineCollection();
      }
    }
    //test

    // Clear the existing highlight layer
    const grid = canvas.grid;
    const hl = grid.getHighlightLayer(this.highlightId);
    hl.clear();

    if (this.token._animation) return;

    // If we are in grid-less mode, highlight the shape directly
    if (grid.type === CONST.GRID_TYPES.GRIDLESS) {
      for (const r of this.distances) {
        const shape = new PIXI.Ellipse(
          this.token.center.x,
          this.token.center.y,
          r.reach * canvas.dimensions.distancePixels + this.token.w / 2,
          r.reach * canvas.dimensions.distancePixels + this.token.h / 2
        );
        grid.grid.highlightGridPosition(hl, {
          border: this.borderColor,
          color: r.color,
          shape,
          alpha: r.alpha ?? 0.1,
        });
      }
    }

    // Otherwise, highlight specific grid positions
    else {
      this._highlightGridPositions(hl);
      // const positions = this._getGridHighlightPositions();
      // for (const { x, y } of positions) {
      //   grid.grid.highlightGridPosition(hl, { x, y, border: this.borderColor, color });
      // }
    }
  }

  _foundSquare(x, y, size, dIndex) {
    if (dIndex < this.distances.length - 1) {
      this._foundSquare(x, y, size, dIndex + 1);
    }

    let line1 = [x, y, x + size, y];
    let line2 = [x, y, x, y + size];
    let line3 = [x + size, y, x + size, y + size];
    let line4 = [x, y + size, x + size, y + size];

    this._addLine(line1, dIndex);
    this._addLine(line2, dIndex);
    this._addLine(line3, dIndex);
    this._addLine(line4, dIndex);

    this.polyLines[dIndex].add(line1);
    this.polyLines[dIndex].add(line2);
    this.polyLines[dIndex].add(line3);
    this.polyLines[dIndex].add(line4);
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

            if (outline_mode) {
              if (cd === this.distances[j].reach) {
                this._highlightGridPosition(hl, {
                  x: gx,
                  y: gy,
                  border: this.borderColor,
                  color: this.distances[j].color,
                  alpha: this.distances[j].alpha,
                });
                withinReach = this.distances[j];
                break;
              }
            } else {
              if (cd <= this.distances[j].reach) {
                this._highlightGridPosition(hl, {
                  x: gx,
                  y: gy,
                  border: this.borderColor,
                  color: this.distances[j].color,
                  alpha: this.distances[j].alpha,
                });
                withinReach = this.distances[j];
                break;
              }
            }

            // if (
            //   canvas.grid.measureDistance(
            //     tokenPositions[i],
            //     { x: gx, y: gy },
            //     { gridSpaces: true }
            //   ) <= this.distances[j].reach
            // ) {
            //   if (outline_mode) this._foundSquare(gx, gy, canvas.dimensions.size, j);
            //   else {
            //     this._highlightGridPosition(hl, {
            //       x: gx,
            //       y: gy,
            //       border: this.borderColor,
            //       color: this.distances[j].color,
            //       alpha: 0.1,
            //     });
            //   }

            //   withinReach = this.distances[j];
            //   break;
            // }
          }
          if (withinReach) break;
        }
        // if (withinReach) positions.push();
      }
    }

    //test
    if (outline_mode) this._renderLines(hl);
    //test
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

  // _highlightGridPositions(hl) {
  //   const grid = canvas.grid.grid;
  //   const d = canvas.dimensions;
  //   const { x, y } = this.token;
  //   const maxDistance = this.distances[this.distances.length - 1].reach;
  //   const distanceV =
  //     maxDistance + Math.max(0, (1 - this.token.document.height) * canvas.dimensions.distance);
  //   const distanceH =
  //     maxDistance + Math.max(0, (1 - this.token.document.width) * canvas.dimensions.distance);

  //   // Get number of rows and columns
  //   const [maxRow, maxCol] = grid.getGridPositionFromPixels(d.width, d.height);
  //   let nRows = Math.ceil((distanceH * 1.5) / d.distance / (d.size / grid.h));
  //   let nCols = Math.ceil((distanceV * 1.5) / d.distance / (d.size / grid.w));
  //   [nRows, nCols] = [Math.min(nRows, maxRow), Math.min(nCols, maxCol)];

  //   // Get the offset of the template origin relative to the top-left grid space
  //   const [tx, ty] = grid.getTopLeft(x, y);
  //   const [row0, col0] = grid.getGridPositionFromPixels(tx, ty);

  //   // Identify grid coordinates covered by the template Graphics
  //   const tokenPositions = this._getTokenGridPositions();
  //   const positions = [];
  //   for (let r = -nRows; r < nRows + this.token.document.height; r++) {
  //     for (let c = -nCols; c < nCols + this.token.document.width; c++) {
  //       const [gx, gy] = grid.getPixelsFromGridPosition(row0 + r, col0 + c);

  //       let withinReach = false;
  //       for (let j = 0; j < this.distances.length; j++) {
  //         for (let i = 0; i < tokenPositions.length; i++) {
  //           if (
  //             canvas.grid.measureDistance(
  //               tokenPositions[i],
  //               { x: gx, y: gy },
  //               { gridSpaces: true }
  //             ) <= this.distances[j].reach
  //           ) {
  //             this._highlightGridPosition(hl, {
  //               x: gx,
  //               y: gy,
  //               border: this.borderColor,
  //               color: this.distances[j].color,
  //               alpha: 0.1,
  //             });
  //             withinReach = true;
  //             break;
  //           }
  //         }
  //         if (withinReach) break;
  //       }
  //       if (withinReach) positions.push({ x: gx, y: gy });
  //     }
  //   }
  //   return positions;
  // }

  _highlightGridPosition(
    layer,
    { x, y, color = 0x33bbff, border = null, alpha = 0.1, shape = null } = {}
  ) {
    canvas.grid.grid.highlightGridPosition(layer, {
      x,
      y,
      color,
      border,
      alpha: alpha ?? 0.1,
      shape,
    });

    // Smaller shape drawing
    // let s = canvas.dimensions.size;

    // let ds = s * 0.3;
    // shape = new PIXI.Rectangle(x + ds / 2, y + ds / 2, s - ds, s - ds);
    // if (!shape) return;
    // layer.beginFill(color, alpha);
    // if (Number.isFinite(border)) layer.lineStyle(2, border, Math.min(alpha * 1.5, 1.0));
    // layer.drawShape(shape).endFill();
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
}
// recursive exploration using `shiftPosition`

function constructGridArray(nRows, nCols) {
  const grid = new Array(nCols);
  for (let i = 0; i < nCols; i++) {
    grid[i] = new Array(nRows);
  }
  return grid;
}

function propsToKey(props) {
  return JSON.stringify(props);
}

class LineCollection {
  items = new Map();
  add(...props) {
    this.items.set(propsToKey(props), props);
    return this;
  }
  clear() {
    this.items.clear();
  }
  delete(...props) {
    return this.items.delete(propsToKey(props));
  }
  forEach(cb) {
    return this.items.forEach((v) => cb(...v));
  }
  has(...props) {
    return this.items.has(propsToKey(props));
  }
  get size() {
    return this.items.size;
  }
  values() {
    return this.items.values();
  }
}
