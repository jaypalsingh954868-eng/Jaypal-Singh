import React from 'react';
import { CarId, CarSpec } from '../game/types';
import { CAR_SPECS } from '../game/physics';

interface GarageModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCarId: CarId;
  selectedColorHex: string;
  onSelectCar: (carId: CarId) => void;
  onSelectColor: (hex: string) => void;
}

export const GarageModal: React.FC<GarageModalProps> = ({
  isOpen,
  onClose,
  selectedCarId,
  selectedColorHex,
  onSelectCar,
  onSelectColor,
}) => {
  if (!isOpen) return null;

  const currentCar: CarSpec = CAR_SPECS[selectedCarId] || CAR_SPECS.bmw_m4;

  const carIds: CarId[] = ['bmw_m4', 'gt3_rs', 'apex_hypercar'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 md:p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/60">
          <div>
            <div className="flex items-center gap-1 mb-1">
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              <span className="text-[10px] font-bold text-sky-400 uppercase tracking-widest">
                APEX MOTORS • SHOWROOM & GARAGE
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black italic tracking-tight text-white uppercase">
              SELECT YOUR VEHICLE
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close Garage"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 md:p-6 overflow-y-auto space-y-6">
          {/* Car Selection Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {carIds.map((id) => {
              const spec = CAR_SPECS[id];
              const isSelected = selectedCarId === id;
              return (
                <button
                  key={id}
                  onClick={() => onSelectCar(id)}
                  className={`text-left p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-slate-800/90 border-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.3)] scale-[1.02]'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold text-sky-400 tracking-wider uppercase">
                        {spec.brand}
                      </span>
                      {id === 'bmw_m4' && (
                        <span className="text-[9px] font-black bg-sky-500/20 text-sky-300 border border-sky-500/40 px-1.5 py-0.5 rounded">
                          FLAGSHIP
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-black text-white mt-1 leading-tight">{spec.name}</h3>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{spec.tagline}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex justify-between items-center text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">POWER</span>
                      <span className="font-bold text-white tabular-nums">{spec.horsepower} HP</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">TOP SPEED</span>
                      <span className="font-bold text-white tabular-nums">{spec.topSpeedKmH} km/h</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Detailed Selected Car Overview */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 md:p-5 flex flex-col md:flex-row gap-6 items-center">
            {/* Visual Specs */}
            <div className="flex-1 w-full space-y-3">
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Vehicle Performance</span>
                <span className="text-xs font-extrabold text-sky-400">{currentCar.horsepower} BHP · {currentCar.mass} KG</span>
              </div>

              {/* Performance Bars */}
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400">Top Speed</span>
                    <span className="font-bold text-white">{currentCar.topSpeedKmH} km/h</span>
                  </div>
                  <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-sky-400 to-indigo-500 rounded-full"
                      style={{ width: `${(currentCar.topSpeedKmH / 400) * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400">Acceleration</span>
                    <span className="font-bold text-white">{Math.round(currentCar.accelerationRate * 8)} / 100</span>
                  </div>
                  <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full"
                      style={{ width: `${(currentCar.accelerationRate / 20) * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400">Handling & Drift Agility</span>
                    <span className="font-bold text-white">{Math.round(currentCar.handlingRating * 100)}%</span>
                  </div>
                  <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
                      style={{ width: `${currentCar.handlingRating * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Color Finish Customizer */}
            <div className="w-full md:w-56 flex flex-col gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Factory Paint Finishes
              </span>
              <div className="grid grid-cols-3 gap-2">
                {currentCar.colors.map((c) => (
                  <button
                    key={c.hex}
                    onClick={() => onSelectColor(c.hex)}
                    className={`h-11 rounded-xl border-2 p-1 flex flex-col items-center justify-center transition-all cursor-pointer ${
                      selectedColorHex.toLowerCase() === c.hex.toLowerCase()
                        ? 'border-white scale-105 shadow-lg'
                        : 'border-slate-800 hover:border-slate-600'
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                    aria-label={`Select ${c.name}`}
                  >
                    <span
                      className="text-[9px] font-black px-1 rounded bg-black/60 text-white tracking-tighter truncate max-w-full"
                    >
                      {c.name.split(' ')[0]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 md:p-6 border-t border-slate-800 bg-slate-950/80 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-black text-base uppercase tracking-wider shadow-lg cursor-pointer transition-all"
          >
            Drive This Car in Apex City →
          </button>
        </div>
      </div>
    </div>
  );
};
