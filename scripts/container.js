import { MODULE_CLIENT_CONFIG, MODULE_CONFIG } from '../applications/settings.js';
import { CustomSpriteMaskFilter } from '../filters/CustomSpriteMaskFilter.js';
import { MODULE_ID, cleanLayerName, getDispositionColor, getGridColorString } from './utils.js';

export class GridMaskContainer extends CachedContainer {
  /** @override */
  clearColor = [0, 0, 0, 0];

  constructor() {
    super(new PIXI.Sprite());
  }

  onCanvasReady() {
    this.destroyMask();

    if (foundry.utils.isNewerVersion(game.version, 12)) {
      this._grid = canvas.interface.grid?.mesh;
    } else {
      this._grid = canvas.grid.children.find((c) => c instanceof SquareGrid || c instanceof HexagonalGrid);
    }
    this.drawMask();
  }

  /**
   * Identifies the Tokens that masks need to be drawn for and
   * assigns them one
   */
  drawMask(layer = canvas.activeLayer) {
    if (!this._grid) {
      this.deactivateMask();
      return;
    }

    if (MODULE_CLIENT_CONFIG.disableTacticalGrid) return this.deactivateMask();

    let sceneEnabled = canvas.scene.getFlag(MODULE_ID, `${cleanLayerName(layer)}Enabled`);
    if (sceneEnabled != null && !sceneEnabled) return this.deactivateMask();
    if (sceneEnabled == null && !MODULE_CONFIG.layerEnabled[cleanLayerName(layer)]) return this.deactivateMask();

    this._grid.visible = false;

    if (MODULE_CONFIG.enableOnCombatOnly && !game.combat?.started) {
      this.destroyMask();
      return;
    }

    const applicableTokens = layer.placeables.filter(
      (p) =>
        (MODULE_CONFIG.enableOnControl && p.controlled) ||
        (MODULE_CONFIG.enableOnHover && (layer.highlightObjects || p.hover || hasPreview(p)))
    );

    if (MODULE_CONFIG.enableOnRuler && typeof libWrapper === 'function') {
      let ruler = canvas.controls.ruler;
      if (ruler && ruler._state !== Ruler.STATES.INACTIVE) {
        ruler.id = 'RULER';
        if (!ruler.center) {
          Object.defineProperty(ruler, 'center', {
            get: () => ruler.destination,
          });
          Object.defineProperty(ruler, 'document', {
            value: {
              getFlag: (_, flag) => {
                if (flag === 'viewDistance') return MODULE_CONFIG.rulerViewDistance;
                else if (flag === 'viewShape') return MODULE_CONFIG.rulerViewShape;
                else if (flag === 'color') return MODULE_CONFIG.rulerColor;
              },
            },
          });
        }
        applicableTokens.push(ruler);
      }
    }

    if (applicableTokens.length === 0) {
      this.destroyMask();
      return;
    }

    if (this.updateGridMask(applicableTokens)) {
      for (const p of applicableTokens) {
        this.setMaskPosition(p);
      }
      this._addMaskFilter();
      this._grid.visible = true;
    }
  }

  updateGridMask(placeables) {
    // Destroy sprites that are not in the placeable list
    this.children
      .filter((ch) => !placeables.find((p) => p.id === ch.placeableId))
      .forEach((ch) => this.removeChild(ch)?.destroy());

    for (const p of placeables) {
      if (this.children.find((c) => c.placeableId === p.id)) {
        // Do nothing
      } else {
        let viewDistance = this._getViewDistance(p);
        if (!viewDistance) continue;

        let viewShape = p.document?.getFlag(MODULE_ID, 'viewShape') || MODULE_CONFIG.defaultViewShape;

        const width = p.width;
        const height = p.height;

        let shapeColor = p.document?.getFlag(MODULE_ID, 'color');
        if (shapeColor) {
          shapeColor = Number(Color.fromString(shapeColor));
        } else if (MODULE_CONFIG.assignDispositionBasedColor && p.document?.hasOwnProperty('disposition')) {
          shapeColor = getDispositionColor(p);
        } else {
          shapeColor = Number(Color.fromString(getGridColorString()));
        }

        let sprite;
        switch (viewShape) {
          case 'square':
            let length = viewDistance * (canvas.grid.sizeX ?? canvas.grid.w) * 2 + width + 1;
            sprite = new PIXI.Graphics().beginFill(shapeColor).drawRect(0, 0, length, length).endFill();
            break;
          case 'square-soft':
            sprite = PIXI.Sprite.from(`modules\\${MODULE_ID}\\images\\square_mask.webp`);
            break;
          case 'hexagonRow':
            let pointsRow = HexagonalGrid.pointyHexPoints
              .flat()
              .map((v) => v * (canvas.grid.sizeX ?? canvas.grid.w) * viewDistance * 2);
            sprite = new PIXI.Graphics().beginFill(shapeColor).drawPolygon(pointsRow).endFill();
            break;
          case 'hexagonCol':
            let pointsCol = HexagonalGrid.flatHexPoints
              .flat()
              .map((v) => v * (canvas.grid.sizeX ?? canvas.grid.w) * viewDistance * 2);
            sprite = new PIXI.Graphics().beginFill(shapeColor).drawPolygon(pointsCol).endFill();
            break;
          case 'circle-soft':
            sprite = PIXI.Sprite.from(`modules\\${MODULE_ID}\\images\\circle_mask.webp`);
            break;
          case 'circle':
          default:
            const radius = viewDistance * (canvas.grid.sizeX ?? canvas.grid.w) + width / 2;
            sprite = new PIXI.Graphics().beginFill(shapeColor).drawCircle(radius, radius, radius).endFill();
        }

        if (sprite instanceof PIXI.Sprite) {
          sprite.width = (viewDistance + 1) * (canvas.grid.sizeX ?? canvas.grid.w) * 2 + width;
          sprite.height = (viewDistance + 1) * (canvas.grid.sizeY ?? canvas.grid.h) * 2 + height;
          sprite.tint = shapeColor;
        }

        sprite = this.addChild(sprite);
        sprite.placeableId = p.id;
        if (MODULE_CONFIG.mixColors) sprite.blendMode = PIXI.BLEND_MODES.ADD;
      }
    }

    if (this.children.length === 0) {
      this.destroyMask();
      return false;
    }
    return true;
  }

  _getViewDistance(p) {
    let viewDistance = p.document?.getFlag(MODULE_ID, 'viewDistance');
    if (viewDistance == null && MODULE_CONFIG.usePropertyBasedDistance) {
      viewDistance = foundry.utils.getProperty(p.document ?? p, MODULE_CONFIG.propertyDistance);
      if (viewDistance) viewDistance /= canvas.scene.grid.distance;
    }
    if (viewDistance == null) viewDistance = MODULE_CONFIG.defaultViewDistance;
    return viewDistance;
  }

  /**
   * Update mask positions
   * Expecting the object to have 'id', 'center', 'width' and 'height'
   */
  setMaskPosition(target) {
    if (hasPreview(target)) return;
    const shapeMask = this.children.find((c) => c.placeableId === target.id);

    if (shapeMask) {
      const { x, y } = target.center;
      shapeMask.position.set(x - shapeMask.width / 2, y - shapeMask.height / 2);
    }
  }

  activateMask() {
    if (this._grid) {
      this._grid.visible = false;
    }
  }

  deactivateMask() {
    this.destroyMask();
    if (this._grid) this._grid.visible = true;
  }

  destroyMask() {
    this.removeChildren().forEach((c) => c.destroy());
    this._removeMaskFilter();
  }

  _removeMaskFilter() {
    if (this._grid?.filters) {
      let newFilters = [];
      let filters = this._grid.filters;
      for (const f of filters) {
        if (f instanceof CustomSpriteMaskFilter) {
          canvas.primary.removeChild(this);
        } else {
          newFilters.push(f);
        }
      }
      this._grid.filters = newFilters;
    }
  }

  _addMaskFilter() {
    let filters = this._grid.filters ?? [];
    if (!filters.find((f) => f instanceof CustomSpriteMaskFilter)) {
      canvas.primary.addChild(this);
      filters.push(new CustomSpriteMaskFilter(this.sprite));
      this._grid.filters = filters;
    }
  }
}

/**
 * Utility to check if a placeable has a preview drawn which occurs when it is being dragged
 */
function hasPreview(placeable) {
  return Boolean(placeable.layer?.preview?.children?.find((c) => c.id === placeable.id && placeable !== c));
}
