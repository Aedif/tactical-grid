// Canvas grid
let GRID = null;

// Texturen used to apply masks
let maskTexture = null;

Hooks.on('canvasReady', (canvas) => {
  GRID = canvas.grid.children.find((c) => c instanceof SquareGrid || c instanceof HexagonalGrid);
});

Hooks.on('controlToken', (token, controlled) => {
  onControlToken(token, controlled);
});

function destroyGridMask() {
  if (GRID.mask) {
    canvas.primary.removeChild(GRID.mask)?.destroy();
    GRID.mask = null;
  }
}

function onControlToken(token, controlled) {
  if (!controlled && GRID.mask && GRID.mask.tokenId === token.id) {
    destroyGridMask();
    return;
  } else if (!controlled) {
    return;
  }

  destroyGridMask();

  const allControlled = canvas.tokens.placeables.filter((p) => p.controlled);
  if (allControlled.length === 0) return;

  if (!maskTexture) {
    const radius = 300;
    const blurSize = 32;

    const circle = new PIXI.Graphics()
      .beginFill(0xff0000)
      .drawCircle(radius + blurSize, radius + blurSize, radius)
      .endFill();
    circle.filters = [new PIXI.filters.BlurFilter(blurSize)];

    const bounds = new PIXI.Rectangle(0, 0, (radius + blurSize) * 2, (radius + blurSize) * 2);
    maskTexture = canvas.app.renderer.generateTexture(circle, PIXI.SCALE_MODES.NEAREST, 1, bounds);
  }

  let maskContainer = new PIXI.Container();
  for (const p of allControlled) {
    let gridMask = new PIXI.Sprite(maskTexture);
    gridMask = maskContainer.addChild(gridMask);
    gridMask.placeableId = p.id;
  }

  canvas.primary.addChild(maskContainer);

  GRID.mask = maskContainer;
  console.log(GRID);
  for (const p of allControlled) {
    setGridMaskPosition(p);
  }
}

Hooks.on('refreshToken', (token) => {
  if (GRID?.mask) {
    setGridMaskPosition(token);
  }
});

function setGridMaskPosition(placeable) {
  const sprite = GRID.mask?.children.find((c) => c.placeableId === placeable.id);
  if (sprite) {
    const { x, y } = placeable.center;
    sprite.position.set(x - sprite.width / 2, y - sprite.height / 2);
  }
}
