import React from 'react';
import { APP_VERSION } from '../constants';

export const AppFooter: React.FC = () => {
  return (
    <footer className="w-full py-10 mt-auto text-center pointer-events-none">
      <p className="text-[10px] font-black text-slate-300 dark:text-slate-800 uppercase tracking-[0.3em]">
        © MEALWISE {APP_VERSION}
      </p>
    </footer>
  );
};