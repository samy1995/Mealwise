import React, { useState, useEffect } from 'react';
import { Share, PlusSquare, X } from 'lucide-react';

export const PwaInstallTip: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    const isDismissed = localStorage.getItem('mealwise_pwa_tip_dismissed') === 'true';

    if (isIos && !isStandalone && !isDismissed) {
      setIsVisible(true);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem('mealwise_pwa_tip_dismissed', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="bg-white border border-slate-100 p-5 rounded-[32px] shadow-2xl mb-4 animate-in fade-in slide-in-from-top-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-start">
          <h4 className="font-bold text-slate-800 flex items-center gap-2">
            Install Mealwise
          </h4>
          <button onClick={dismiss} className="text-slate-300 hover:text-slate-500">
            <X size={18} />
          </button>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          Get the full experience on your home screen:
        </p>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl">
             <div className="bg-white p-1.5 rounded-lg shadow-sm">
                <Share size={16} className="text-blue-500" />
             </div>
             <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">1. Tap the Share button</p>
          </div>
          <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl">
             <div className="bg-white p-1.5 rounded-lg shadow-sm">
                <PlusSquare size={16} className="text-slate-700" />
             </div>
             <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">2. Select 'Add to Home Screen'</p>
          </div>
        </div>
      </div>
    </div>
  );
};