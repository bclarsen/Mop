import { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useClickOutside } from '../hooks/useClickOutside';

export function CustomSelect({ value, onChange, options, placeholder = "Select an option", disabled = false, id, wrapperClassName = "w-full" }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useClickOutside(() => setIsOpen(false));

  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  return (
    <div className={`relative ${wrapperClassName}`} ref={ref}>
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-50 dark:bg-[#1C2C27] border border-slate-200 dark:border-[#253D36] rounded-xl text-sm text-slate-800 dark:text-[#F0FDF4] focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-[#111B18] transition-all text-left ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className="block truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1.5 bg-white dark:bg-[#1C2C27] border border-slate-200 dark:border-[#253D36] rounded-xl shadow-lg shadow-emerald-900/5 max-h-60 overflow-y-auto animate-fade-in p-1">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                className={`w-full text-left px-3 py-2.5 text-sm rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                  isSelected 
                    ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-bold' 
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#253D36] font-medium'
                }`}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
              >
                <span className="block truncate">{opt.label}</span>
                {isSelected && <Check size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0 ml-2" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
