import { MODULE_ID } from '../scripts/utils.js';
import { MODULE_CONFIG, updateSettings, VIEW_SHAPE_OPTIONS } from './settings.js';

export default class SettingConfigApp extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  constructor() {
    super();
    this._settings = foundry.utils.deepClone(MODULE_CONFIG);
  }

  static DEFAULT_OPTIONS = {
    id: `${MODULE_ID}-settings`,
    tag: 'form',
    form: {
      handler: SettingConfigApp._onSubmit,
      submitOnChange: true,
      closeOnSubmit: false,
    },
    window: {
      contentClasses: ['standard-form'],
      title: 'Tactical Grid Settings',
    },
    position: {
      width: 600,
      height: 'auto',
    },
    actions: {
      performUpdate: SettingConfigApp._onPerformUpdate,
      addRangeColor: SettingConfigApp._onAddRangeColor,
      removeRangeColor: SettingConfigApp._onRemoveRangeColor,
    },
  };

  /** @override */
  static TABS = {
    main: {
      tabs: [
        { id: 'enable', icon: 'fas fa-wrench' },
        { id: 'grid', icon: 'fas fa-expand' },
        { id: 'ruler', icon: 'fas fa-ruler' },
        { id: 'measurement', icon: 'fas fa-calculator' },
        { id: 'cover', icon: 'fas fa-shield-alt' },
        { id: 'range', icon: 'fa-regular fa-bow-arrow' },
      ],
      initial: 'enable',
      labelPrefix: 'aedifs-tactical-grid.settings.tabs',
    },
  };

  /** @override */
  static PARTS = {
    tabs: { template: 'templates/generic/tab-navigation.hbs' },
    enable: { template: `modules/${MODULE_ID}/templates/settings/enable.hbs` },
    grid: { template: `modules/${MODULE_ID}/templates/settings/grid.hbs` },
    ruler: { template: `modules/${MODULE_ID}/templates/settings/ruler.hbs` },
    measurement: { template: `modules/${MODULE_ID}/templates/settings/measurement.hbs` },
    cover: { template: `modules/${MODULE_ID}/templates/settings/cover.hbs` },
    range: { template: `modules/${MODULE_ID}/templates/settings/range.hbs` },
    footer: { template: 'templates/generic/form-footer.hbs' },
  };

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    const settings = foundry.utils.deepClone(this._settings);

    settings.viewShapes = VIEW_SHAPE_OPTIONS;

    for (const [k, v] of Object.entries(settings.dispositionColors)) {
      settings.dispositionColors[k] = new Color(v).toString();
    }

    settings.marker.color = new Color(settings.marker.color).toString();
    settings.marker.border = new Color(settings.marker.border).toString();

    settings.fonts = [];
    foundry.applications.settings.menus.FontConfig._collectDefinitions().forEach(
      (f) => (settings.fonts = settings.fonts.concat(Object.keys(f)))
    );

    settings.units = canvas.scene?.grid.units || 'ft';

    settings.calculators = [
      { name: 'None', value: 'none' },
      { name: "Simbul's Cover Calculator", value: 'simbuls-cover-calculator' },
      { name: 'Levels Auto Cover', value: 'levelsautocover' },
      { name: 'MidiQOL (mirror `Calculate Cover` setting)', value: 'midi-qol' },
      { name: 'PF2e Perception', value: 'pf2e-perception' },
      { name: 'Alternative Token Cover', value: 'tokencover' },
    ];

    for (const calculator of settings.calculators) {
      if (calculator.value !== 'none') {
        calculator.disabled = !game.modules.get(calculator.value)?.active;
      }
    }

    settings.dispositions = [];
    for (const [k, v] of Object.entries(CONST.TOKEN_DISPOSITIONS)) {
      settings.dispositions.push({
        value: v,
        label: game.i18n.localize(`TOKEN.DISPOSITION.${k}`),
        enabled: MODULE_CONFIG.range.token.dispositions[v],
      });
    }

    context.buttons = [
      { type: 'button', icon: 'fa-solid fa-floppy-disk', label: 'SETTINGS.Save', action: 'performUpdate' },
    ];

    return Object.assign(context, settings);
  }

  /** @override */
  async _preparePartContext(partId, context, options) {
    await super._preparePartContext(partId, context, options);
    if (partId in context.tabs) context.tab = context.tabs[partId];

    return context;
  }

  /**
   * Process form data
   */
  static async _onSubmit(event, form, formData) {
    console.log(event, form, formData);

    const settings = foundry.utils.expandObject(formData.object);

    if (settings.range.colors) settings.range.colors = Object.values(settings.range.colors);
    else settings.range.colors = [];

    for (const [k, v] of Object.entries(settings.dispositionColors)) {
      settings.dispositionColors[k] = Number(Color.fromString(v));
    }
    settings.marker.color = Number(Color.fromString(settings.marker.color));
    settings.marker.border = Number(Color.fromString(settings.marker.border));

    foundry.utils.mergeObject(this._settings, settings);
  }

  static async _onPerformUpdate(event) {
    updateSettings(this._settings);
    this.close();
  }

  static async _onAddRangeColor(event) {
    this._settings.range.colors.push(foundry.utils.deepClone(MODULE_CONFIG.range.defaultColor));
    this.render(true);
  }

  static async _onRemoveRangeColor(event) {
    this._settings.range.colors.splice(Number(event.target.parentElement.dataset.index), 1);
    this.render(true);
  }
}
