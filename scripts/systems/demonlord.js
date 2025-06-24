import { GenericSystem } from "./generic.js"

export default class demonlord extends GenericSystem {
  /** @override */
  static getTokenRange(token) {
    return token.actor.system.ranges[token.document.movementAction]
  }

  /** @override */

  static getRange(rangeString) {
    let rangeValue
    switch (rangeString) {
      case "SHORT":
        rangeValue = [5]
        break
      case "MEDIUM":
        rangeValue = [20]
        break
      case "LONG":
        rangeValue = [100]
        break
      case "EXTREME":
        rangeValue = [1000]
        break
      default:
        rangeValue = [1]
    }
    return rangeValue
  }

  static getItemRange(item, token) {
    let tokenReach = !isNaN(Number(token.actor.system.characteristics.size)) ? Number(token.actor.system.characteristics.size) : 1
    if (item.type === "weapon") {
      let itemString = item.system.properties
      itemString = itemString.toUpperCase()
      let reachRegExp = /REACH +(.*)/
      let result = reachRegExp.exec(itemString)
      let itemReach = result === null ? 0 : Number(result[1])
      let rangeRegExp = /\(([^)]+)\)/
      let range = rangeRegExp.exec(itemString)

      if (range !== null) return this.getRange(range[1])
      else return [tokenReach + itemReach]
    }
    if (item.type === "spell") {
      let target = item.system.target.trim()
      target = target.toUpperCase()
      let spellRangeRegExp = /WITHIN(.*)RANGE/
      let range = spellRangeRegExp.exec(target)

      if (range !== null) {
        range[1] = range[1].trim()
        return this.getRange(range[1])
      } else if (target.includes("YOU CAN REACH")) return [tokenReach]

      return [0]
    }

    if (item.type === "talent") {
      let target = item.system.description.trim()
      target = target.toUpperCase()
      let spellRangeRegExp = /WITHIN(.*)RANGE/
      let range = spellRangeRegExp.exec(target)

      if (range !== null) {
        range[1] = range[1].trim()
        return this.getRange(range[1])
      }

      return [0]
    }

    return [tokenReach]
  }

  /**
   * Is the item classified as melee?
   * @param {Item} item
   * @returns
   */

  /** @override */
  static onInit() {
    super.onInit()
    this._registerActorSheetListeners()
  }

  static _registerActorSheetListeners() {
    Hooks.on("renderActorSheet", (actorSheet, html, data, options) => {
      const selector = ".attack-roll"
      $(html)
        .on("mouseenter", selector, event => {
          this.hoverItem({ itemId: $(event.target).closest(`[data-item-id]`).data("itemId"), actorSheet })
        })
        .on("mouseleave", selector, () => this.hoverLeaveItem({ actorSheet }))

      const spellSelector = ".magic-roll"
      $(html)
        .on("mouseenter", spellSelector, event => {
          this.hoverItem({ itemId: $(event.target).closest(`[data-item-id]`).data("itemId"), actorSheet })
        })
        .on("mouseleave", spellSelector, () => this.hoverLeaveItem({ actorSheet }))

      const talentSelector = ".talent-roll"
      $(html)
        .on("mouseenter", talentSelector, event => {
          this.hoverItem({ itemId: $(event.target).closest(`[data-item-id]`).data("itemId"), actorSheet })
        })
        .on("mouseleave", talentSelector, () => this.hoverLeaveItem({ actorSheet }))
    })
  }
}
