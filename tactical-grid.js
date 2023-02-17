import { GridMaskContainer } from './container.js';
import { EMBEDS_AND_LAYERS, init, MODULE_CONFIG } from './settings.js';

let layerHooks = [];

// Container used as Grid Mask
export const GRID_MASK = {
  container: null,
};

/** =================================
 *  Register Settings and Keybindings
 *  =================================
 */
Hooks.on('init', () => {
  init();
});

/** =========================
 *  Initialize mask container
 *  =========================
 */
Hooks.on('canvasReady', (canvas) => {
  if (!GRID_MASK.container) {
    GRID_MASK.container = new GridMaskContainer();
  }
  GRID_MASK.container.onCanvasReady();
});

/** ========================
 *  Handle Layer Activations
 *  ========================
 */
for (const [embedName, layerName] of EMBEDS_AND_LAYERS) {
  Hooks.on(`activate${layerName}`, (layer) => {
    registerLayerHooks(
      layer,
      [`control${embedName}`, `hover${embedName}`, `destroy${embedName}`],
      [`refresh${embedName}`]
    );

    if (MODULE_CONFIG[`${layer.name}Enabled`]) {
      GRID_MASK.container?.activateMask();
    } else {
      GRID_MASK.container?.deactivateMask();
    }
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
      if (MODULE_CONFIG[`${placeable.layer.name}Enabled`]) {
        GRID_MASK.container.setMaskPosition(placeable);
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
  GRID_MASK.container?.drawMask();
});

Hooks.on('combatStart', () => {
  GRID_MASK.container?.drawMask();
});

Hooks.on('highlightObjects', () => {
  GRID_MASK.container?.drawMask();
});
