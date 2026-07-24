/**
 * rateCardTypes.js — Frontend canonical enum for rate card paymentType values.
 *
 * Keep in sync with MBB/utils/rateCardTypes.js (backend).
 * Strategies that consume each type:
 *   UNIT      — pieceRateStrategy    (rateCard.find paymentType === 'UNIT')
 *   PROJECT   — projectBasedStrategy (rateCard.find paymentType === 'PROJECT')
 *   MILESTONE — milestoneBasedStrategy (variableTransactions filter paymentType === 'MILESTONE')
 *   DAY       — dailyWageStrategy    (rateCard.find paymentType === 'DAY')
 *   MONTHLY   — retainerStrategy     (rateCard.find paymentType === 'MONTHLY')
 *
 * POSITION, INTERVIEW, HOUR, CUSTOM are legacy values stored on existing documents
 * but have no dedicated strategy. They are accepted by the model for backward compat.
 */

/** All valid paymentType values for RateCardItemSchema. */
export const RATE_CARD_TYPES = {
  UNIT:      'UNIT',
  PROJECT:   'PROJECT',
  MILESTONE: 'MILESTONE',
  DAY:       'DAY',
  MONTHLY:   'MONTHLY',
  // Legacy / backward-compat only — no dedicated strategy consumes these:
  POSITION:  'POSITION',
  INTERVIEW: 'INTERVIEW',
  HOUR:      'HOUR',
  CUSTOM:    'CUSTOM',
};

/** Human-readable labels. */
export const RATE_CARD_TYPE_LABELS = {
  UNIT:      'Per Unit / Deliverable',
  PROJECT:   'Project (Flat Fee)',
  MILESTONE: 'Milestone',
  DAY:       'Per Day',
  MONTHLY:   'Monthly Retainer',
  POSITION:  'Position',
  INTERVIEW: 'Interview',
  HOUR:      'Per Hour',
  CUSTOM:    'Custom',
};

/**
 * Returns the subset of rate card type options relevant for a given compensationType.
 * Keeps the dropdown focused — piece_rate users see UNIT first; retainer users see MONTHLY first.
 */
export function getRateCardOptionsForCompType(compensationType) {
  switch (compensationType) {
    case 'piece_rate':
      return [
        { value: RATE_CARD_TYPES.UNIT,      label: RATE_CARD_TYPE_LABELS.UNIT },
        { value: RATE_CARD_TYPES.DAY,       label: RATE_CARD_TYPE_LABELS.DAY },
        { value: RATE_CARD_TYPES.HOUR,      label: RATE_CARD_TYPE_LABELS.HOUR },
        { value: RATE_CARD_TYPES.CUSTOM,    label: RATE_CARD_TYPE_LABELS.CUSTOM },
      ];
    case 'project_based':
      return [
        { value: RATE_CARD_TYPES.PROJECT,   label: RATE_CARD_TYPE_LABELS.PROJECT },
        { value: RATE_CARD_TYPES.MILESTONE, label: RATE_CARD_TYPE_LABELS.MILESTONE },
        { value: RATE_CARD_TYPES.CUSTOM,    label: RATE_CARD_TYPE_LABELS.CUSTOM },
      ];
    case 'milestone_based':
      return [
        { value: RATE_CARD_TYPES.MILESTONE, label: RATE_CARD_TYPE_LABELS.MILESTONE },
        { value: RATE_CARD_TYPES.PROJECT,   label: RATE_CARD_TYPE_LABELS.PROJECT },
        { value: RATE_CARD_TYPES.CUSTOM,    label: RATE_CARD_TYPE_LABELS.CUSTOM },
      ];
    case 'retainer':
      return [
        { value: RATE_CARD_TYPES.MONTHLY,   label: RATE_CARD_TYPE_LABELS.MONTHLY },
        { value: RATE_CARD_TYPES.CUSTOM,    label: RATE_CARD_TYPE_LABELS.CUSTOM },
      ];
    case 'daily_wage':
      return [
        { value: RATE_CARD_TYPES.DAY,       label: RATE_CARD_TYPE_LABELS.DAY },
        { value: RATE_CARD_TYPES.CUSTOM,    label: RATE_CARD_TYPE_LABELS.CUSTOM },
      ];
    default:
      // All active types for any other comp type
      return [
        { value: RATE_CARD_TYPES.UNIT,      label: RATE_CARD_TYPE_LABELS.UNIT },
        { value: RATE_CARD_TYPES.PROJECT,   label: RATE_CARD_TYPE_LABELS.PROJECT },
        { value: RATE_CARD_TYPES.MILESTONE, label: RATE_CARD_TYPE_LABELS.MILESTONE },
        { value: RATE_CARD_TYPES.DAY,       label: RATE_CARD_TYPE_LABELS.DAY },
        { value: RATE_CARD_TYPES.MONTHLY,   label: RATE_CARD_TYPE_LABELS.MONTHLY },
        { value: RATE_CARD_TYPES.POSITION,  label: RATE_CARD_TYPE_LABELS.POSITION },
        { value: RATE_CARD_TYPES.INTERVIEW, label: RATE_CARD_TYPE_LABELS.INTERVIEW },
        { value: RATE_CARD_TYPES.HOUR,      label: RATE_CARD_TYPE_LABELS.HOUR },
        { value: RATE_CARD_TYPES.CUSTOM,    label: RATE_CARD_TYPE_LABELS.CUSTOM },
      ];
  }
}

/** Default paymentType for a new rate card item given the employee's compensationType. */
export function getDefaultRateCardType(compensationType) {
  switch (compensationType) {
    case 'piece_rate':      return RATE_CARD_TYPES.UNIT;
    case 'project_based':   return RATE_CARD_TYPES.PROJECT;
    case 'milestone_based': return RATE_CARD_TYPES.MILESTONE;
    case 'retainer':        return RATE_CARD_TYPES.MONTHLY;
    case 'daily_wage':      return RATE_CARD_TYPES.DAY;
    default:                return RATE_CARD_TYPES.UNIT;
  }
}
