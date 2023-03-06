import { GridMaskContainer } from './scripts/container.js';
import {
  cleanLayerName,
  EMBEDS_AND_LAYERS,
  registerGridWrappers,
  unregisterGridWrappers,
} from './scripts/utils.js';
import { MODULE_CONFIG, registerSettings } from './applications/settings.js';
import { registerKeybindings } from './scripts/keybindings.js';

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
  registerSettings();
  registerKeybindings();
});

/** =========================
 *  Initialize mask container
 *  =========================
 */
Hooks.on('canvasReady', (canvas) => {
  if (!GRID_MASK.container) {
    GRID_MASK.container = new GridMaskContainer();
    GRID_MASK.container.blendMode = PIXI.BLEND_MODES.ADD;
  }
  GRID_MASK.container.onCanvasReady();
  game.GRID_MASK = GRID_MASK;
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
      if (!MODULE_CONFIG.layerEnabled[cleanLayerName(layer)]) return;
      GRID_MASK.container?.drawMask(layer);
    });
    layerHooks.push([fnName, id]);
  }
  for (const fnName of setPositionFunctionNames) {
    let id = Hooks.on(fnName, (placeable) => {
      if (MODULE_CONFIG.layerEnabled[cleanLayerName(placeable.layer)]) {
        GRID_MASK.container?.setMaskPosition(placeable);
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

Hooks.on('canvasInit', (canvas) => {
  let tacticalLineWidth = canvas.scene.getFlag('aedifs-tactical-grid', 'gridLineWidth');
  if (tacticalLineWidth && tacticalLineWidth > 1) {
    registerGridWrappers(tacticalLineWidth);
  } else {
    unregisterGridWrappers();
  }
});
