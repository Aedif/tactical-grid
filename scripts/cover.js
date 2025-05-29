import { MODULE_CONFIG } from '../applications/settings.js';

const FULL_COVER = 999;
const THREE_QUARTERS_COVER = 5;
const HALF_COVER = 2;

export function computeCoverBonus(attacker, target) {
  let coverBonus = null;

  try {
    let calculator;
    if (MODULE_CONFIG.cover.calculator === 'midi-qol') {
      calculator = MidiQOL?.configSettings()?.optionalRules?.coverCalculation ?? 'none';
    } else {
      calculator = MODULE_CONFIG.cover.calculator;
    }

    switch (calculator) {
      case 'levelsautocover':
        if (!game.modules.get('levelsautocover')?.active || !game.settings.get('levelsautocover', 'apiMode'))
          return null;

        const coverData = AutoCover.calculateCover(attacker, target, { apiMode: true });

        const percentCover = 100 - coverData.rawCover;

        // We'll assume that the first defined cover is half-cover
        // 2nd is three-quarter cover
        // 3rd is full-cover
        let coverDetail = AutoCover.getCoverData();
        coverDetail = {
          half: coverDetail[0].percent,
          three: coverDetail[1].percent,
          full: coverDetail[2]?.percent ?? 100,
        };

        if (percentCover === 0 || percentCover < coverDetail.half) coverBonus = 0;
        else if (percentCover < coverDetail.three) coverBonus = HALF_COVER;
        else if (percentCover < coverDetail.full) coverBonus = THREE_QUARTERS_COVER;
        else coverBonus = FULL_COVER;

        break;
      case 'simbuls-cover-calculator':
        if (!game.modules.get('simbuls-cover-calculator')?.active) return null;
        if (globalThis.CoverCalculator) {
          const coverData = globalThis.CoverCalculator.Cover(attacker.document ? attacker : attacker.object, target);
          if (attacker === target) {
            coverBonus = 0;
            break;
          }
          if (coverData?.data?.results.cover === 3) coverBonus = FULL_COVER;
          else coverBonus = -coverData?.data?.results.value ?? 0;
        }
        break;
      case 'tokencover':
        {
          if (!game.modules.get('tokencover')?.active) return null;

          const coverValue = attacker.tokencover.coverCalculator.targetCover(target);
          if (coverValue === 0) coverBonus = 0;
          else if (coverValue === 1) coverBonus = HALF_COVER;
          else if (coverValue === 2) coverBonus = THREE_QUARTERS_COVER;
          else coverBonus = FULL_COVER;
        }
        break;
      case 'pf2e-perception':
        {
          if (!game.modules.get('pf2e-perception')?.active) return null;
          const coverValue = game.modules.get('pf2e-perception').api.token.getCover(attacker, target);
          switch (coverValue) {
            case undefined:
              coverBonus = 0;
              break;
            case 'lesser':
              coverBonus = HALF_COVER;
              break;
            case 'standard':
              coverBonus = THREE_QUARTERS_COVER;
              break;
            case 'greater':
              coverBonus = FULL_COVER;
              break;
            case 'greater-prone':
              coverBonus = FULL_COVER;
              break;
            default:
              coverBonus = 0;
          }
        }
        break;
      case 'none':
      default:
        coverBonus = null;
        break;
    }
  } catch (e) {}

  return coverBonus;
}
