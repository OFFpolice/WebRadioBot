import React from 'react';
import { Play, Pause, Volume2, VolumeX, AlertCircle, Radio, Disc } from 'lucide-react';
import { Station } from '../types';

interface PlayerBarProps {
  activeStation: Station | null;
  isPlaying: boolean;
  status: 'playing' | 'paused' | 'buffering' | 'error' | 'waiting' | 'idle';
  statusText: string;
  volume: number;
  onPlayToggle: () => void;
  onVolumeChange: (vol: number) => void;
  lang?: 'ru' | 'en';
  resolvedTheme?: 'dark' | 'light';
  theme?: 'white' | 'black' | 'system' | 'telegram';
}

export default function PlayerBar({
  activeStation,
  isPlaying,
  status,
  statusText,
  volume,
  onPlayToggle,
  onVolumeChange,
  lang = 'ru',
  resolvedTheme = 'dark',
  theme = 'black',
}: PlayerBarProps) {
  const isMuted = volume === 0;

  const handleMuteToggle = () => {
    onVolumeChange(isMuted ? 1.0 : 0);
  };

  const isLight = resolvedTheme === 'light';

  // Color mapping based on actual states
  const getStatusColor = () => {
    switch (status) {
      case 'playing':
        return 'text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)] bg-green-500/25';
      case 'buffering':
      case 'waiting':
        return 'text-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)] bg-amber-500/25 animate-pulse';
      case 'error':
        return 'text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)] bg-red-500/25';
      default:
        return 'text-[#9e9e9e] bg-[#2c2c2c]';
    }
  };

  const containerBg = isLight ? 'bg-white' : 'bg-[#1e1e1e]';
  const containerBorder = isLight ? 'border-t border-black/[0.05]' : 'border-t border-white/[0.08]';
  const labelColor = isLight ? 'text-[#1c1c1e]' : 'text-white';
  const statusBadgeColor = isLight ? 'text-neutral-500' : 'text-[#b0b0b0]';

  const defaultStationText = lang === 'en' ? 'Choose a station' : 'Выберите станцию';

  return (
    <div 
      className={`flex items-center justify-between gap-3 ${containerBorder} ${containerBg} border-b border-black/[0.01] px-3 py-2 shrink-0 select-none transition-colors duration-200`}
      style={theme === 'telegram' ? {
        backgroundColor: 'var(--tg-theme-secondary-bg-color, #1e1e1e)',
      } : {}}
    >
      {/* Play control trigger exactly matching .play-btn class */}
      <button
        onClick={onPlayToggle}
        className="w-10 h-10 rounded-full bg-[#c2185b] text-white flex items-center justify-center cursor-pointer transition-all active:scale-[0.92] shadow-[0_4px_8px_rgba(194,24,91,0.3)] hover:scale-105 active:shadow-[0_2px_4px_rgba(194,24,91,0.4)] shrink-0"
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying && status !== 'error' ? (
          <Pause className="w-5 h-5 fill-white text-white" />
        ) : (
          <Play className="w-5 h-5 ml-0.5 fill-white text-white" />
        )}
      </button>

      {/* Current status marquee info */}
      <div className="flex-1 min-w-0">
        <h4 className={`font-semibold text-sm ${labelColor} truncate`}>
          {activeStation ? activeStation.name : defaultStationText}
        </h4>
      </div>

      {/* Diagnostic indicator badge exactly matching .status-badge */}
      <div className={`flex items-center gap-1 text-[12px] ${statusBadgeColor} shrink-0`}>
        {status === 'buffering' || status === 'waiting' ? (
          <Disc className="w-4 h-4 text-amber-500 animate-spin-custom" />
        ) : status === 'error' ? (
          <AlertCircle className="w-4 h-4 text-red-500" />
        ) : status === 'playing' ? (
          <Radio className="w-4 h-4 text-green-500 animate-pulse" />
        ) : (
          <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
        )}
        <span>
          {statusText}
        </span>
      </div>
    </div>
  );
}
