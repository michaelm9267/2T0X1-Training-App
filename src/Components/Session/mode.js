import { createContext, useContext } from 'react';

// Training mode for the whole app. Guided mode teaches as the trainee works; test mode hides
// hints, explanations, and which entries were wrong, and leaves feedback to the after-action report.
export const ModeContext = createContext('guided');
export const useTestMode = () => useContext(ModeContext) === 'test';

// Feedback shown in test mode: says something was recorded or needs another look, never why.
export const neutral = (message, test) => {
  if (!test || !message) return message;
  return /not match|does not have|Recheck|Try again|short|exceeds|inapplicable|Hold/i.test(message) ? 'Not accepted. Recheck your work.' : 'Recorded.';
};
