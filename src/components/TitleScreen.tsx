import React, { useEffect } from 'react';
import { CarId, CarSpec } from '../game/types';
import { CAR_SPECS } from '../game/physics';

interface TitleScreenProps {
  onStartGame: () => void;
  onOpenGarage: () => void;
  selectedCarId: CarId;
  selectedColorHex: string;
  onSelectCar: (carId: CarId) => void;
  onSelectColor: (hex: string) => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStartGame,
  onOpenGarage,
  selectedCarId,
  selectedColorHex,
  onSelectCar,
  onSelectColor,
}) => {
  const currentSpec: CarSpec = CAR_SPECS[selectedCarId] || CAR_SPECS.bmw_m4;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        onStartGame();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStartGame]);

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-between p-4 md:p-8 pointer-events-none select-none">
      {/* Top Banner / Title Lockup over negative space */}
      <div className="flex flex-col items-start max-w-xl pointer-events-auto">
        {/* BMW M-Tricolor Brand Stripe Lockup */}
        <div className="flex items-center gap-1.5 mb-2">
          <div className="w-6 h-1.5 bg-[#0099ff] rounded-full transform -skew-x-12" />
          <div className="w-6 h-1.5 bg-[#002277] rounded-full transform -skew-x-12" />
          <div className="w-6 h-1.5 bg-[#e51937] rounded-full transform -skew-x-12" />
          <span className="text-xs font-bold tracking-widest text-sky-400 uppercase ml-2">
            Motorsport Precision
          </span>
        </div>

        {/* Bespoke SVG Title Lockup */}
        <div className="flex items-center gap-3">
          <svg className="w-10 h-10 md:w-12 md:h-12 text-white" viewBox="0 0 48 48" fill="none">
            <path
              d="M6 36L20 8H28L42 36H34L30 28H18L14 36H6Z"
              fill="url(#apexGrad)"
            />
            <path
              d="M21 22H27L24 15L21 22Z"
              fill="#080b12"
            />
            <defs>
              <linearGradient id="apexGrad" x1="6" y1="8" x2="42" y2="36" gradientUnits="userSpaceOnUse">
                <stop stopColor="#ffffff" />
                <stop offset="0.5" stopColor="#0099ff" />
                <stop offset="1" stopColor="#e51937" />
              </linearGradient>
            </defs>
          </svg>
          <div className="flex flex-col">
            <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter text-white uppercase drop-shadow-lg leading-none">
              APEX <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-indigo-300 to-rose-500">CITY</span>
            </h1>
            <span className="text-[11px] md:text-xs font-semibold tracking-widest text-slate-300 uppercase mt-1">
              3D Open World Driving & Drift Simulation
            </span>
          </div>
        </div>

        {/* Current Car Badge */}
        <div className="mt-4 px-3.5 py-2 rounded-xl bg-slate-900/80 border border-slate-700/60 shadow-lg flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          <div className="text-xs">
            <span className="text-slate-400 font-medium">Active Ride: </span>
            <span className="text-white font-bold">{currentSpec.brand} {currentSpec.name}</span>
            <span className="text-sky-400 font-semibold ml-2">({currentSpec.horsepower} HP)</span>
          </div>
        </div>
      </div>

      {/* Center Right: Quick Paint Finish Swatches */}
      <div className="self-end pointer-events-auto bg-slate-950/80 border border-slate-800 rounded-2xl p-3 shadow-xl flex flex-col gap-2">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">
          Paint Finish
        </span>
        <div className="flex gap-2">
          {currentSpec.colors.map((c) => (
            <button
              key={c.hex}
              onClick={() => onSelectColor(c.hex)}
              className={`w-7 h-7 rounded-full border-2 transition-transform ${
                selectedColorHex.toLowerCase() === c.hex.toLowerCase()
                  ? 'border-white scale-110 shadow-lg'
                  : 'border-slate-700 hover:scale-105'
              }`}
              style={{ backgroundColor: c.hex }}
              title={c.name}
              aria-label={`Select paint ${c.name}`}
            />
          ))}
        </div>
      </div>

      {/* Bottom Hub: Action CTAs and Control Clues */}
      <div className="flex flex-col items-center gap-4 max-w-xl mx-auto w-full pointer-events-auto">
        <div className="flex flex-wrap justify-center gap-3 w-full">
          <button
            data-start="true"
            onClick={onStartGame}
            className="flex-1 min-w-[200px] max-w-[280px] py-4 px-6 rounded-2xl bg-gradient-to-r from-sky-500 via-indigo-600 to-rose-600 text-white font-black text-lg tracking-wider uppercase shadow-[0_0_24px_rgba(14,165,233,0.4)] hover:shadow-[0_0_36px_rgba(14,165,233,0.7)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer border border-white/20"
          >
            Start Driving →
          </button>

          <button
            onClick={onOpenGarage}
            className="py-4 px-6 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-white font-bold text-base tracking-wider uppercase border border-slate-700 hover:border-sky-400 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Select Car
          </button>
        </div>

        {/* Flat borderless control hint lines */}
        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-xs font-semibold text-slate-300 tracking-wide">
            WASD / Arrows Move · Space Handbrake Drift · C Camera · Esc Pause
          </p>
          <p className="text-[11px] text-slate-400">
            Touch Steering & Pedals enabled on Android & Mobile devices
          </p>
        </div>
      </div>
    </div>
  );
};
