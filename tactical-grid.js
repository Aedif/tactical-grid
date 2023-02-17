import { GridMaskContainer } from './container.js';
import { EMBEDS_AND_LAYERS, init, MODULE_CONFIG } from './settings.js';

let layerHooks = [];

// Canvas grid
let GRID = null;

// Sprite and Container used as Grid Mask
export const GRID_MASK = {
  sprite: new PIXI.Sprite(),
  container: null,
};

/** =================================
 *  Register Settings and keybindings
 *  =================================
 */

Hooks.on('init', () => {
  init();
});

/** =============================================
 *  Initialize mask containers and find the grid
 *  =============================================
 */
Hooks.on('canvasReady', (canvas) => {
  console.log('CANVAS READY CALLED');
  if (!GRID_MASK.container) {
    GRID_MASK.container = new GridMaskContainer(GRID_MASK.sprite);
  }
  GRID_MASK.container.onCanvasReady();

  GRID = canvas.grid.children.find((c) => c instanceof SquareGrid || c instanceof HexagonalGrid);

  if (MODULE_CONFIG[`${canvas.activeLayer.name}Enabled`]) GRID.visible = false;
});

// Handle layer activations
for (const [embedName, layerName] of EMBEDS_AND_LAYERS) {
  Hooks.on(`activate${layerName}`, (layer) => {
    GRID_MASK.container?.destroyGridMask();
    if (!MODULE_CONFIG[`${layer.name}Enabled`]) {
      if (GRID) GRID.visible = true;
    }
    registerLayerHooks(
      layer,
      [`control${embedName}`, `hover${embedName}`, `destroy${embedName}`],
      [`refresh${embedName}`]
    );
    GRID_MASK.container?.drawMask();
  });
}

function unregisterLayerHooks() {
  for (const [name, id] of layerHooks) {
    Hooks.off(name, id);
  }
  layerHooks = [];
}

function registerLayerHooks(layer, drawMaskFunctionNames = [], setPositionFunctionNames = []) {
  unregisterLayerHooks();
  for (const fnName of drawMaskFunctionNames) {
    let id = Hooks.on(fnName, () => {
      if (!MODULE_CONFIG[`${layer.name}Enabled`]) return;
      GRID_MASK.container.drawMask(layer);
    });
    layerHooks.push([fnName, id]);
  }
  for (const fnName of setPositionFunctionNames) {
    let id = Hooks.on(fnName, (placeable) => {
      if (MODULE_CONFIG[`${placeable.layer.name}Enabled`] && GRID?.mask) {
        GRID_MASK.container.setGridMaskPosition(placeable);
      }
    });
    layerHooks.push([fnName, id]);
  }
}

/** ===============================
 *  Draw masks in response to hooks
 *  ===============================
 */

Hooks.on('deleteCombat', () => {
  if (!MODULE_CONFIG[`${canvas.activeLayer.name}Enabled`]) return;
  GRID_MASK.container.drawMask();
});

Hooks.on('combatStart', () => {
  if (!MODULE_CONFIG[`${canvas.activeLayer.name}Enabled`]) return;
  GRID_MASK.container.drawMask();
});

Hooks.on('highlightObjects', () => {
  if (!MODULE_CONFIG[`${canvas.activeLayer.name}Enabled`]) return;
  GRID_MASK.container?.drawMask();
});
