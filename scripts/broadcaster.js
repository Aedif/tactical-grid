import { MODULE_ID } from './utils.js';

export function registerBroadcasts() {
  game.socket?.on(`module.${MODULE_ID}`, async (message) => {
    if (game.user.isGM) return;
    const { handlerName, args } = message;
    const { sceneId } = args;
    if (canvas.scene?.id !== sceneId) return;

    if (handlerName === 'hideLabels') {
      TacticalGrid.distanceCalculator.hideLabels();
    } else if (handlerName === 'showDistanceLabelsFromPoint') {
      TacticalGrid.distanceCalculator.showDistanceLabelsFromPoint(args.point);
    } else if (handlerName === 'showDistanceLabelsFromToken') {
      const token = canvas.tokens.get(args.tokenId);
      if (token) TacticalGrid.distanceCalculator.showDistanceLabelsFromToken(token);
    } else if (handlerName === 'showDistanceLabelToToken') {
      const originToken = canvas.tokens.get(args.originTokenId);
      const targetToken = canvas.tokens.get(args.targetTokenId);
      if (originToken && targetToken)
        TacticalGrid.distanceCalculator.showDistanceLabelToToken(targetToken, originToken);
    } else if (handlerName === 'drawCrossHighlight') {
      TacticalGrid.distanceCalculator.drawCrossHighlight(args.point);
    }
  });
}

export function broadcast(handlerName, args) {
  const message = { handlerName, args };
  game.socket.emit(`module.${MODULE_ID}`, message);
}
