// Config
let DEFAULT_VIEW_LENGTH = 4;
let DEFAULT_VIEW_SHAPE = 'circle-soft';
let TACTICAL_GRID_ENABLED = true;
let ENABLE_IN_COMBAT_ONLY = false;

// Sprites/Graphics used as a mask
let GRID_MASK;
let GRID_MASK_GROUP;

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

  let options = getShapeOptions();
  game.settings.register('aedifs-tactical-grid', 'defaultViewShape', {
    name: game.i18n.localize('aedifs-tactical-grid.settings.defaultViewShape.name'),
    hint: game.i18n.localize('aedifs-tactical-grid.settings.defaultViewShape.hint'),
    scope: 'world',
    config: true,
    type: String,
    default: DEFAULT_VIEW_SHAPE,
    choices: options,
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

  let shapeOptions = getShapeOptions();
  let options = '<option value=""></option>';
  for (const [k, v] of Object.entries(shapeOptions)) {
    options += `<option value="${k}" ${viewShape === k ? 'selected' : ''}>${v}</option>`;
  }

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
            ${options}
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

function getShapeOptions() {
  let options = {
    circle: 'Circle',
    'circle-soft': 'Circle (Soft)',
    square: 'Square',
    'square-soft': 'Square (Soft)',
    hexagonRow: 'Hexagon (Row)',
    hexagonCol: 'Hexagon (Column)',
  };
  return options;
}

// Canvas grid
let GRID = null;

Hooks.on('canvasReady', (canvas) => {
  if (!TACTICAL_GRID_ENABLED) return;

  GRID_MASK = new PIXI.Sprite();
  GRID_MASK_GROUP = new CachedContainer(GRID_MASK);
  GRID_MASK_GROUP.renderable = true;

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

Hooks.on('hoverToken', (token, hoverIn) => {
  drawMask();
});

Hooks.on('highlightObjects', () => {
  drawMask();
});

// Hooks.on('controlMeasuredTemplate', () => {
//   drawMask(canvas.templates);
// });

function destroyGridMask() {
  if (GRID?.mask) {
    GRID_MASK_GROUP.removeChildren();
    canvas.primary.removeChild(GRID_MASK_GROUP);
    GRID.mask = null;
  }
}

async function drawMask(layer = canvas.tokens) {
  if (!GRID) return;
  destroyGridMask();
  if (!TACTICAL_GRID_ENABLED) {
    GRID.visible = true;
    return;
  }
  GRID.visible = false;

  if (ENABLE_IN_COMBAT_ONLY && !game.combat?.started) return;

  const allControlled = layer.placeables.filter((p) => p.controlled || p.hover);
  if (allControlled.length === 0) return;

  for (const p of allControlled) {
    let viewDistance = p.document.getFlag('aedifs-tactical-grid', 'viewDistance');
    if (viewDistance == null) viewDistance = DEFAULT_VIEW_LENGTH;
    if (!viewDistance) continue;

    let viewShape = p.document.getFlag('aedifs-tactical-grid', 'viewShape') || DEFAULT_VIEW_SHAPE;

    let sprite;
    switch (viewShape) {
      case 'square':
        let length = viewDistance * canvas.grid.w * 2 + p.document.width * canvas.grid.w + 1;
        sprite = new PIXI.Graphics().beginFill(0xff0000).drawRect(0, 0, length, length).endFill();
        break;
      case 'square-soft':
        sprite = PIXI.Sprite.from('modules\\aedifs-tactical-grid\\images\\square_mask.png');
        break;
      case 'hexagonRow':
        scale = canvas.grid.w * viewDistance * 2;
        let pointsRow = HexagonalGrid.pointyHexPoints
          .flat()
          .map((v) => v * canvas.grid.w * viewDistance * 2);
        sprite = new PIXI.Graphics().beginFill(0xff0000).drawPolygon(pointsRow).endFill();
        break;
      case 'hexagonCol':
        let pointsCol = HexagonalGrid.flatHexPoints
          .flat()
          .map((v) => v * canvas.grid.w * viewDistance * 2);
        sprite = new PIXI.Graphics().beginFill(0xff0000).drawPolygon(pointsCol).endFill();
        break;
      case 'circle-soft':
        sprite = PIXI.Sprite.from('modules\\aedifs-tactical-grid\\images\\circle_mask.png');
        break;
      case 'circle':
      default:
        const radius = viewDistance * canvas.grid.w + (p.document.width * canvas.grid.w) / 2;
        sprite = new PIXI.Graphics()
          .beginFill(0xff0000)
          .drawCircle(radius, radius, radius)
          .endFill();
    }

    if (sprite instanceof PIXI.Sprite) {
      const size = (viewDistance + 1) * canvas.grid.w * 2 + p.document.width * canvas.grid.w;
      sprite.width = size;
      sprite.height = size;
    }

    sprite = GRID_MASK_GROUP.addChild(sprite);
    sprite.placeableId = p.id;
  }

  canvas.primary.addChild(GRID_MASK_GROUP);

  GRID.mask = GRID_MASK;
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
  const shapeMask = GRID_MASK_GROUP?.children.find((c) => c.placeableId === placeable.id);
  if (shapeMask) {
    const { x, y } = placeable.center;
    shapeMask.position.set(x - shapeMask.width / 2, y - shapeMask.height / 2);
  }
}
