let GRID = null;

let GRID_MASK = null;

Hooks.on('canvasReady', () => {
  GRID = canvas.grid.children.find((c) => c instanceof SquareGrid || c instanceof HexagonalGrid);
});

Hooks.on('controlToken', (token, controlled) => {
  onControlToken(token, controlled);
});

function destroyGridMask() {
  if (GRID_MASK) {
    const grid = canvas.grid.children.find(
      (c) => c instanceof SquareGrid || c instanceof HexagonalGrid
    );
    grid.mask = null;
    // canvas.primary.removeChild(GRID_MASK)
    console.log('removing from primary', canvas.primary.removeChild(GRID_MASK));
    GRID_MASK = null;
  }
}

function onControlToken(token, controlled) {
  console.log('Control', token, controlled);
  if (!controlled && GRID_MASK && GRID_MASK.tokenId === token.id) {
    destroyGridMask();
    return;
  } else if (!controlled) {
    return;
  }

  destroyGridMask();

  const grid = canvas.grid.children.find(
    (c) => c instanceof SquareGrid || c instanceof HexagonalGrid
  );

  // Inner radius of the circle
  const radius = 300;

  // The blur amount
  const blurSize = 32;

  const circle = new PIXI.Graphics()
    .beginFill(0xff0000)
    .drawCircle(radius + blurSize, radius + blurSize, radius)
    .endFill();
  circle.filters = [new PIXI.filters.BlurFilter(blurSize)];

  const bounds = new PIXI.Rectangle(0, 0, (radius + blurSize) * 2, (radius + blurSize) * 2);
  const texture = canvas.app.renderer.generateTexture(circle, PIXI.SCALE_MODES.NEAREST, 1, bounds);
  GRID_MASK = new PIXI.Sprite(texture);

  let tempContainer = new PIXI.Container();
  tempContainer.addChild(GRID_MASK);
  GRID_MASK = tempContainer;

  setGridMaskPosition(token);

  canvas.primary.addChild(GRID_MASK);
  GRID_MASK.tokenId = token.id;

  grid.mask = GRID_MASK;
}

Hooks.on('refreshToken', (token) => {
  if (GRID_MASK && GRID_MASK.tokenId === token.id) {
    setGridMaskPosition(token);
  }
});

function setGridMaskPosition(token) {
  const { x, y } = token.center;
  GRID_MASK.position.set(x - GRID_MASK.width / 2, y - GRID_MASK.height / 2);
}
