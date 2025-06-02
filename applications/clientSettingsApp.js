import { MODULE_ID } from '../scripts/utils.js';
import { MODULE_CLIENT_CONFIG, updateClientSettings } from './settings.js';

export default class ClientSettingsConfigApp extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  constructor() {
    super();
    this._settings = foundry.utils.deepClone(MODULE_CLIENT_CONFIG);
  }

  static DEFAULT_OPTIONS = {
    id: `${MODULE_ID}-client-settings`,
    tag: 'form',
    form: {
      handler: ClientSettingsConfigApp._onSubmit,
      submitOnChange: true,
      closeOnSubmit: false,
    },
    window: {
      contentClasses: ['standard-form'],
      title: `${MODULE_ID}.settings.menu.client`,
    },
    position: {
      width: 600,
      height: 'auto',
    },
    actions: {
      performUpdate: ClientSettingsConfigApp._onPerformUpdate,
      addRangeColor: ClientSettingsConfigApp._onAddRangeColor,
      removeRangeColor: ClientSettingsConfigApp._onRemoveRangeColor,
    },
  };

  /** @override */
  static TABS = {
    main: {
      tabs: [
        { id: 'measurement', icon: 'fas fa-calculator' },
        { id: 'range', icon: 'fa-regular fa-bow-arrow' },
        { id: 'misc', icon: 'fas fa-cog' },
      ],
      initial: 'measurement',
      labelPrefix: 'aedifs-tactical-grid.settings.tabs',
    },
  };

  /** @override */
  static PARTS = {
    tabs: { template: 'templates/generic/tab-navigation.hbs' },
    measurement: { template: `modules/${MODULE_ID}/templates/settings/client/measurement.hbs` },
    range: { template: `modules/${MODULE_ID}/templates/settings/client/range.hbs` },
    misc: { template: `modules/${MODULE_ID}/templates/settings/client/misc.hbs` },
    footer: { template: 'templates/generic/form-footer.hbs' },
  };

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    context.buttons = [
      { type: 'button', icon: 'fa-solid fa-floppy-disk', label: 'SETTINGS.Save', action: 'performUpdate' },
    ];

    return Object.assign(context, this._settings);
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
    const settings = foundry.utils.expandObject(formData.object);
    foundry.utils.mergeObject(this._settings, settings);
  }

  static async _onPerformUpdate(event) {
    updateClientSettings(this._settings);
    this.close();
  }
}
