import { MODULE_CONFIG, updateSettings } from '../applications/settings.js';
import { GRID_MASK } from '../tactical-grid.js';
import { DistanceMeasurer } from './measurer.js';
import { cleanLayerName } from './utils.js';

export function registerKeybindings() {
  const toggleSceneGrid = async function () {
    if (canvas.scene) {
      let settingName = `${cleanLayerName(canvas.activeLayer)}Enabled`;
      let val = canvas.scene.getFlag('aedifs-tactical-grid', settingName);
      if (val != null && !val) {
        await canvas.scene.unsetFlag('aedifs-tactical-grid', settingName);
        ui.notifications.info(`Tactical Grid: Scene Setting REMOVED { ${settingName} }`);
      } else {
        await canvas.scene.setFlag('aedifs-tactical-grid', settingName, !val);
        ui.notifications.info(
          `Tactical Grid: Scene Setting ADDED { ${settingName} = ${val ? 'False' : 'True'} }`
        );
      }
    }
  };

  let lastPress;
  game.keybindings.register('aedifs-tactical-grid', 'toggleGrid', {
    name: game.i18n.localize('aedifs-tactical-grid.keybindings.toggleGrid.name'),
    hint: game.i18n.localize('aedifs-tactical-grid.keybindings.toggleGrid.hint'),
    editable: [],
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

  game.keybindings.register('aedifs-tactical-grid', 'sceneToggleGrid', {
    name: game.i18n.localize('aedifs-tactical-grid.keybindings.sceneToggleGrid.name'),
    hint: game.i18n.localize('aedifs-tactical-grid.keybindings.sceneToggleGrid.hint'),
    editable: [],
    onDown: () => {
      toggleSceneGrid();
    },
    restricted: true,
    precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL,
  });

  game.keybindings.register('aedifs-tactical-grid', 'displayDistanceGridSpacing', {
    name: 'Display Distances (Grid Spacing)',
    hint: '',
    editable: [],
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

  game.keybindings.register('aedifs-tactical-grid', 'displayDistance', {
    name: 'Display Distances',
    hint: '',
    editable: [],
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
}
