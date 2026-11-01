export async function registerOffline() {
  if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
  try {
    const base = `${process.env.PUBLIC_URL || ''}/`;
    await navigator.serviceWorker.register(`${base}service-worker.js`, {scope: base});
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, {once: true}));
    }
    window.dispatchEvent(new Event('waps-offline-ready'));
  } catch {
    window.dispatchEvent(new Event('waps-offline-unavailable'));
  }
}
