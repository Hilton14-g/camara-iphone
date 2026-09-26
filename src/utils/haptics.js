// Apple Taptic Engine Simulation using Vibration API

export function triggerHaptic(type = 'light') {
  if (typeof window === 'undefined' || !navigator.vibrate) return;

  try {
    switch (type) {
      case 'light':
        navigator.vibrate(10);
        break;
      case 'medium':
        navigator.vibrate(20);
        break;
      case 'heavy':
        navigator.vibrate([30, 20, 30]);
        break;
      case 'shutter':
        navigator.vibrate([15, 30, 25]);
        break;
      case 'live':
        navigator.vibrate([12, 40, 12]);
        break;
      case 'selection':
        navigator.vibrate(8);
        break;
      default:
        navigator.vibrate(15);
    }
  } catch (err) {
    // Ignore vibration restrictions if user hasn't interacted yet
  }
}
