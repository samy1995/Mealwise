import React from 'react';
import { BrandMark } from './BrandMark';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  onHomeClick?: () => void;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, onHomeClick }) => {
  return (
    <header className="flex justify-between items-start pt-6 px-1 mb-2">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white leading-none">
          {title}
        </h1>
        {subtitle && (
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">
            {subtitle}
          </p>
        )}
      </div>
      <div className="flex-shrink-0 mt-0.5">
        {onHomeClick ? (
          <button onClick={onHomeClick} aria-label="Go to Home" className="active:scale-95 transition-transform">
            <BrandMark variant="small" />
          </button>
        ) : (
          <BrandMark variant="small" />
        )}
      </div>
    </header>
  );
};