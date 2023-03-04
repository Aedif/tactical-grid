export class DistanceMeasurer {
  static hlName = 'ATG';
  static shape;
  static isPressed = false;

  static onTriggerKeyDown() {
    DistanceMeasurer.isPressed = true;

    if (!canvas.grid.highlightLayers[DistanceMeasurer.hlName]) {
      canvas.grid.addHighlightLayer(DistanceMeasurer.hlName);
    }

    if (canvas.tokens.controlled.length === 1) {
      let controlled = canvas.tokens.controlled[0];
      DistanceMeasurer.highlightPosition({ x: controlled.x, y: controlled.y });
    }

    DistanceMeasurer.drawLabels();
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
      alpha: 1.0,
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

    let controlledToken;
    if (canvas.tokens.controlled.length === 1) {
      controlledToken = canvas.tokens.controlled[0];
    }

    const visibleTokens = canvas.tokens.placeables.filter(
      (p) => p.visible && p.id !== controlledToken?.id
    );
    for (const token of visibleTokens) {
      for (let h = 0; h < token.h / canvas.grid.size; h++) {
        for (let w = 0; w < token.w / canvas.grid.size; w++) {
          const offsetY = canvas.grid.size * h + canvas.grid.size / 2;
          const offsetX = canvas.grid.size * w + canvas.grid.size / 2;
          const target = {
            x: token.x + offsetX,
            y: token.y + offsetY,
          };
          const distanceLabel = DistanceMeasurer._getDistanceLabel(origin, target, token, {
            gridSpaces: true,
            originToken: controlledToken,
          });
          let pText = new PreciseText(distanceLabel, CONFIG.canvasTextStyle);
          pText.anchor.set(0.5);
          pText = token.addChild(pText);
          pText.atgText = true;
          pText.x = offsetX;
          pText.y = offsetY;
        }
      }
    }
  }

  static deleteLabels() {
    canvas.tokens.placeables.forEach((p) => {
      p.children.filter((ch) => ch.atgText).forEach((ch) => p.removeChild(ch)?.destroy());
    });
  }

  static onTriggerKeyUp() {
    DistanceMeasurer.isPressed = false;
    DistanceMeasurer.deleteLabels();
    canvas.grid.destroyHighlightLayer(DistanceMeasurer.hlName);
  }

  // _getGridHighlightPositions

  static clickLeft(pos) {
    DistanceMeasurer.highlightPosition(pos);
    DistanceMeasurer.drawLabels();
    // if (!DistanceMeasurer.shape) {
    //   DistanceMeasurer.shape = new PIXI.Rectangle(
    //     0,
    //     0,
    //     canvas.grid.size,
    //     canvas.grid.size
    //   ).normalize();
    // }
  }

  static _getDistanceLabel(origin, target, targetToken, options) {
    const units = canvas.scene.grid.units;
    let distance = canvas.grid.measureDistance(origin, target, options);
    if (options.originToken) {
      const originToken = options.originToken;
      if (options.gridSpaces) {
        distance +=
          Math.round(
            Math.abs(originToken.document.elevation - targetToken.document.elevation) /
              canvas.dimensions.distance
          ) * canvas.dimensions.distance;
      } else {
        distance += Math.round(
          Math.abs(originToken.document.elevation - targetToken.document.elevation)
        );
      }
    }
    // distance += Math.abs(originToken.document.elevation - targetToken.document.elevation);
    return `${Math.round(distance)} ${units}`;
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
