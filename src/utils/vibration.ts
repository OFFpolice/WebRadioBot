export function triggerVibration(type: 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'select' | 'warning' = 'light') {
  const isVibrationEnabled = localStorage.getItem('webradio_vibration') !== 'false';
  if (!isVibrationEnabled) return;

  const tg = window.Telegram?.WebApp;
  if (tg?.HapticFeedback) {
    try {
      if (type === 'select') {
        tg.HapticFeedback.selectionChanged();
      } else if (type === 'success' || type === 'error' || type === 'warning') {
        tg.HapticFeedback.notificationOccurred(type as 'success' | 'error' | 'warning');
      } else {
        tg.HapticFeedback.impactOccurred(type as 'light' | 'medium' | 'heavy' | 'rigid' | 'soft');
      }
      return;
    } catch (e) {
      console.warn('Telegram HapticFeedback failed:', e);
    }
  }

  if (typeof window !== 'undefined' && window.navigator?.vibrate) {
    try {
      if (type === 'error') {
        window.navigator.vibrate([100, 50, 100]);
      } else if (type === 'success') {
        window.navigator.vibrate([50, 30, 50]);
      } else if (type === 'heavy') {
        window.navigator.vibrate(50);
      } else if (type === 'medium') {
        window.navigator.vibrate(30);
      } else {
        window.navigator.vibrate(15);
      }
    } catch (e) {
      console.warn('HTML5 Vibrate failed:', e);
    }
  }
}
