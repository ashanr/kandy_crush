export function vibrate(pattern) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}

export const haptics = {
  swap: () => vibrate(10),
  match: () => vibrate(20),
  special: () => vibrate([20, 30, 20]),
  combo: () => vibrate([15, 20, 15, 20, 30]),
  invalid: () => vibrate(50),
};
