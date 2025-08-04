
'use client';

import { useRecording } from '@/hooks/useRecording';

interface RecordingControlsProps {
  onRecordingComplete: (audioBlob: Blob, duration: number) => void;
}

export default function RecordingControls({ onRecordingComplete }: RecordingControlsProps) {
  const {
    isRecording,
    recordingTime,
    audioBlob,
    startRecording,
    stopRecording,
    resetRecording,
    formatTime,
  } = useRecording();

  const handleStart = async () => {
    try {
      await startRecording();
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const handleStop = () => {
    stopRecording();
  };

  const handleSave = () => {
    if (audioBlob) {
      onRecordingComplete(audioBlob, recordingTime);
      resetRecording();
    }
  };

  const handleDiscard = () => {
    resetRecording();
  };

  return (
    <div className="flex flex-col items-center space-y-6">
      <div className="text-4xl font-mono text-blue-500">
        {formatTime(recordingTime)}
      </div>

      {!isRecording && !audioBlob && (
        <button
          onClick={handleStart}
          className="w-20 h-20 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center transition-colors cursor-pointer whitespace-nowrap"
        >
          <div className="w-8 h-8 flex items-center justify-center">
            <i className="ri-mic-line text-3xl text-white"></i>
          </div>
        </button>
      )}

      {isRecording && (
        <button
          onClick={handleStop}
          className="w-20 h-20 bg-gray-600 hover:bg-gray-700 rounded-full flex items-center justify-center transition-colors cursor-pointer whitespace-nowrap"
        >
          <div className="w-8 h-8 flex items-center justify-center">
            <i className="ri-stop-line text-3xl text-white"></i>
          </div>
        </button>
      )}

      {audioBlob && !isRecording && (
        <div className="flex space-x-4">
          <button
            onClick={handleDiscard}
            className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 flex items-center justify-center">
                <i className="ri-delete-bin-line"></i>
              </div>
              <span>Discard</span>
            </div>
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 flex items-center justify-center">
                <i className="ri-save-line"></i>
              </div>
              <span>Process</span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
