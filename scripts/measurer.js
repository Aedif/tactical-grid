import { MODULE_CONFIG } from '../applications/settings.js';

export let TEXT_STYLE;

export class DistanceMeasurer {
  static hlName = 'ATG';
  static shape;
  static gridSpaces = true;

  static showMeasures({ gridSpaces = true } = {}) {
    DistanceMeasurer.gridSpaces = gridSpaces;
    if (!canvas.grid.highlightLayers[DistanceMeasurer.hlName]) {
      canvas.grid.addHighlightLayer(DistanceMeasurer.hlName);
    }

    const ruler = canvas.controls.ruler;
    if (
      MODULE_CONFIG.rulerActivatedDistanceMeasure &&
      ruler &&
      ruler._state !== Ruler.STATES.INACTIVE
    ) {
      DistanceMeasurer.highlightPosition({ x: ruler.destination.x, y: ruler.destination.y });
    } else if (canvas.tokens.hover?.x) {
      DistanceMeasurer.highlightPosition({
        x: canvas.tokens.hover.center.x,
        y: canvas.tokens.hover.center.y,
      });
    } else if (canvas.tokens.controlled.length === 1) {
      let controlled = canvas.tokens.controlled[0];
      DistanceMeasurer.highlightPosition({ x: controlled.center.x, y: controlled.center.y });
    }

    DistanceMeasurer.drawLabels();
  }

  static hideMeasures() {
    DistanceMeasurer.deleteLabels();
    canvas.grid.destroyHighlightLayer(DistanceMeasurer.hlName);
  }

  static highlightPosition(pos) {
    const layer = canvas.grid.highlightLayers[DistanceMeasurer.hlName];
    if (!layer) return;
    canvas.grid.clearHighlightLayer(DistanceMeasurer.hlName);

    const [x, y] = canvas.grid.grid.getTopLeft(pos.x, pos.y);
    canvas.grid.grid.highlightGridPosition(layer, {
      x,
      y,
      color: 0xff0000,
      border: 0xff0000,
      alpha: 0.2,
    });
  }

  static drawLabels() {
    DistanceMeasurer.deleteLabels();

    const layer = canvas.grid.highlightLayers[DistanceMeasurer.hlName];
    if (!layer || !layer.positions.size) return;

    const [originX, originY] = layer.positions.first().split('.');
    const origin = {
      x: Number(originX) + canvas.grid.size / 2,
      y: Number(originY) + canvas.grid.size / 2,
    };

    let originToken;
    if (canvas.tokens.hover) {
      originToken = canvas.tokens.hover;
    } else if (canvas.tokens.controlled.length === 1) {
      originToken = canvas.tokens.controlled[0];
    }

    const visibleTokens = canvas.tokens.placeables.filter(
      (p) => p.visible //&& p.id !== originToken?.id
    );

    for (const token of visibleTokens) {
      if (
        canvas.grid.grid instanceof HexagonalGrid &&
        token.document.width == token.document.height &&
        token.document.width in POINTY_HEX_OFFSETS
      ) {
        const offsets = canvas.grid.grid.columnar ? FLAT_HEX_OFFSETS : POINTY_HEX_OFFSETS;
        for (const offset of offsets[token.document.width]) {
          const offsetX = token.w * offset[0];
          const offsetY = token.h * offset[1];
          const target = {
            x: token.x + offsetX,
            y: token.y + offsetY,
          };
          const distanceLabel = DistanceMeasurer._getDistanceLabel(origin, target, token, {
            gridSpaces: DistanceMeasurer.gridSpaces,
            originToken,
          });

          DistanceMeasurer.addUpdateLabel(token, offsetX, offsetY, distanceLabel);
        }
      } else {
        for (let h = 0; h < token.h / canvas.grid.size; h++) {
          for (let w = 0; w < token.w / canvas.grid.size; w++) {
            const offsetY = canvas.grid.size * h + canvas.grid.size / 2;
            const offsetX = canvas.grid.size * w + canvas.grid.size / 2;
            const target = {
              x: token.x + offsetX,
              y: token.y + offsetY,
            };
            const distanceLabel = DistanceMeasurer._getDistanceLabel(origin, target, token, {
              gridSpaces: DistanceMeasurer.gridSpaces,
              originToken,
            });

            DistanceMeasurer.addUpdateLabel(token, offsetX, offsetY, distanceLabel);
          }
        }
      }
    }
  }

  static addUpdateLabel(token, x, y, text) {
    for (const ch of token.children) {
      if (ch.atgText && ch.x === x && ch.y === y) {
        ch.text = text;
        return;
      }
    }
    if (!TEXT_STYLE) {
      TEXT_STYLE = PreciseText.getTextStyle(MODULE_CONFIG.measurement);
    }
    let pText = new PreciseText(text, TEXT_STYLE);
    pText.anchor.set(0.5);

    pText = token.addChild(pText);
    pText.atgText = true;
    pText.x = x;
    pText.y = y;
  }

  static deleteLabels() {
    canvas.tokens.placeables.forEach((p) => {
      p.children.filter((ch) => ch.atgText).forEach((ch) => p.removeChild(ch)?.destroy());
    });
  }

  static clickLeft(pos) {
    DistanceMeasurer.highlightPosition(pos);
    DistanceMeasurer.drawLabels();
  }

  static _getDistanceLabel(origin, target, targetToken, options) {
    let distance;
    // If the tokens have elevation we want to create a faux target coordinate in 2d space
    // so that we can then let foundry utils calculate the appropriate distance based on diagonal rules
    let originElevation = options.originToken ? options.originToken.document.elevation : 0;
    let verticalDistance =
      (canvas.grid.size / canvas.dimensions.distance) *
      Math.abs(targetToken.document.elevation - originElevation);
    if (verticalDistance != 0) {
      let dx = target.x - origin.x;
      let dy = target.y - origin.y;
      let mag = Math.sqrt(dx * dx + dy * dy);
      let angle = Math.atan(verticalDistance / mag);
      let length = mag / Math.cos(angle);

      let ray = Ray.fromAngle(0, 0, angle, length);
      const segments = [{ ray }];
      distance = canvas.grid.grid.measureDistances(segments, options)[0];
    } else {
      distance = canvas.grid.measureDistance(origin, target, options);
    }

    let precision = 10 ** MODULE_CONFIG.measurement.precision;
    let number = parseFloat(
      (Math.round(distance * precision) / precision).toFixed(MODULE_CONFIG.measurement.precision)
    );
    return `${number} ${canvas.scene.grid.units}`;
  }

  static _getVerticalDistance() {
    // Alternative DMG Movement
    if (rule === '5105') {
      let nd10 = Math.floor(nDiagonal / 2) - Math.floor((nDiagonal - nd) / 2);
      let spaces = nd10 * 2 + (nd - nd10) + ns;
      return spaces * canvas.dimensions.distance;
    }

    // Euclidean Measurement
    else if (rule === 'EUCL') {
      return Math.round(Math.hypot(nx, ny) * canvas.scene.grid.distance);
    }

    // Standard PHB Movement
    else return (ns + nd) * canvas.scene.grid.distance;
  }
}

const POINTY_HEX_OFFSETS = {
  0.5: [[0.5, 0.5]],
  1: [[0.5, 0.5]],
  2: [
    [0.5, 0.25],
    [0.25, 0.75],
    [0.75, 0.75],
  ],
  3: [
    [2 / 6, 1 / 6],
    [4 / 6, 1 / 6],
    [1 / 6, 0.5],
    [0.5, 0.5],
    [5 / 6, 0.5],
    [2 / 6, 5 / 6],
    [4 / 6, 5 / 6],
  ],
  4: [
    [0.25, 0.125],
    [0.5, 0.125],
    [0.75, 0.125],
    [0.125, 0.375],
    [0.375, 0.375],
    [0.625, 0.375],
    [0.875, 0.375],
    [0.25, 0.625],
    [0.5, 0.625],
    [0.75, 0.625],
    [0.375, 0.875],
    [0.625, 0.875],
  ],
};

const FLAT_HEX_OFFSETS = {
  0.5: [[0.5, 0.5]],
  1: [[0.5, 0.5]],
  2: [
    [0.25, 0.5],
    [0.75, 0.25],
    [0.75, 0.75],
  ],
  3: [
    [0.5, 1 / 6],
    [1 / 6, 2 / 6],
    [5 / 6, 2 / 6],
    [0.5, 0.5],
    [1 / 6, 4 / 6],
    [5 / 6, 4 / 6],
    [0.5, 5 / 6],
  ],
  4: [
    [0.125, 0.25],
    [0.125, 0.5],
    [0.125, 0.75],

    [0.375, 0.125],
    [0.375, 0.375],
    [0.375, 0.625],
    [0.375, 0.875],

    [0.625, 0.25],
    [0.625, 0.5],
    [0.625, 0.75],

    [0.875, 0.375],
    [0.875, 0.625],
  ],
};
