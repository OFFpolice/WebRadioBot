import React, { useState } from 'react';
import { Heart, Radio } from 'lucide-react';
import { Station } from '../types';

interface StationCardProps {
  key?: string;
  station: Station;
  isActive: boolean;
  isFavorite: boolean;
  onPlay: () => void;
  onToggleFavorite: () => void;
}

export default function StationCard({
  station,
  isActive,
  isFavorite,
  onPlay,
  onToggleFavorite,
}: StationCardProps) {
  const [imgState, setImgState] = useState<'loading' | 'loaded' | 'error'>(
    station.favicon ? 'loading' : 'error'
  );

  // Parse comma separated tags or fallback
  const rawTags = station.tags || '';
  const tags = rawTags
    ? rawTags
        .split(',')
        .slice(0, 3)
        .map((t) => t.trim())
        .filter((t) => t.length > 0)
    : [];

  return (
    <div
      onClick={onPlay}
      className={`group flex items-start p-[10px_12px_10px_10px] bg-[#1e1e1e] rounded-2xl mb-2 border border-white/[0.03] transition-all duration-200 cursor-pointer select-none active:scale-[0.99] active:bg-[#2c2c2c] ${
        isActive
          ? 'bg-[#c2185b]/15 !border-l-4 !border-l-[#c2185b] !rounded-[16px_8px_8px_16px]'
          : 'hover:bg-[#252525]'
      }`}
    >
      {/* Cover Image Wrapper */}
      <div className="relative w-[52px] h-[52px] rounded-xl bg-[#2c2c2c] flex items-center justify-center mr-3 shrink-0 overflow-hidden">
        {/* Active Pulse Border Effect */}
        {isActive && (
          <div className="absolute inset-0 rounded-xl border-2 border-[#e91e63]/60 animate-cover-pulse pointer-events-none z-10"></div>
        )}

        {/* Fallback Image / Symbol */}
        {imgState === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#2c2c2c]">
            <Radio className="w-7 h-7 text-[#c2185b]" />
          </div>
        )}

        {/* Real Stream Icon */}
        {station.favicon && imgState !== 'error' && (
          <img
            src={station.favicon}
            alt={station.name}
            loading="lazy"
            onLoad={() => setImgState('loaded')}
            onError={() => setImgState('error')}
            className={`w-full h-full object-cover transition-all duration-300 ${
              imgState === 'loading' ? 'opacity-0 scale-90' : 'opacity-100 scale-100'
            }`}
          />
        )}
      </div>

      {/* Info labels */}
      <div className="flex-1 min-w-0 pt-0.5">
        <h3 className="font-semibold text-[15px] text-white mb-1 leading-snug truncate group-hover:text-[#f06292] transition-colors">
          {station.name || 'Без названия'}
        </h3>
        <div className="flex flex-wrap gap-[4px]">
          {tags.length > 0 ? (
            tags.map((tag, idx) => (
              <span
                key={idx}
                className={`text-[11px] px-2 py-0.5 rounded-[12px] font-medium transition-colors ${
                  isActive
                    ? 'bg-[#3a2a33] text-[#e0b0c0]'
                    : 'bg-[#2c2c2c] text-[#b0b0b0]'
                }`}
              >
                {tag}
              </span>
            ))
          ) : (
            <span
              className={`text-[11px] px-2 py-0.5 rounded-[12px] font-medium transition-colors ${
                isActive
                  ? 'bg-[#3a2a33] text-[#e0b0c0]'
                  : 'bg-[#2c2c2c] text-[#b0b0b0]'
              }`}
            >
              radio
            </span>
          )}
        </div>
      </div>

      {/* Heart Favorite button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite();
        }}
        className={`flex items-center justify-center w-9 h-9 rounded-full bg-transparent hover:bg-white/5 active:scale-[0.9] text-[#9e9e9e] transition-all ml-2 shrink-0 ${
          isFavorite ? 'text-[#e91e63]' : ''
        }`}
        aria-label="Toggle Favorite"
      >
        <Heart
          className={`w-[22px] h-[22px] transition-transform duration-150 active:scale-75 ${
            isFavorite ? 'fill-[#e91e63]' : ''
          }`}
        />
      </button>
    </div>
  );
}
