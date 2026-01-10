import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

export const InstallPWAButton: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsVisible(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="bg-indigo-600 p-4 rounded-3xl text-white shadow-xl flex items-center justify-between mb-4 animate-in fade-in slide-in-from-top-4">
      <div className="flex items-center gap-3">
        <div className="bg-white/20 p-2 rounded-xl">
          <Download size={20} />
        </div>
        <div>
          <p className="font-bold text-sm">Install Mealwise</p>
          <p className="text-[10px] opacity-80">Access it quickly from your home screen.</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button 
          onClick={handleInstallClick}
          className="bg-white text-indigo-600 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest shadow-sm active:scale-95 transition-transform"
        >
          Install
        </button>
        <button 
          onClick={() => setIsVisible(false)}
          className="p-1 opacity-50 hover:opacity-100 transition-opacity"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};