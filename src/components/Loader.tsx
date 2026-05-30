import React from 'react';
import { motion } from 'motion/react';
import { Radio } from 'lucide-react';

interface LoaderProps {
  progress: number;
  text: string;
  isVisible: boolean;
}

export default function Loader({ progress, text, isVisible }: LoaderProps) {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: isVisible ? 1 : 0 }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
      className={`fixed inset-0 z-50 bg-[#0e0e0e] flex flex-col items-center justify-center ${
        !isVisible ? 'pointer-events-none' : ''
      }`}
    >
      {/* Visual Pulsar */}
      <div className="relative w-24 h-24 mb-7 flex items-center justify-center">
        <div className="absolute inset-[-22px] rounded-full border-[1.5px] border-[rgba(233,30,99,0.15)] animate-ring-expand-delayed"></div>
        <div className="absolute inset-[-10px] rounded-full border-2 border-[rgba(233,30,99,0.3)] animate-ring-expand"></div>
        <div 
          className="absolute inset-0 rounded-full shadow-[0_0_0_0_rgba(233,30,99,0.5)] animate-logo-pulse" 
          style={{ background: 'radial-gradient(circle at 35% 35%, #e91e63, #880e4f)' }}
        ></div>
        <Radio className="relative z-10 w-11 h-11 text-white" />
      </div>

      {/* Headings */}
      <h2 
        className="text-[26px] font-extrabold tracking-[-0.5px] mb-2 bg-clip-text text-transparent"
        style={{ background: 'linear-gradient(135deg, #c2185b, #e91e63, #f06292)', WebkitBackgroundClip: 'text' }}
      >
        WebRadioBot
      </h2>
      <p className="text-[13px] text-[#666666] font-medium mb-[40px] tracking-[0.3px]">
        Тысячи станций со всего мира
      </p>

      {/* Animated Equalizer */}
      <div className="flex items-end gap-[5px] h-7 mb-8">
        <div className="w-[5px] rounded-full bg-gradient-to-t from-[#c2185b] to-[#f06292] animate-eq-bounce" style={{ '--h': '14px' } as React.CSSProperties}></div>
        <div className="w-[5px] rounded-full bg-gradient-to-t from-[#c2185b] to-[#f06292] animate-eq-bounce animate-delay-150" style={{ '--h': '22px', animationDelay: '0.15s' } as React.CSSProperties}></div>
        <div className="w-[5px] rounded-full bg-gradient-to-t from-[#c2185b] to-[#f06292] animate-eq-bounce animate-delay-300" style={{ '--h': '18px', animationDelay: '0.3s' } as React.CSSProperties}></div>
        <div className="w-[5px] rounded-full bg-gradient-to-t from-[#c2185b] to-[#f06292] animate-eq-bounce animate-delay-[450ms]" style={{ '--h': '26px', animationDelay: '0.45s' } as React.CSSProperties}></div>
        <div className="w-[5px] rounded-full bg-gradient-to-t from-[#c2185b] to-[#f06292] animate-eq-bounce animate-delay-[600ms]" style={{ '--h': '12px', animationDelay: '0.6s' } as React.CSSProperties}></div>
        <div className="w-[5px] rounded-full bg-gradient-to-t from-[#c2185b] to-[#f06292] animate-eq-bounce animate-delay-[750ms]" style={{ '--h': '20px', animationDelay: '0.75s' } as React.CSSProperties}></div>
        <div className="w-[5px] rounded-full bg-gradient-to-t from-[#c2185b] to-[#f06292] animate-eq-bounce animate-delay-[900ms]" style={{ '--h': '16px', animationDelay: '0.9s' } as React.CSSProperties}></div>
      </div>

      {/* Progress Track */}
      <div className="w-[200px] h-[3px] bg-[#2a2a2a] rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#c2185b] to-[#f06292] rounded-full shadow-[0_0_8px_rgba(233,30,99,0.6)] transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      {/* Status Text label */}
      <span className="mt-[10px] text-xs text-[#555555] font-bold tracking-wider">
        {text}
      </span>
    </motion.div>
  );
}
