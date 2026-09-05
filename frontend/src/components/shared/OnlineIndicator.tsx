import { useEffect, useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

export function OnlineIndicator() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const handler = () => setOnline(navigator.onLine);
    window.addEventListener('online', handler);
    window.addEventListener('offline', handler);
    return () => { window.removeEventListener('online', handler); window.removeEventListener('offline', handler); };
  }, []);
  return (
    <span className={`online-indicator ${online ? 'online' : 'offline'}`}>
      {online ? <Wifi size={13} /> : <WifiOff size={13} />}
      {online ? 'Online' : 'Offline'}
    </span>
  );
}
