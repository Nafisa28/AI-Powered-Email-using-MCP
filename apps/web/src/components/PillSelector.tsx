import React from 'react';
import { ChevronDown } from 'lucide-react';

interface PillSelectorProps {
  label: string;
  value: string;
  options: string[];
  onChange: (val: string) => void;
}

export const PillSelector: React.FC<PillSelectorProps> = ({
  label,
  value,
  options,
  onChange
}) => {
  return (
    <div className="relative inline-flex items-center">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 hover:border-indigo-500/50 text-slate-200 text-xs font-medium pl-3 pr-7 py-1.5 rounded-full cursor-pointer transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
      >
        {options.map((opt) => (
          <option key={opt} value={opt} className="bg-slate-900 text-slate-200 py-1">
            {label}: {opt}
          </option>
        ))}
      </select>
      <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
    </div>
  );
};
