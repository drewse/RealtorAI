'use client';

import { useState, useEffect } from 'react';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  disabled?: boolean;
}

export default function TagInput({ 
  value, 
  onChange, 
  placeholder = "Type tags separated by commas...", 
  label = "Tags",
  className = "",
  disabled = false 
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');

  // Update input value when external value changes (for edit mode)
  useEffect(() => {
    setInputValue('');
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTags();
    }
  };

  const handleInputBlur = () => {
    addTags();
  };

  const addTags = () => {
    if (!inputValue.trim()) return;

    const newTags = inputValue
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)
      .filter(tag => !value.includes(tag)); // Prevent duplicates

    if (newTags.length > 0) {
      onChange([...value, ...newTags]);
      setInputValue('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {label}
          <span className="text-gray-500 text-xs ml-2">(comma-separated)</span>
        </label>
      )}
      
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleInputKeyDown}
        onBlur={handleInputBlur}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-4 py-3 border border-gray-700 rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm disabled:opacity-50 disabled:cursor-not-allowed"
      />
      
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {value.map((tag, index) => (
            <span 
              key={index} 
              className="px-2 py-1 bg-blue-900/30 text-blue-300 rounded-full text-xs flex items-center space-x-1 group"
            >
              <span>{tag}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="text-blue-400 hover:text-blue-200 transition-colors cursor-pointer"
                >
                  <div className="w-3 h-3 flex items-center justify-center">
                    <i className="ri-close-line text-xs"></i>
                  </div>
                </button>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
} 