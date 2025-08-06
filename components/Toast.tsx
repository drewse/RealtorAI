'use client';

import { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for fade out animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const bgColor = type === 'success' ? 'bg-green-900/90' : 'bg-red-900/90';
  const borderColor = type === 'success' ? 'border-green-700' : 'border-red-700';
  const textColor = type === 'success' ? 'text-green-300' : 'text-red-300';
  const icon = type === 'success' ? 'ri-check-line' : 'ri-error-warning-line';

  return (
    <div className={`fixed top-4 right-4 z-50 transition-all duration-300 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'}`}>
      <div className={`${bgColor} border ${borderColor} rounded-lg p-4 max-w-sm shadow-lg`}>
        <div className="flex items-center space-x-3">
          <div className={`w-5 h-5 flex items-center justify-center ${textColor}`}>
            <i className={`${icon} text-lg`}></i>
          </div>
          <p className={`${textColor} text-sm font-medium`}>{message}</p>
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(onClose, 300);
            }}
            className="text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <div className="w-4 h-4 flex items-center justify-center">
              <i className="ri-close-line"></i>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
} 