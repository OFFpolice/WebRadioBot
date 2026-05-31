import React from 'react';
import { ChevronRight, Radio, ExternalLink, Palette, Globe } from 'lucide-react';
import translations from '../lang.json';

interface SettingsTabProps {
  theme: 'white' | 'black' | 'system';
  lang: 'ru' | 'en' | 'uk';
  onThemeChange: (newTheme: 'white' | 'black' | 'system') => void;
  onLangChange: (newLang: 'ru' | 'en' | 'uk') => void;
  resolvedTheme: 'dark' | 'light';
}

export default function SettingsTab({
  theme,
  lang,
  onThemeChange,
  onLangChange,
  resolvedTheme,
}: SettingsTabProps) {
  const isLight = resolvedTheme === 'light';
  
  // Safe fallback to English translations if the language is unknown
  const t = translations[lang] || translations['en'];

  // Theme-sensitive colors
  const cardBg = isLight ? 'bg-white' : 'bg-[#1e1e1e]';
  const cardBorder = isLight ? 'border-black/[0.05]' : 'border-white/[0.03]';
  const labelColor = isLight ? 'text-[#1c1c1e]' : 'text-white';
  const subtextColor = isLight ? 'text-[#6b6c72]' : 'text-[#b0b0b0]';
  const segmentBg = isLight ? 'bg-[#f0f2f5]' : 'bg-[#2c2c2c]';
  
  const getSegmentBtnClass = (active: boolean) => {
    if (active) {
      return isLight 
        ? 'bg-white text-[#c2185b] font-bold shadow-sm' 
        : 'bg-[#121212] text-[#f06292] font-bold shadow-[0_2px_6px_rgba(0,0,0,0.3)]';
    }
    return isLight
      ? 'text-neutral-500 hover:text-neutral-800'
      : 'text-neutral-400 hover:text-neutral-200';
  };

  return (
    <div className="py-2 px-1 select-none max-w-[440px] mx-auto flex flex-col gap-5">
      
      {/* 1. Theme selection block */}
      <div className={`p-4 rounded-2xl ${cardBg} border ${cardBorder} flex flex-col gap-3.5 shadow-sm`}>
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5 text-[#c2185b]" />
          <span className={`text-[15px] font-bold ${labelColor}`}>
            {t.themeLabel}
          </span>
        </div>
        
        {/* Segmented Control - 3 columns for Light, Dark, System */}
        <div className={`grid grid-cols-3 gap-1 p-1 rounded-xl ${segmentBg}`}>
          <button
            onClick={() => onThemeChange('white')}
            className={`text-[12px] py-2 rounded-lg text-center font-medium transition-all active:scale-95 cursor-pointer ${getSegmentBtnClass(theme === 'white')}`}
          >
            {t.themeWhite}
          </button>
          <button
            onClick={() => onThemeChange('black')}
            className={`text-[12px] py-2 rounded-lg text-center font-medium transition-all active:scale-95 cursor-pointer ${getSegmentBtnClass(theme === 'black')}`}
          >
            {t.themeBlack}
          </button>
          <button
            onClick={() => onThemeChange('system')}
            className={`text-[12px] py-2 rounded-lg text-center font-medium transition-all active:scale-95 cursor-pointer ${getSegmentBtnClass(theme === 'system')}`}
          >
            {t.themeSystem}
          </button>
        </div>
      </div>

      {/* 2. Language selection block */}
      <div className={`p-4 rounded-2xl ${cardBg} border ${cardBorder} flex flex-col gap-3.5 shadow-sm`}>
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-[#c2185b]" />
          <span className={`text-[15px] font-bold ${labelColor}`}>
            {t.langLabel}
          </span>
        </div>
        
        {/* Segmented Control - 3 columns for Russian, English, Ukrainian */}
        <div className={`grid grid-cols-3 gap-1 p-1 rounded-xl ${segmentBg}`}>
          <button
            onClick={() => onLangChange('ru')}
            className={`text-[12.5px] py-2 rounded-lg text-center font-medium transition-all active:scale-95 cursor-pointer ${getSegmentBtnClass(lang === 'ru')}`}
          >
            {t.langRu}
          </button>
          <button
            onClick={() => onLangChange('en')}
            className={`text-[12.5px] py-2 rounded-lg text-center font-medium transition-all active:scale-95 cursor-pointer ${getSegmentBtnClass(lang === 'en')}`}
          >
            {t.langEn}
          </button>
          <button
            onClick={() => onLangChange('uk')}
            className={`text-[12.5px] py-2 rounded-lg text-center font-medium transition-all active:scale-95 cursor-pointer ${getSegmentBtnClass(lang === 'uk')}`}
          >
            {t.langUk}
          </button>
        </div>
      </div>



      {/* Divider */}
      <div className="h-[1px] bg-white/[0.04] my-1" />

      {/* 3. Embedded About content section */}
      <div className="text-center">
        {/* Brand Icon Badge */}
        <div className="text-[60px] text-[#c2185b] mb-3 flex items-center justify-center">
          <Radio className="w-14 h-14" />
        </div>

        <h3 className={`text-[18px] font-bold mb-2 ${labelColor}`}>
          WebRadioBot
        </h3>
        
        <p className={`mb-6 text-[14px] leading-relaxed max-w-[320px] mx-auto ${subtextColor}`}>
          {t.aboutDesc}
        </p>

        {/* Social interactions */}
        <div className="flex flex-col gap-2.5 max-w-[280px] mx-auto mb-6">
          {/* Telegram channel */}
          <a
            href="https://t.me/OFFpolice"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative flex items-center gap-[12px] p-[12px_18px] rounded-[16px] text-white font-bold no-underline cursor-pointer transition-all active:scale-[0.96] shadow-[0_4px_16px_rgba(34,158,217,0.25)]"
            style={{ background: 'linear-gradient(135deg, #229ED9, #1a7fc1)' }}
          >
            <div className="w-7 h-7 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" className="w-[22px] h-[22px] fill-white">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
              </svg>
            </div>
            <div className="flex-1 text-left">
              <span className="text-[11px] opacity-75 font-medium block leading-none mb-0.5">
                {t.tgContact}
              </span>
              <span className="text-[14px] font-extrabold block leading-normal">Telegram</span>
            </div>
            <ChevronRight className="w-4 h-4 opacity-60 group-hover:translate-x-1 transition-transform" />
          </a>

          {/* Twitter */}
          <a
            href="https://x.com/OFFpolice2077"
            target="_blank"
            rel="noopener noreferrer"
            className={`group relative flex items-center gap-[12px] p-[12px_18px] rounded-[16px] text-white font-bold no-underline cursor-pointer transition-all active:scale-[0.96] shadow-sm border ${isLight ? 'border-black/10' : 'border-white/10'}`}
            style={{ background: isLight ? 'linear-gradient(135deg, #2c2c2e, #48484a)' : 'linear-gradient(135deg, #1a1a1a, #333)' }}
          >
            <div className="w-7 h-7 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" className="w-[22px] h-[22px] fill-white">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </div>
            <div className="flex-1 text-left">
              <span className="text-[11px] opacity-75 font-medium block leading-none mb-0.5">
                {t.tgContact}
              </span>
              <span className="text-[14px] font-extrabold block leading-normal">X (Twitter)</span>
            </div>
            <ChevronRight className="w-4 h-4 opacity-60 group-hover:translate-x-1 transition-transform" />
          </a>

          {/* Instagram */}
          <a
            href="https://www.instagram.com/offpolice2077"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative flex items-center gap-[12px] p-[12px_18px] rounded-[16px] text-white font-bold no-underline cursor-pointer transition-all active:scale-[0.96] shadow-[0_4px_16px_rgba(220,39,67,0.25)]"
            style={{ background: 'linear-gradient(135deg, #f09433, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888)' }}
          >
            <div className="w-7 h-7 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" className="w-[22px] h-[22px] fill-white">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
              </svg>
            </div>
            <div className="flex-1 text-left">
              <span className="text-[11px] opacity-75 font-medium block leading-none mb-0.5">
                {t.tgContact}
              </span>
              <span className="text-[14px] font-extrabold block leading-normal">Instagram</span>
            </div>
            <ChevronRight className="w-4 h-4 opacity-60 group-hover:translate-x-1 transition-transform" />
          </a>

          {/* Share */}
          <a
            href="https://t.me/share/url?url=https%3A%2F%2Ft.me%2FWeb_radio_bot%2Fapp&text=%F0%9F%8E%A7%20%D0%A1%D0%BB%D1%83%D1%88%D0%B0%D0%B9%20%D1%80%D0%B0%D0%B4%D0%B8%D0%BE%20%D1%81%D0%BE%20%D0%B2%D1%81%D0%B5%D0%B3%D0%BE%20%D0%BC%D0%B8%D1%80%D0%B0%20%D0%BF%D1%80%D1%8F%D0%BC%D0%BE%20%D0%B2%20Telegram!"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative flex items-center gap-[12px] p-[12px_18px] rounded-[16px] text-white font-bold no-underline cursor-pointer transition-all active:scale-[0.96] shadow-[0_4px_16px_rgba(194,24,91,0.25)]"
            style={{ background: 'linear-gradient(135deg, #c2185b, #e91e63)' }}
          >
            <div className="w-7 h-7 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" className="w-[22px] h-[22px] fill-white">
                <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z" />
              </svg>
            </div>
            <div className="flex-1 text-left">
              <span className="text-[11px] opacity-75 font-medium block leading-none mb-0.5">
                {t.shareFriends}
              </span>
              <span className="text-[14px] font-extrabold block leading-normal">{t.shareButton}</span>
            </div>
            <ChevronRight className="w-4 h-4 opacity-60 group-hover:translate-x-1 transition-transform" />
          </a>
        </div>

        {/* Developer API */}
        <div className="mb-3">
          <a
            href="https://api.radio-browser.info/"
            target="_blank"
            rel="noopener noreferrer"
            className="api-link text-[13px] font-bold tracking-[0.2px] bg-gradient-to-r from-[#c2185b] to-[#e91e63] bg-clip-text text-transparent active:opacity-70 transition-opacity inline-flex items-center gap-1"
          >
            {t.devApi}
            <ExternalLink className="w-3.5 h-3.5 text-[#e91e63]" />
          </a>
        </div>

        {/* Version FOOTPRINT */}
        <div className="text-[11.5px] text-neutral-500 font-semibold tracking-[0.3px] mb-2">
          {t.version}
        </div>
      </div>

    </div>
  );
}
