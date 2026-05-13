import React, { useState, useRef, useEffect } from 'react';

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export function AutocompleteInput({
  value,
  onChange,
  suggestions,
  placeholder = '',
  required = false,
  className = ''
}: AutocompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filteredSuggestions = suggestions.filter(
    (suggestion) =>
      suggestion.toLowerCase().includes(value.toLowerCase()) &&
      suggestion.toLowerCase() !== value.toLowerCase()
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className="relative w-full">
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        required={required}
        className={className}
        autoComplete="off"
      />
      {isOpen && filteredSuggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-2 rounded-xl shadow-2xl max-h-60 overflow-auto" 
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          {filteredSuggestions.map((suggestion, index) => (
            <li
              key={index}
              onClick={() => {
                onChange(suggestion);
                setIsOpen(false);
              }}
              className="px-5 py-3 cursor-pointer text-[10px] uppercase tracking-[0.15em] font-bold transition-colors duration-200"
              style={{ color: 'var(--text-silver)', borderBottom: index < filteredSuggestions.length - 1 ? '1px solid var(--card-border)' : 'none' }}
              onMouseEnter={(e) => {
                (e.target as HTMLLIElement).style.color = '#D4AF37';
                (e.target as HTMLLIElement).style.background = 'rgba(212,175,55,0.05)';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLLIElement).style.color = 'var(--text-silver)';
                (e.target as HTMLLIElement).style.background = 'transparent';
              }}
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
