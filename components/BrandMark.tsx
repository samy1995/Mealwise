import React from 'react';
import { UtensilsCrossed } from 'lucide-react';

interface BrandMarkProps {
  variant?: 'hero' | 'small';
}

export const BrandMark: React.FC<BrandMarkProps> = ({ variant = 'small' }) => {
  if (variant === 'hero') {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="bg-indigo-600 p-5 rounded-[32px] shadow-2xl text-white transform hover:scale-105 transition-transform duration-500">
          <UtensilsCrossed size={48} strokeWidth={2.5} />
        </div>
        <div className="text-center">
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter italic leading-none">MEALWISE</h1>
          <p className="text-slate-800 dark:text-slate-200 font-black text-[11px] uppercase tracking-[0.35em] mt-3 bg-white/50 dark:bg-black/20 px-4 py-1.5 rounded-full backdrop-blur-sm shadow-sm">
            Eat smarter, not stricter
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center">
      <div className="bg-indigo-600 p-2.5 rounded-xl text-white shadow-md shadow-indigo-500/20 active:scale-95 transition-transform">
        <UtensilsCrossed size={18} strokeWidth={2.5} />
      </div>
    </div>
  );
};