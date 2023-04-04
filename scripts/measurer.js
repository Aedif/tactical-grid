import { MODULE_CONFIG } from '../applications/settings.js';

export let TEXT_STYLE;

export class DistanceMeasurer {
  static hlName = 'ATG';
  static shape;
  static gridSpaces = true;
  static positions = [];

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
      DistanceMeasurer.setPosition({ x: ruler.destination.x, y: ruler.destination.y });
    } else if (canvas.tokens.hover?.x) {
      DistanceMeasurer.setPosition({
        x: canvas.tokens.hover.center.x,
        y: canvas.tokens.hover.center.y,
      });
    } else if (canvas.tokens.controlled.length === 1) {
      let controlled = canvas.tokens.controlled[0];
      DistanceMeasurer.setPosition({ x: controlled.center.x, y: controlled.center.y });
    }

    DistanceMeasurer.drawLabels();
  }

  static hideMeasures() {
    DistanceMeasurer.deleteLabels();
    DistanceMeasurer.positions = [];
    canvas.grid.destroyHighlightLayer(DistanceMeasurer.hlName);
  }

  static setPosition(pos) {
    const [x, y] = canvas.grid.grid.getTopLeft(pos.x, pos.y);
    DistanceMeasurer.positions = [{ x, y }];
    DistanceMeasurer.highlightPosition(x, y);
  }

  static clearHighlight() {
    canvas.grid.clearHighlightLayer(DistanceMeasurer.hlName);
  }

  static highlightPosition(x, y) {
    DistanceMeasurer.clearHighlight();
    const layer = canvas.grid.highlightLayers[DistanceMeasurer.hlName];
    if (!layer) return;

    let options = {
      x,
      y,
      ...MODULE_CONFIG.marker,
    };

    if (!(canvas.grid.grid instanceof SquareGrid || canvas.grid.grid instanceof HexagonalGrid)) {
      let rSize = 50;
      options.shape = new PIXI.Rectangle(x - rSize / 2, y - rSize / 2, rSize, rSize);
    }

    canvas.grid.grid.highlightGridPosition(layer, options);
  }

  static drawLabels() {
    DistanceMeasurer.deleteLabels();
    if (!DistanceMeasurer.positions.length) return;

    let pos = DistanceMeasurer.positions[0];
    const origin = {
      x: pos.x + canvas.grid.size / 2,
      y: pos.y + canvas.grid.size / 2,
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
      if (MODULE_CONFIG.measurement.centerOnly) {
        const distanceLabel = DistanceMeasurer._getDistanceLabel(origin, token.center, token, {
          gridSpaces: DistanceMeasurer.gridSpaces,
          originToken,
        });
        DistanceMeasurer.addUpdateLabel(token, token.w / 2, token.h / 2, distanceLabel);
        continue;
      }

      if (
        canvas.grid.grid instanceof HexagonalGrid &&
        token.document.width == token.document.height
      ) {
        const offsets = _getHexOffsets(token);
        if (offsets) {
          for (const offset of offsets) {
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
          continue;
        }
      }

      // Fallback on square grid
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
    if (canvas.grid.highlightLayers[DistanceMeasurer.hlName]) {
      DistanceMeasurer.setPosition(pos);
      DistanceMeasurer.drawLabels();
    }
  }

  static _getDistanceLabel(origin, target, targetToken, options) {
    let distance;
    // If the tokens have elevation we want to create a faux target coordinate in 2d space
    // so that we can then let foundry utils calculate the appropriate distance based on diagonal rules
    let originElevation = options.originToken ? options.originToken.document.elevation : 0;
    let verticalDistance =
      (canvas.grid.size / canvas.dimensions.distance) *
      Math.abs(targetToken.document.elevation - originElevation);
    if (!MODULE_CONFIG.measurement.includeElevation) verticalDistance = 0;
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

// =======================================
// "Hex token size support" module support
// =======================================

// Additional offsets for size 5 tokens
const OFFSET_EXTENSION = {
  FLAT: {
    5: [
      [0.1, 0.3],
      [0.1, 0.5],
      [0.1, 0.7],
      [0.3, 0.2],
      [0.3, 0.4],
      [0.3, 0.6],
      [0.3, 0.8],
      [0.5, 0.1],
      [0.5, 0.3],
      [0.5, 0.5],
      [0.5, 0.7],
      [0.5, 0.9],
      [0.7, 0.2],
      [0.7, 0.4],
      [0.7, 0.6],
      [0.7, 0.8],
      [0.9, 0.3],
      [0.9, 0.5],
      [0.9, 0.7],
    ],
  },
  POINTY: {
    5: [
      [0.3, 0.1],
      [0.5, 0.1],
      [0.7, 0.1],
      [0.2, 0.3],
      [0.4, 0.3],
      [0.6, 0.3],
      [0.8, 0.3],
      [0.1, 0.5],
      [0.3, 0.5],
      [0.5, 0.5],
      [0.7, 0.5],
      [0.9, 0.5],
      [0.2, 0.7],
      [0.4, 0.7],
      [0.6, 0.7],
      [0.8, 0.7],
      [0.3, 0.9],
      [0.5, 0.9],
      [0.7, 0.9],
    ],
  },
};

function _getHexOffsets(token) {
  let offsets = canvas.grid.grid.columnar ? FLAT_HEX_OFFSETS : POINTY_HEX_OFFSETS;

  if (!game.modules.get('hex-size-support')?.active) return offsets[token.document.width];

  // If "Hex token size support" module is active we need to extend the offsets to include size 5
  offsets = {
    ...offsets,
    ...(canvas.grid.grid.columnar ? OFFSET_EXTENSION.FLAT : OFFSET_EXTENSION.POINTY),
  };

  // Flip size 2 hexes
  offsets[2] = offsets[2].map((o) =>
    canvas.grid.grid.columnar ? [1 - o[0], o[1]] : [o[0], 1 - o[1]]
  );

  offsets = offsets[token.document.width];

  // We may need to flip the offsets based on whether alt orientation is enabled
  if (
    offsets &&
    !!(
      game.settings.get('hex-size-support', 'altOrientationDefault') ^
      (token.document.getFlag('hex-size-support', 'alternateOrientation') ?? false)
    )
  ) {
    if (canvas.grid.grid.columnar) return offsets.map((o) => [1 - o[0], o[1]]);
    else return offsets.map((o) => [o[0], 1 - o[1]]);
  }

  return offsets;
}
