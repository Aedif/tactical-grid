import { GenericSystem } from './generic.js';

export default class DrawSteel extends GenericSystem {
    /** @override */
    static onInit() {
        super.onInit();
        this._registerActorSheetListeners();
    }
    
    /** @override */
    static getTokenRange(token) {
        if (!token || !token.actor) return [0]
        return [token.actor.system.movement.value ?? 0,2*token.actor.system.movement.value ?? 0,token.actor.system.movement.disengage ?? 0];
    }
    
    /** @override */
    static getItemRange(item, token) {
        if (item.type != 'ability') return [0]
            
        let primary = item.system.distance.primary ?? 0;
        let secondary = item.system.distance.secondary ?? 0;
        
        if (item.system.keywords.has('area') && secondary){
            primary = secondary;
            secondary = 0;
        }
        
        return [primary,secondary];
    }
    
    /** @override */
    static getItemFromMacro(macro, actor) {
        return null;
    }
    static _registerActorSheetListeners() {
        Hooks.on('renderActorSheetV2', (actorSheet, html, data, options) => {
            const selector = '.rollable';
            $(html)
              .on('mouseenter', selector, (event) => {
                this.hoverItem({ itemId: $(event.target).closest(`[data-item-id]`).data('itemId'), actorSheet });
              })
              .on('mouseleave', selector, () => this.hoverLeaveItem({ actorSheet }));
        })
    }
}
