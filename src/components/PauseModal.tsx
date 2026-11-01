import React from 'react';
import { CameraView, TimeOfDay } from '../game/types';

interface PauseModalProps {
  isOpen: boolean;
  onResume: () => void;
  onOpenGarage: () => void;
  onResetCar: () => void;
  onToggleTimeOfDay: () => void;
  onCycleCamera: () => void;
  onToggleAudio: () => void;
  isMuted: boolean;
  timeOfDay: TimeOfDay;
  cameraMode: CameraView;
  onReturnToTitle: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  isOpen,
  onResume,
  onOpenGarage,
  onResetCar,
  onToggleTimeOfDay,
  onCycleCamera,
  onToggleAudio,
  isMuted,
  timeOfDay,
  cameraMode,
  onReturnToTitle,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-5 text-center">
        {/* Title */}
        <div>
          <span className="text-[10px] font-bold text-sky-400 uppercase tracking-widest block mb-1">
            SIMULATION PAUSED
          </span>
          <h2 className="text-3xl font-black italic text-white uppercase tracking-tight">
            APEX CITY
          </h2>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={onResume}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-black text-base uppercase tracking-wider shadow-lg hover:brightness-110 active:scale-98 transition-all cursor-pointer"
          >
            Resume Driving
          </button>

          <button
            onClick={() => {
              onResume();
              onOpenGarage();
            }}
            className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 font-bold text-sm uppercase tracking-wider border border-slate-700 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>🏎️</span>
            <span>Switch Car / Garage</span>
          </button>

          <button
            onClick={() => {
              onResetCar();
              onResume();
            }}
            className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-sm uppercase tracking-wider border border-slate-700 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>↺</span>
            <span>Reset Car to Road</span>
          </button>

          <div className="grid grid-cols-3 gap-2 mt-1">
            <button
              onClick={onToggleTimeOfDay}
              className="py-2.5 px-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-600 text-xs font-semibold text-slate-300 transition-all cursor-pointer flex flex-col items-center gap-1"
            >
              <span>{timeOfDay === 'day' ? '☀️ Day' : timeOfDay === 'sunset' ? '🌅 Sunset' : '🌙 Night'}</span>
            </button>

            <button
              onClick={onCycleCamera}
              className="py-2.5 px-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-600 text-xs font-semibold text-slate-300 transition-all cursor-pointer flex flex-col items-center gap-1"
            >
              <span className="capitalize">{cameraMode.replace('_', ' ')}</span>
            </button>

            <button
              onClick={onToggleAudio}
              className="py-2.5 px-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-600 text-xs font-semibold text-slate-300 transition-all cursor-pointer flex flex-col items-center gap-1"
            >
              <span>{isMuted ? '🔇 Muted' : '🔊 Audio'}</span>
            </button>
          </div>

          <button
            onClick={onReturnToTitle}
            className="w-full py-2.5 px-4 rounded-xl bg-transparent hover:bg-slate-800 text-slate-400 hover:text-white font-semibold text-xs uppercase tracking-wider transition-all cursor-pointer mt-2"
          >
            Return to Title Screen
          </button>
        </div>

        {/* Quick Controls Reference */}
        <div className="pt-4 border-t border-slate-800 text-left text-xs text-slate-400 space-y-1">
          <div className="font-bold text-slate-300 mb-1">Controls Guide:</div>
          <div className="flex justify-between">
            <span>Accelerate / Reverse</span>
            <span className="font-mono text-white">W / S or Up / Down</span>
          </div>
          <div className="flex justify-between">
            <span>Steering</span>
            <span className="font-mono text-white">A / D or Left / Right</span>
          </div>
          <div className="flex justify-between">
            <span>Handbrake Drift</span>
            <span className="font-mono text-white">Space</span>
          </div>
          <div className="flex justify-between">
            <span>Nitro Boost</span>
            <span className="font-mono text-white">Shift</span>
          </div>
          <div className="flex justify-between">
            <span>Mobile / Android</span>
            <span className="font-mono text-white">On-Screen Pedals</span>
          </div>
        </div>
      </div>
    </div>
  );
};
