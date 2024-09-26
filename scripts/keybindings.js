import { MODULE_CLIENT_CONFIG, MODULE_CONFIG, updateSettings } from '../applications/settings.js';
import { GRID_MASK } from '../tactical-grid.js';
import { DistanceMeasurer } from './measurer.js';
import { MODULE_ID, cleanLayerName } from './utils.js';

export function registerKeybindings() {
  const toggleSceneGrid = async function () {
    if (canvas.scene) {
      let settingName = `${cleanLayerName(canvas.activeLayer)}Enabled`;
      let val = canvas.scene.getFlag(MODULE_ID, settingName);
      if (val != null && !val) {
        await canvas.scene.unsetFlag(MODULE_ID, settingName);
        ui.notifications.info(`Tactical Grid: Scene Setting REMOVED { ${settingName} }`);
      } else {
        await canvas.scene.setFlag(MODULE_ID, settingName, !val);
        ui.notifications.info(`Tactical Grid: Scene Setting ADDED { ${settingName} = ${val ? 'False' : 'True'} }`);
      }
    }
  };

  let lastPress;
  game.keybindings.register(MODULE_ID, 'toggleGrid', {
    name: game.i18n.localize(`${MODULE_ID}.keybindings.toggleGrid.name`),
    hint: game.i18n.localize(`${MODULE_ID}.keybindings.toggleGrid.hint`),
    editable: [
      {
        key: 'KeyG',
        modifiers: [],
      },
    ],
    onUp: async () => {
      if (lastPress) {
        const diff = new Date().getTime() - lastPress;
        lastPress = null;
        if (diff < 1200) {
          try {
            let layerName = cleanLayerName(canvas.activeLayer);
            let layerEnabled = {};
            let val = MODULE_CONFIG.layerEnabled[layerName];
            layerEnabled[layerName] = !val;
            updateSettings({ layerEnabled });
          } catch (e) {}
        } else {
          toggleSceneGrid();
        }
        GRID_MASK.container?.drawMask();
      }
    },
    onDown: () => {
      lastPress = new Date().getTime();
    },
    restricted: true,
    precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL,
  });

  game.keybindings.register(MODULE_ID, 'sceneToggleGrid', {
    name: game.i18n.localize(`${MODULE_ID}.keybindings.sceneToggleGrid.name`),
    hint: game.i18n.localize(`${MODULE_ID}.keybindings.sceneToggleGrid.hint`),
    editable: [
      {
        key: 'KeyG',
        modifiers: ['Shift'],
      },
    ],
    onDown: () => {
      toggleSceneGrid();
    },
    restricted: true,
    precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL,
  });

  game.keybindings.register(MODULE_ID, 'displayDistanceGridSpacing', {
    name: 'Display Distances (Grid Spacing)',
    hint: '',
    editable: [
      {
        key: 'KeyH',
        modifiers: [],
      },
    ],
    onUp: () => {
      DistanceMeasurer.keyPressed = false;
      DistanceMeasurer.hideMeasures();
    },
    onDown: (event) => {
      DistanceMeasurer.keyPressed = true;
      DistanceMeasurer.showMeasures();
    },
    restricted: false,
    precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL,
  });

  game.keybindings.register(MODULE_ID, 'displayDistance', {
    name: 'Display Distances',
    hint: '',
    editable: [
      {
        key: 'KeyH',
        modifiers: ['Shift'],
      },
    ],
    onUp: () => {
      DistanceMeasurer.keyPressed = false;
      DistanceMeasurer.hideMeasures();
    },
    onDown: () => {
      DistanceMeasurer.keyPressed = true;
      DistanceMeasurer.showMeasures({ gridSpaces: false });
    },
    restricted: false,
    precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL,
  });

  game.keybindings.register(MODULE_ID, 'toggleRangeHighlighting', {
    name: 'Toggle Range Highlighter',
    hint: '',
    editable: [],
    onUp: () => {
      game.settings.set(MODULE_ID, 'rangeHighlighter', !MODULE_CLIENT_CONFIG.rangeHighlighter);
    },
    restricted: false,
    precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL,
  });
}
