import { useEffect, useState } from 'react';
import { Button } from "./ui/button"

let deferredPrompt: any;

export function PWAInstallPrompt() {
  const [installable, setInstallable] = useState(false);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      setInstallable(true);
    });

    window.addEventListener('appinstalled', () => {
      setInstallable(false);
      deferredPrompt = null;
    });
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      deferredPrompt = null;
      setInstallable(false);
    }
  };

  if (!installable) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white dark:bg-slate-800 p-4 rounded-lg shadow-lg">
      <p className="mb-2 text-sm">Instale o AASP para acesso rápido!</p>
      <Button onClick={handleInstallClick} variant="default">
        Instalar Aplicativo
      </Button>
    </div>
  );
}