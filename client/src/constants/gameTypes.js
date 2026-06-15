// The two game types (US-45). 'guess_winners' is the original match-winner game;
// 'bracket_prediction' is the FIFA-style bracket challenge (US-46 to US-49).
export const GAME_TYPES = {
  guess_winners: 'Guess the Winners',
  bracket_prediction: 'Bracket Prediction',
};

export const gameTypeLabel = (type) => GAME_TYPES[type] ?? type;

export const isBracket = (type) => type === 'bracket_prediction';
