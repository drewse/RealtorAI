'use client';

import { useState } from 'react';
import { scheduleFollowUpDelivery } from '@/lib/openai';
import { useEffect } from 'react';


interface ScheduleFollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  recordingId: string;
  userId: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  onScheduled: () => void;
}

export default function ScheduleFollowUpModal({
  isOpen,
  onClose,
  recordingId,
  userId,
  clientName,
  clientEmail,
  clientPhone,
  onScheduled
}: ScheduleFollowUpModalProps) {
  const [method, setMethod] = useState<'email' | 'sms' | 'both'>('both');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduling, setScheduling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate default schedule time (1 hour from now)
  const getDefaultScheduleTime = () => {
    const now = new Date();
    now.setHours(now.getHours() + 1);
    
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().slice(0, 5);
    
    setScheduleDate(date);
    setScheduleTime(time);
  };

  // Initialize default time when modal opens
  useEffect(() => {
    if (isOpen && !scheduleDate) {
      getDefaultScheduleTime();
    }
  }, [isOpen]);

  const handleSchedule = async () => {
    if (!scheduleDate || !scheduleTime) {
      setError('Please select both date and time');
      return;
    }

    // Validate method availability
    if ((method === 'email' || method === 'both') && !clientEmail) {
      setError('Email address is required for email delivery');
      return;
    }

    if ((method === 'sms' || method === 'both') && !clientPhone) {
      setError('Phone number is required for SMS delivery');
      return;
    }

    setScheduling(true);
    setError(null);

    try {
      const sendAt = new Date(`${scheduleDate}T${scheduleTime}`);
      
      // Check if scheduled time is in the future
      if (sendAt <= new Date()) {
        setError('Scheduled time must be in the future');
        setScheduling(false);
        return;
      }

      const success = await scheduleFollowUpDelivery(
        recordingId,
        method,
        sendAt,
        userId
      );

      if (success) {
        onScheduled();
        onClose();
      } else {
        setError('Failed to schedule follow-up. Please try again.');
      }
    } catch (error) {
      console.error('Error scheduling follow-up:', error);
      setError('Failed to schedule follow-up. Please try again.');
    } finally {
      setScheduling(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Schedule Follow-up</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <div className="w-5 h-5 flex items-center justify-center">
              <i className="ri-close-line text-xl"></i>
            </div>
          </button>
        </div>

        <div className="space-y-4">
          {/* Client Info */}
          <div className="bg-gray-900 rounded-lg p-3">
            <h3 className="font-medium text-white mb-2">{clientName}</h3>
            <div className="space-y-1 text-sm text-gray-400">
              {clientEmail && (
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 flex items-center justify-center">
                    <i className="ri-mail-line"></i>
                  </div>
                  <span>{clientEmail}</span>
                </div>
              )}
              {clientPhone && (
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 flex items-center justify-center">
                    <i className="ri-phone-line"></i>
                  </div>
                  <span>{clientPhone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Delivery Method */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Delivery Method
            </label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  value="email"
                  checked={method === 'email'}
                  onChange={(e) => setMethod(e.target.value as 'email')}
                  disabled={!clientEmail}
                  className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 focus:ring-blue-500"
                />
                <span className={`text-sm ${!clientEmail ? 'text-gray-500' : 'text-gray-300'}`}>
                  Email only {!clientEmail && '(no email provided)'}
                </span>
              </label>
              
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  value="sms"
                  checked={method === 'sms'}
                  onChange={(e) => setMethod(e.target.value as 'sms')}
                  disabled={!clientPhone}
                  className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 focus:ring-blue-500"
                />
                <span className={`text-sm ${!clientPhone ? 'text-gray-500' : 'text-gray-300'}`}>
                  SMS only {!clientPhone && '(no phone provided)'}
                </span>
              </label>
              
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  value="both"
                  checked={method === 'both'}
                  onChange={(e) => setMethod(e.target.value as 'both')}
                  disabled={!clientEmail || !clientPhone}
                  className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 focus:ring-blue-500"
                />
                <span className={`text-sm ${(!clientEmail || !clientPhone) ? 'text-gray-500' : 'text-gray-300'}`}>
                  Both Email & SMS {(!clientEmail || !clientPhone) && '(requires both)'}
                </span>
              </label>
            </div>
          </div>

          {/* Schedule Date */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Send Date
            </label>
            <input
              type="date"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-gray-700 rounded-lg bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Schedule Time */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Send Time
            </label>
            <input
              type="time"
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-700 rounded-lg bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Quick Schedule Options */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Quick Schedule
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => {
                  const now = new Date();
                  now.setMinutes(now.getMinutes() + 30);
                  setScheduleDate(now.toISOString().split('T')[0]);
                  setScheduleTime(now.toTimeString().slice(0, 5));
                }}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs transition-colors cursor-pointer whitespace-nowrap"
              >
                +30 min
              </button>
              <button
                onClick={() => {
                  const now = new Date();
                  now.setHours(now.getHours() + 1);
                  setScheduleDate(now.toISOString().split('T')[0]);
                  setScheduleTime(now.toTimeString().slice(0, 5));
                }}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs transition-colors cursor-pointer whitespace-nowrap"
              >
                +1 hour
              </button>
              <button
                onClick={() => {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  tomorrow.setHours(9, 0, 0, 0);
                  setScheduleDate(tomorrow.toISOString().split('T')[0]);
                  setScheduleTime('09:00');
                }}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs transition-colors cursor-pointer whitespace-nowrap"
              >
                Tomorrow 9AM
            </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center space-x-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              onClick={handleSchedule}
              disabled={scheduling || !scheduleDate || !scheduleTime}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white rounded-lg transition-colors cursor-pointer whitespace-nowrap flex items-center justify-center space-x-2"
            >
              {scheduling ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Scheduling...</span>
                </>
              ) : (
                <>
                  <div className="w-4 h-4 flex items-center justify-center">
                    <i className="ri-calendar-check-line"></i>
                  </div>
                  <span>Schedule</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}