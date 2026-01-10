
import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface TrendIndicatorProps {
  direction: 'up' | 'down' | 'stable';
  label: string;
  value: string | number;
}

export const TrendIndicator: React.FC<TrendIndicatorProps> = ({ direction, label, value }) => {
  const getIcon = () => {
    switch (direction) {
      case 'up': return <ArrowUpRight className="text-emerald-500" size={18} />;
      case 'down': return <ArrowDownRight className="text-amber-500" size={18} />;
      default: return <Minus className="text-slate-400" size={18} />;
    }
  };

  const getBg = () => {
    switch (direction) {
      case 'up': return 'bg-emerald-50';
      case 'down': return 'bg-amber-50';
      default: return 'bg-slate-50';
    }
  };

  return (
    <div className={`p-3 rounded-xl ${getBg()} flex flex-col gap-1 min-w-[100px]`}>
      <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">{label}</span>
      <div className="flex items-center gap-1">
        <span className="text-lg font-bold text-slate-800">{value}</span>
        {getIcon()}
      </div>
    </div>
  );
};
