import {useEffect, useState} from 'react';
export default function OfflineStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    const cached = () => setReady(true);
    const failure = () => setFailed(true);
    window.addEventListener('online', update); window.addEventListener('offline', update);
    window.addEventListener('waps-offline-ready', cached); window.addEventListener('waps-offline-unavailable', failure);
    let active = true;
    if ('serviceWorker' in navigator) navigator.serviceWorker.getRegistration().then(reg => {if (active && reg?.active) setReady(true);}).catch(() => {});
    return () => {active = false; window.removeEventListener('online', update); window.removeEventListener('offline', update); window.removeEventListener('waps-offline-ready', cached); window.removeEventListener('waps-offline-unavailable', failure);};
  }, []);
  return <p className="waps-muted waps-offline-status">{!online ? 'Offline · study progress is saved in this browser. Account sync resumes when connected.' : ready ? 'Ready for offline study · includes question banks and passage text. Close and reopen tabs to apply downloaded updates.' : failed ? 'Offline download unavailable. Keep a connection or reload to try again.' : 'Offline study downloads automatically when you open the published app. Keep this page open until it is ready.'}</p>;
}
