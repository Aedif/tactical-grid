import { GridMaskContainer } from './scripts/container.js';
import { MODULE_ID, cleanLayerName, registerGridWrappers, unregisterGridWrappers } from './scripts/utils.js';
import { MODULE_CONFIG, registerRulerLibWrapperMethods, registerSettings } from './applications/settings.js';
import { registerKeybindings } from './scripts/keybindings.js';
import { RangeHighlightAPI, registerRangeHighlightHooks } from './scripts/rangeHighlighter.js';
import { registerBroadcasts } from './scripts/measurer.js';

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
  registerRangeHighlightHooks();
  registerBroadcasts();

  globalThis.TacticalGrid = {
    rangeHighlight: RangeHighlightAPI.rangeHighlight,
    clearRangeHighlight: RangeHighlightAPI.clearRangeHighlight,
  };

  game.modules.get(MODULE_ID).api = globalThis.TacticalGrid;
  CONFIG.debug.atg = false;
});

/** =========================
 *  Initialize mask container
 *  =========================
 */
Hooks.on('canvasReady', (canvas) => {
  if (!GRID_MASK.container) {
    GRID_MASK.container = new GridMaskContainer();
    GRID_MASK.container.blendMode = PIXI.BLEND_MODES.ADD;

    /** ========================
     *  Handle Layer Activations
     *  ========================
     */
    canvas.layers
      .filter((l) => l instanceof PlaceablesLayer)
      .forEach((layer) => {
        const layerName = cleanLayerName(layer);
        Hooks.on(`activate${layerName}`, (layer) => {
          registerLayerHooks(layer);
        });
      });
    // Need to register hooks outside of `activate` as by this point we will have missed the first activation
    if (canvas.activeLayer instanceof PlaceablesLayer) registerLayerHooks(canvas.activeLayer);
  }
  GRID_MASK.container.onCanvasReady();
  game.GRID_MASK = GRID_MASK;
});

let LAYER_HOOKS = [];

function unregisterLayerHooks() {
  for (const [name, id] of LAYER_HOOKS) {
    Hooks.off(name, id);
  }
  LAYER_HOOKS = [];
}

function registerLayerHooks(layer) {
  unregisterLayerHooks();

  const embedName = layer.constructor.documentName;
  const drawMaskFunctionNames = [`control${embedName}`, `hover${embedName}`, `destroy${embedName}`];
  for (const fnName of drawMaskFunctionNames) {
    let id = Hooks.on(fnName, () => {
      if (!MODULE_CONFIG.layerEnabled[cleanLayerName(layer)]) return;
      GRID_MASK.container?.drawMask(layer);
    });
    LAYER_HOOKS.push([fnName, id]);
  }

  const setPositionFunctionNames = [`refresh${embedName}`];
  for (const fnName of setPositionFunctionNames) {
    let id = Hooks.on(fnName, (placeable) => {
      if (MODULE_CONFIG.layerEnabled[cleanLayerName(placeable.layer)]) {
        GRID_MASK.container?.setMaskPosition(placeable);
      }
    });
    LAYER_HOOKS.push([fnName, id]);
  }
  GRID_MASK.container?.drawMask();
}

/** ===============================
 *  Draw masks in response to hooks
 *  ===============================
 */
Hooks.on('deleteCombat', () => {
  GRID_MASK.container?.drawMask();
  for (const t of canvas.tokens.placeables) {
    TacticalGrid.clearRangeHighlight(t);
  }
});

Hooks.on('combatStart', () => {
  GRID_MASK.container?.drawMask();
});

Hooks.on('highlightObjects', () => {
  GRID_MASK.container?.drawMask();
});

Hooks.on('canvasInit', (canvas) => {
  if (foundry.utils.isNewerVersion(12, game.version)) {
    let tacticalLineWidth = canvas.scene.getFlag(MODULE_ID, 'gridLineWidth');
    if (tacticalLineWidth && tacticalLineWidth > 1) {
      registerGridWrappers(tacticalLineWidth);
    } else {
      unregisterGridWrappers();
    }
  }
});

// Support for 'Drag Ruler' module
// Re-register the ruler hooks to use the extended ruler class
Hooks.once('dragRuler.ready', () => {
  registerRulerLibWrapperMethods();
});
