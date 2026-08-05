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
        className="appearance-none bg-paper-100 hover:bg-paper-200 border border-paper-200 hover:border-accent-400 text-ink-900 text-xs font-medium pl-3 pr-7 py-1.5 rounded-full cursor-pointer transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-accent-400/40"
      >
        {options.map((opt) => (
          <option key={opt} value={opt} className="bg-paper-100 text-ink-900 py-1">
            {label}: {opt}
          </option>
        ))}
      </select>
      <ChevronDown className="w-3.5 h-3.5 text-ink-700 absolute right-2.5 pointer-events-none" />
    </div>
  );
};
