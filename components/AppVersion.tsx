import React from 'react';

export const AppVersion: React.FC = () => {
  return (
    <div className="fixed bottom-24 left-0 right-0 flex justify-center pointer-events-none z-40">
      <p className="text-[10px] font-bold text-slate-300 dark:text-slate-700 uppercase tracking-widest bg-slate-50/50 dark:bg-slate-950/50 backdrop-blur-sm px-2 py-0.5 rounded-full">
        © Mealwise v1.6.9
      </p>
    </div>
  );
};