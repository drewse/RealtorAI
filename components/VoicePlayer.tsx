'use client';

import { useState, useRef, useEffect } from 'react';

interface VoicePlayerProps {
  audioUrl: string;
  label?: string;
  variant?: 'default' | 'compact' | 'inline';
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
}

export default function VoicePlayer({ 
  audioUrl, 
  label = 'Play Audio',
  variant = 'default',
  onPlay,
  onPause,
  onEnded
}: VoicePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      onEnded?.();
    };

    const handleError = () => {
      setError('Failed to load audio');
      setIsLoading(false);
      setIsPlaying(false);
    };

    const handleLoadStart = () => {
      setIsLoading(true);
      setError(null);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, [audioUrl, onEnded]);

  const handlePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio || isLoading) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
        onPause?.();
      } else {
        await audio.play();
        setIsPlaying(true);
        onPlay?.();
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      setError('Playback failed');
      setIsPlaying(false);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const progressBar = progressRef.current;
    if (!audio || !progressBar || !duration) return;

    const rect = progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const newTime = (clickX / width) * duration;
    
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (variant === 'compact') {
    return (
      <div className="flex items-center space-x-2">
        <audio ref={audioRef} src={audioUrl} preload="metadata" />
        
        <button
          onClick={handlePlayPause}
          disabled={isLoading || !!error}
          className="flex items-center space-x-1 px-2 py-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded text-xs transition-colors cursor-pointer whitespace-nowrap"
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-3 w-3 border border-white border-t-transparent"></div>
          ) : error ? (
            <div className="w-3 h-3 flex items-center justify-center">
              <i className="ri-error-warning-line"></i>
            </div>
          ) : (
            <div className="w-3 h-3 flex items-center justify-center">
              <i className={`ri-${isPlaying ? 'pause' : 'play'}-fill`}></i>
            </div>
          )}
          <span>{label}</span>
        </button>

        {error && (
          <span className="text-red-400 text-xs">{error}</span>
        )}
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className="flex items-center space-x-3 bg-gray-900 rounded-lg p-2">
        <audio ref={audioRef} src={audioUrl} preload="metadata" />
        
        <button
          onClick={handlePlayPause}
          disabled={isLoading || !!error}
          className="w-8 h-8 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded-full flex items-center justify-center transition-colors cursor-pointer whitespace-nowrap"
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border border-white border-t-transparent"></div>
          ) : error ? (
            <div className="w-4 h-4 flex items-center justify-center">
              <i className="ri-error-warning-line text-white"></i>
            </div>
          ) : (
            <div className="w-4 h-4 flex items-center justify-center">
              <i className={`ri-${isPlaying ? 'pause' : 'play'}-fill text-white`}></i>
            </div>
          )}
        </button>

        <div className="flex-1 flex items-center space-x-2">
          <div 
            ref={progressRef}
            onClick={handleSeek}
            className="flex-1 h-2 bg-gray-700 rounded-full cursor-pointer relative"
          >
            <div 
              className="h-full bg-purple-500 rounded-full transition-all duration-100"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          
          <div className="text-xs text-gray-400 min-w-[60px] text-right">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>

        {error && (
          <span className="text-red-400 text-xs">{error}</span>
        )}
      </div>
    );
  }

  // Default variant
  return (
    <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      
      <div className="flex items-center space-x-4">
        <button
          onClick={handlePlayPause}
          disabled={isLoading || !!error}
          className="w-12 h-12 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded-full flex items-center justify-center transition-colors cursor-pointer whitespace-nowrap"
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
          ) : error ? (
            <div className="w-6 h-6 flex items-center justify-center">
              <i className="ri-error-warning-line text-white text-xl"></i>
            </div>
          ) : (
            <div className="w-6 h-6 flex items-center justify-center">
              <i className={`ri-${isPlaying ? 'pause' : 'play'}-fill text-white text-xl`}></i>
            </div>
          )}
        </button>

        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white font-medium text-sm">{label}</span>
            <span className="text-gray-400 text-xs">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
          
          <div 
            ref={progressRef}
            onClick={handleSeek}
            className="w-full h-2 bg-gray-700 rounded-full cursor-pointer relative"
          >
            <div 
              className="h-full bg-purple-500 rounded-full transition-all duration-100"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-3 text-red-400 text-sm">{error}</div>
      )}
    </div>
  );
}