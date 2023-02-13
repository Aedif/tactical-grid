let DEFAULT_VIEW_LENGTH = 4;
let DEFAULT_VIEW_SHAPE = 'circle';
let TACTICAL_GRID_ENABLED = true;
let ENABLE_IN_COMBAT_ONLY = false;

Hooks.on('init', () => {
  game.settings.register('aedifs-tactical-grid', 'tacticalGridCombatOnly', {
    name: game.i18n.localize('aedifs-tactical-grid.settings.tacticalGridCombatOnly.name'),
    hint: game.i18n.localize('aedifs-tactical-grid.settings.tacticalGridCombatOnly.hint'),
    scope: 'world',
    config: true,
    type: Boolean,
    default: ENABLE_IN_COMBAT_ONLY,
    onChange: async (val) => {
      ENABLE_IN_COMBAT_ONLY = val;
      drawMask();
    },
  });
  ENABLE_IN_COMBAT_ONLY = game.settings.get('aedifs-tactical-grid', 'tacticalGridCombatOnly');

  game.settings.register('aedifs-tactical-grid', 'defaultViewDistance', {
    name: game.i18n.localize('aedifs-tactical-grid.settings.defaultViewDistance.name'),
    hint: game.i18n.localize('aedifs-tactical-grid.settings.defaultViewDistance.hint'),
    scope: 'world',
    config: true,
    type: Number,
    default: DEFAULT_VIEW_LENGTH,
    onChange: async (val) => {
      DEFAULT_VIEW_LENGTH = val ? val : 0;
    },
  });
  DEFAULT_VIEW_LENGTH = game.settings.get('aedifs-tactical-grid', 'defaultViewDistance');

  game.settings.register('aedifs-tactical-grid', 'defaultViewShape', {
    name: game.i18n.localize('aedifs-tactical-grid.settings.defaultViewShape.name'),
    hint: game.i18n.localize('aedifs-tactical-grid.settings.defaultViewShape.hint'),
    scope: 'world',
    config: true,
    type: String,
    default: DEFAULT_VIEW_SHAPE,
    choices: {
      circle: 'aedifs-tactical-grid.common.circle',
      square: 'aedifs-tactical-grid.common.square',
      hexagonRow: 'aedifs-tactical-grid.common.hexagonRow',
      hexagonCol: 'aedifs-tactical-grid.common.hexagonCol',
    },
    onChange: async (val) => {
      DEFAULT_VIEW_SHAPE = val;
    },
  });
  DEFAULT_VIEW_SHAPE = game.settings.get('aedifs-tactical-grid', 'defaultViewShape');

  game.settings.register('aedifs-tactical-grid', 'tacticalGridEnabled', {
    scope: 'world',
    config: false,
    type: Boolean,
    default: true,
    onChange: async (val) => {
      TACTICAL_GRID_ENABLED = val;
      drawMask();
    },
  });
  TACTICAL_GRID_ENABLED = game.settings.get('aedifs-tactical-grid', 'tacticalGridEnabled');

  game.keybindings.register('aedifs-tactical-grid', 'toggleGrid', {
    name: game.i18n.localize('aedifs-tactical-grid.keybindings.toggleGrid.name'),
    hint: game.i18n.localize('aedifs-tactical-grid.keybindings.toggleGrid.hint'),
    editable: [],
    onDown: () => {
      let val = game.settings.get('aedifs-tactical-grid', 'tacticalGridEnabled');
      game.settings.set('aedifs-tactical-grid', 'tacticalGridEnabled', !val);
    },
    restricted: true,
    precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL,
  });
});

// Insert token specific viewDistance and viewShape flags
Hooks.on('renderTokenConfig', (tokenConfig) => {
  const viewDistance = tokenConfig.object.getFlag('aedifs-tactical-grid', 'viewDistance') ?? '';
  const viewShape = tokenConfig.object.getFlag('aedifs-tactical-grid', 'viewShape') ?? '';

  const control = $(`
  <fieldset>
    <legend>Tactical Grid</legend>
    <div class="form-group slim">
      <label>View Distance <span class="units">(Grid spaces)</span></label>
      <div class="form-fields">
        <input type="number" value="${viewDistance}" step="any" name="flags.aedifs-tactical-grid.viewDistance">
      </div>
      <p class="notes">${game.i18n.localize(
        'aedifs-tactical-grid.settings.defaultViewDistance.hint'
      )}</p>
    </div>
    <div class="form-group">
      <label>View Shape</label>
      <div class="form-fields">
          <select name="flags.aedifs-tactical-grid.viewShape">
              <option value="" ${viewShape === '' ? 'selected' : ''}></option>
              <option value="circle" ${
                viewShape === 'circle' ? 'selected' : ''
              }>${game.i18n.localize('aedifs-tactical-grid.common.circle')}</option>
  <option value="square" ${viewShape === 'square' ? 'selected' : ''}>${game.i18n.localize(
    'aedifs-tactical-grid.common.square'
  )}</option>
  <option value="hexagonCol" ${viewShape === 'hexagonCol' ? 'selected' : ''}>${game.i18n.localize(
    'aedifs-tactical-grid.common.hexagonCol'
  )}</option>
  <option value="hexagonRow" ${viewShape === 'hexagonRow' ? 'selected' : ''}>${game.i18n.localize(
    'aedifs-tactical-grid.common.hexagonRow'
  )}</option>
          </select>
      </div>
      <p class="hint">${game.i18n.localize(
        'aedifs-tactical-grid.settings.defaultViewShape.hint'
      )}</p>
      </div>
  </fieldset>
    `);
  tokenConfig.activateListeners(control);

  $(tokenConfig.form).find('[name="sight.visionMode"]').closest('.form-group').after(control);
  tokenConfig.setPosition({ height: 'auto' });
});

// Canvas grid
let GRID = null;

Hooks.on('canvasReady', (canvas) => {
  if (!TACTICAL_GRID_ENABLED) return;
  GRID = canvas.grid.children.find((c) => c instanceof SquareGrid || c instanceof HexagonalGrid);
  GRID.visible = false;
});

Hooks.on('activateTokenLayer', () => {
  if (!TACTICAL_GRID_ENABLED) return;
  if (GRID) GRID.visible = false;
});

Hooks.on('deactivateTokenLayer', () => {
  if (!TACTICAL_GRID_ENABLED) return;
  if (GRID) GRID.visible = true;
});

Hooks.on('controlToken', () => {
  if (!TACTICAL_GRID_ENABLED) return;
  drawMask(canvas.tokens);
});

Hooks.on('deleteCombat', () => {
  drawMask();
});

Hooks.on('combatStart', () => {
  drawMask();
});

// Hooks.on('controlMeasuredTemplate', () => {
//   drawMask(canvas.templates);
// });

function destroyGridMask() {
  if (GRID.mask) {
    canvas.grid.removeChild(GRID.mask)?.destroy();
    GRID.mask = null;
  }
}

async function drawMask(layer = canvas.tokens) {
  destroyGridMask();
  if (!TACTICAL_GRID_ENABLED) {
    GRID.visible = true;
    return;
  }
  GRID.visible = false;

  if (ENABLE_IN_COMBAT_ONLY && !game.combat?.started) return;

  const allControlled = layer.placeables.filter((p) => p.controlled);
  if (allControlled.length === 0) return;

  let maskContainer = new PIXI.Container();
  for (const p of allControlled) {
    let viewDistance = p.document.getFlag('aedifs-tactical-grid', 'viewDistance');
    if (viewDistance == null) viewDistance = DEFAULT_VIEW_LENGTH;
    if (!viewDistance) continue;

    let viewShape = p.document.getFlag('aedifs-tactical-grid', 'viewShape') || DEFAULT_VIEW_SHAPE;

    let gridMask;

    let scale;
    let points;
    switch (viewShape) {
      case 'square':
        let length = viewDistance * canvas.grid.w * 2 + p.document.width * canvas.grid.w + 1;
        gridMask = new PIXI.Graphics().beginFill(0xff0000).drawRect(0, 0, length, length).endFill();
        break;
      case 'hexagonRow':
        scale = canvas.grid.w * viewDistance * 2;
        points = HexagonalGrid.pointyHexPoints.flat().map((v) => v * scale);
        gridMask = new PIXI.Graphics().beginFill(0xff0000).drawPolygon(points).endFill();
        break;
      case 'hexagonCol':
        scale = canvas.grid.w * viewDistance * 2;
        points = HexagonalGrid.flatHexPoints.flat().map((v) => v * scale);
        gridMask = new PIXI.Graphics().beginFill(0xff0000).drawPolygon(points).endFill();
        break;
      case 'circle':
      default:
        const radius = viewDistance * canvas.grid.w + (p.document.width * canvas.grid.w) / 2;
        gridMask = new PIXI.Graphics()
          .beginFill(0xff0000)
          .drawCircle(radius, radius, radius)
          .endFill();
    }
    gridMask = maskContainer.addChild(gridMask);
    gridMask.placeableId = p.id;
  }

  canvas.grid.addChild(maskContainer);

  GRID.mask = maskContainer;
  GRID.visible = true;

  for (const p of allControlled) {
    setGridMaskPosition(p);
  }
}

Hooks.on('refreshToken', (token) => {
  if (TACTICAL_GRID_ENABLED && GRID?.mask) {
    setGridMaskPosition(token);
  }
});

function setGridMaskPosition(placeable) {
  const shapeMask = GRID.mask?.children.find((c) => c.placeableId === placeable.id);
  if (shapeMask) {
    const { x, y } = placeable.center;
    shapeMask.position.set(x - shapeMask.width / 2, y - shapeMask.height / 2);
  }
}
