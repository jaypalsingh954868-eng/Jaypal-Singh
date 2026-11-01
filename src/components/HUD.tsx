import React, { useEffect, useRef, useState } from 'react';
import { CameraView, MinimapData, TimeOfDay, VehiclePhysicsState } from '../game/types';
import { audioSystem } from '../game/audio';

interface HUDProps {
  telemetry: VehiclePhysicsState;
  minimapData: MinimapData | null;
  timeOfDay: TimeOfDay;
  cameraMode: CameraView;
  onToggleTimeOfDay: () => void;
  onCycleCamera: () => void;
  onResetCar: () => void;
  onOpenGarage: () => void;
  onPause: () => void;
  onVirtualInput: (input: {
    throttle?: number;
    brake?: number;
    steer?: number;
    handbrake?: boolean;
    boost?: boolean;
    horn?: boolean;
    headlights?: boolean;
  }) => void;
}

export const HUD: React.FC<HUDProps> = ({
  telemetry,
  minimapData,
  timeOfDay,
  cameraMode,
  onToggleTimeOfDay,
  onCycleCamera,
  onResetCar,
  onOpenGarage,
  onPause,
  onVirtualInput,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const minimapCanvasRef = useRef<HTMLCanvasElement>(null);

  // Active touch button states for visual feedback
  const [activeSteerLeft, setActiveSteerLeft] = useState(false);
  const [activeSteerRight, setActiveSteerRight] = useState(false);
  const [activeGas, setActiveGas] = useState(false);
  const [activeBrake, setActiveBrake] = useState(false);
  const [activeHandbrake, setActiveHandbrake] = useState(false);
  const [activeNitro, setActiveNitro] = useState(false);
  const [activeHorn, setActiveHorn] = useState(false);

  // Draw 2D Minimap Radar
  useEffect(() => {
    const canvas = minimapCanvasRef.current;
    if (!canvas || !minimapData) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const scale = (size * 0.44) / minimapData.cityRadius;

    ctx.clearRect(0, 0, size, size);

    // Radar circular background
    ctx.beginPath();
    ctx.arc(center, center, center - 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(10, 14, 23, 0.88)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.stroke();

    // Radar concentric rings
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
    ctx.lineWidth = 1;
    [0.33, 0.66, 1.0].forEach((r) => {
      ctx.beginPath();
      ctx.arc(center, center, (center - 4) * r, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Draw Roads
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
    minimapData.roads.forEach((road) => {
      ctx.lineWidth = Math.max(2, road.width * scale * 0.7);
      ctx.beginPath();
      ctx.moveTo(center + road.x1 * scale, center + road.z1 * scale);
      ctx.lineTo(center + road.x2 * scale, center + road.z2 * scale);
      ctx.stroke();
    });

    // Draw Buildings
    ctx.fillStyle = 'rgba(30, 41, 59, 0.8)';
    minimapData.buildings.forEach((b) => {
      const bx = center + (b.x - b.width / 2) * scale;
      const bz = center + (b.z - b.depth / 2) * scale;
      const bw = b.width * scale;
      const bd = b.depth * scale;
      ctx.fillRect(bx, bz, bw, bd);
    });

    // Draw Central Roundabout
    ctx.strokeStyle = 'rgba(245, 176, 39, 0.7)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(center, center, 24 * scale, 0, Math.PI * 2);
    ctx.stroke();

    // Draw Player Car Marker
    const px = center + telemetry.x * scale;
    const pz = center + telemetry.z * scale;

    ctx.save();
    ctx.translate(px, pz);
    ctx.rotate(telemetry.yaw);

    // Car heading arrow
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(0, 7);
    ctx.lineTo(-4, -5);
    ctx.lineTo(4, -5);
    ctx.closePath();
    ctx.fill();

    // Pulse dot
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }, [telemetry.x, telemetry.z, telemetry.yaw, minimapData]);

  const toggleMute = () => {
    const muted = audioSystem.toggleMute();
    setIsMuted(muted);
  };

  // Touch Handlers for Controls
  const handleSteer = (dir: 'left' | 'right' | 'none') => {
    if (dir === 'left') {
      setActiveSteerLeft(true);
      setActiveSteerRight(false);
      onVirtualInput({ steer: -1 });
    } else if (dir === 'right') {
      setActiveSteerRight(true);
      setActiveSteerLeft(false);
      onVirtualInput({ steer: 1 });
    } else {
      setActiveSteerLeft(false);
      setActiveSteerRight(false);
      onVirtualInput({ steer: 0 });
    }
  };

  const handleGas = (pressed: boolean) => {
    setActiveGas(pressed);
    onVirtualInput({ throttle: pressed ? 1 : 0 });
  };

  const handleBrake = (pressed: boolean) => {
    setActiveBrake(pressed);
    onVirtualInput({ brake: pressed ? 1 : 0 });
  };

  const handleHandbrake = (pressed: boolean) => {
    setActiveHandbrake(pressed);
    onVirtualInput({ handbrake: pressed });
  };

  const handleNitro = (pressed: boolean) => {
    setActiveNitro(pressed);
    onVirtualInput({ boost: pressed });
  };

  const handleHorn = (pressed: boolean) => {
    setActiveHorn(pressed);
    onVirtualInput({ horn: pressed });
  };

  const absSpeed = Math.abs(telemetry.speedKmH);
  const rpmPercent = Math.min(100, Math.max(0, ((telemetry.rpm - 800) / 7000) * 100));

  return (
    <div className="fixed inset-0 pointer-events-none select-none z-30 flex flex-col justify-between p-3 md:p-6 overflow-hidden">
      {/* Top Header Strip: Minimap + Status + Utility Clusters */}
      <div className="flex justify-between items-start w-full">
        {/* Top-Left: Minimap Radar */}
        <div className="flex flex-col gap-1.5 pointer-events-auto">
          <div className="relative w-28 h-28 md:w-36 md:h-36 rounded-full overflow-hidden shadow-2xl border border-slate-700/80 bg-slate-950/90">
            <canvas ref={minimapCanvasRef} width={144} height={144} className="w-full h-full" />
            <div className="absolute top-1 left-1/2 -translate-x-1/2 text-[9px] font-bold text-sky-400/80 uppercase tracking-widest">
              CITY RADAR
            </div>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-slate-300 self-start shadow-md">
            Apex Central · Speedzone
          </div>
        </div>

        {/* Center: Drift Combo Score Popup */}
        {telemetry.driftScore > 0 && (
          <div className="flex flex-col items-center animate-bounce">
            <div className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/90 to-rose-600/90 border border-amber-300/40 shadow-[0_0_16px_rgba(245,158,11,0.5)] flex items-center gap-2">
              <span className="text-xs font-black tracking-wider uppercase text-yellow-200">DRIFT SCORE</span>
              <span className="text-base md:text-lg font-black text-white tabular-nums">+{telemetry.driftScore}</span>
            </div>
          </div>
        )}

        {/* Top-Right: Utility Cluster Buttons */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Time of Day Toggle */}
          <button
            onClick={onToggleTimeOfDay}
            className="w-10 h-10 rounded-xl bg-slate-900/80 border border-slate-700 hover:border-sky-400 text-slate-200 flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-lg"
            title={`Time: ${timeOfDay}`}
            aria-label="Toggle time of day"
          >
            {timeOfDay === 'day' && '☀️'}
            {timeOfDay === 'sunset' && '🌅'}
            {timeOfDay === 'night' && '🌙'}
          </button>

          {/* Camera View Switch */}
          <button
            onClick={onCycleCamera}
            className="w-10 h-10 rounded-xl bg-slate-900/80 border border-slate-700 hover:border-sky-400 text-slate-200 flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-lg"
            title={`Camera: ${cameraMode}`}
            aria-label="Switch camera view"
          >
            <svg className="w-5 h-5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>

          {/* Reset Car */}
          <button
            onClick={onResetCar}
            className="w-10 h-10 rounded-xl bg-slate-900/80 border border-slate-700 hover:border-emerald-400 text-emerald-400 font-bold flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-lg"
            title="Reset Car (R)"
            aria-label="Reset car"
          >
            ↺
          </button>

          {/* Audio Mute */}
          <button
            onClick={toggleMute}
            className="w-10 h-10 rounded-xl bg-slate-900/80 border border-slate-700 hover:border-sky-400 text-slate-200 flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-lg"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            aria-label="Toggle audio"
          >
            {isMuted ? '🔇' : '🔊'}
          </button>

          {/* Garage */}
          <button
            onClick={onOpenGarage}
            className="hidden sm:flex px-3 h-10 rounded-xl bg-slate-900/80 border border-slate-700 hover:border-sky-400 text-sky-400 font-bold text-xs uppercase items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-lg"
            aria-label="Open garage"
          >
            Garage
          </button>

          {/* Pause */}
          <button
            onClick={onPause}
            className="w-10 h-10 rounded-xl bg-slate-900/80 border border-slate-700 hover:border-rose-400 text-white font-black flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-lg"
            title="Pause (Esc)"
            aria-label="Pause game"
          >
            ⏸
          </button>
        </div>
      </div>

      {/* Bottom Area: Mobile On-Screen Controls + Speedometer */}
      <div className="flex justify-between items-end w-full gap-2">
        {/* Mobile Left: Steering Buttons */}
        <div className="flex gap-2.5 pointer-events-auto">
          <button
            onTouchStart={(e) => { e.preventDefault(); handleSteer('left'); }}
            onTouchEnd={(e) => { e.preventDefault(); handleSteer('none'); }}
            onTouchCancel={(e) => { e.preventDefault(); handleSteer('none'); }}
            onMouseDown={() => handleSteer('left')}
            onMouseUp={() => handleSteer('none')}
            onMouseLeave={() => handleSteer('none')}
            className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl border-2 flex items-center justify-center text-2xl font-black transition-all shadow-xl select-none ${
              activeSteerLeft
                ? 'bg-sky-500 border-white text-white scale-95 shadow-[0_0_20px_rgba(14,165,233,0.8)]'
                : 'bg-slate-900/85 border-slate-700 text-sky-400 active:bg-sky-600'
            }`}
            aria-label="Steer Left"
          >
            ◀
          </button>

          <button
            onTouchStart={(e) => { e.preventDefault(); handleSteer('right'); }}
            onTouchEnd={(e) => { e.preventDefault(); handleSteer('none'); }}
            onTouchCancel={(e) => { e.preventDefault(); handleSteer('none'); }}
            onMouseDown={() => handleSteer('right')}
            onMouseUp={() => handleSteer('none')}
            onMouseLeave={() => handleSteer('none')}
            className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl border-2 flex items-center justify-center text-2xl font-black transition-all shadow-xl select-none ${
              activeSteerRight
                ? 'bg-sky-500 border-white text-white scale-95 shadow-[0_0_20px_rgba(14,165,233,0.8)]'
                : 'bg-slate-900/85 border-slate-700 text-sky-400 active:bg-sky-600'
            }`}
            aria-label="Steer Right"
          >
            ▶
          </button>
        </div>

        {/* Center/Right: Speedometer Cluster */}
        <div className="flex flex-col items-center bg-slate-950/90 border border-slate-800 rounded-3xl p-3 md:p-4 shadow-2xl pointer-events-auto min-w-[140px] md:min-w-[170px]">
          {/* RPM LED Bar */}
          <div className="w-full flex items-center gap-1 mb-2">
            <span className="text-[9px] font-bold text-slate-400">RPM</span>
            <div className="flex-1 h-2 bg-slate-900 rounded-full overflow-hidden p-0.5 flex gap-0.5">
              <div
                className={`h-full rounded-full transition-all duration-75 ${
                  rpmPercent > 85 ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]' : rpmPercent > 60 ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
                style={{ width: `${rpmPercent}%` }}
              />
            </div>
          </div>

          {/* Digital Speed & Unit */}
          <div className="flex items-baseline gap-1">
            <span className="text-4xl md:text-5xl font-black italic tracking-tighter text-white tabular-nums leading-none">
              {absSpeed}
            </span>
            <span className="text-[11px] font-bold text-sky-400 tracking-wider">KM/H</span>
          </div>

          {/* Gear & Boost Fuel */}
          <div className="flex items-center justify-between w-full mt-2 pt-2 border-t border-slate-800/80">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold text-slate-400">GEAR</span>
              <span className="w-6 h-6 rounded-md bg-slate-800 border border-slate-700 text-white font-black text-xs flex items-center justify-center">
                {telemetry.gear}
              </span>
            </div>

            {/* Nitro Boost Bar */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-semibold text-cyan-400">NOS</span>
              <div className="w-12 h-2 bg-slate-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full transition-all duration-75"
                  style={{ width: `${telemetry.boostFuel}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Right: Gas, Brake, Handbrake, Nitro Pedals */}
        <div className="flex items-end gap-2 pointer-events-auto">
          {/* Quick Action Column: Handbrake, Nitro, Horn */}
          <div className="flex flex-col gap-2">
            {/* Nitro Boost Button */}
            <button
              onTouchStart={(e) => { e.preventDefault(); handleNitro(true); }}
              onTouchEnd={(e) => { e.preventDefault(); handleNitro(false); }}
              onTouchCancel={(e) => { e.preventDefault(); handleNitro(false); }}
              onMouseDown={() => handleNitro(true)}
              onMouseUp={() => handleNitro(false)}
              className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl border flex flex-col items-center justify-center font-black text-[10px] transition-all shadow-lg select-none ${
                activeNitro
                  ? 'bg-cyan-500 border-white text-white scale-95 shadow-[0_0_16px_rgba(6,182,212,0.8)]'
                  : 'bg-slate-900/90 border-cyan-500/50 text-cyan-400'
              }`}
              aria-label="Nitro Boost"
            >
              <span>⚡</span>
              <span>NOS</span>
            </button>

            {/* Handbrake Drift Button */}
            <button
              onTouchStart={(e) => { e.preventDefault(); handleHandbrake(true); }}
              onTouchEnd={(e) => { e.preventDefault(); handleHandbrake(false); }}
              onTouchCancel={(e) => { e.preventDefault(); handleHandbrake(false); }}
              onMouseDown={() => handleHandbrake(true)}
              onMouseUp={() => handleHandbrake(false)}
              className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl border flex flex-col items-center justify-center font-black text-[10px] transition-all shadow-lg select-none ${
                activeHandbrake
                  ? 'bg-amber-500 border-white text-white scale-95 shadow-[0_0_16px_rgba(245,158,11,0.8)]'
                  : 'bg-slate-900/90 border-amber-500/50 text-amber-400'
              }`}
              aria-label="Handbrake Drift"
            >
              <span>💨</span>
              <span>DRIFT</span>
            </button>

            {/* Horn Button */}
            <button
              onTouchStart={(e) => { e.preventDefault(); handleHorn(true); }}
              onTouchEnd={(e) => { e.preventDefault(); handleHorn(false); }}
              onTouchCancel={(e) => { e.preventDefault(); handleHorn(false); }}
              onMouseDown={() => handleHorn(true)}
              onMouseUp={() => handleHorn(false)}
              className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl border flex items-center justify-center text-sm transition-all shadow-lg select-none ${
                activeHorn
                  ? 'bg-indigo-500 border-white text-white scale-95'
                  : 'bg-slate-900/90 border-slate-700 text-slate-300'
              }`}
              aria-label="Car Horn"
            >
              📣
            </button>
          </div>

          {/* Brake / Reverse Pedal */}
          <button
            onTouchStart={(e) => { e.preventDefault(); handleBrake(true); }}
            onTouchEnd={(e) => { e.preventDefault(); handleBrake(false); }}
            onTouchCancel={(e) => { e.preventDefault(); handleBrake(false); }}
            onMouseDown={() => handleBrake(true)}
            onMouseUp={() => handleBrake(false)}
            className={`w-14 h-24 md:w-16 md:h-28 rounded-2xl border-2 flex flex-col items-center justify-center font-black tracking-wider text-xs transition-all shadow-2xl select-none ${
              activeBrake
                ? 'bg-rose-600 border-white text-white scale-95 shadow-[0_0_20px_rgba(225,29,72,0.8)]'
                : 'bg-slate-900/90 border-rose-500/50 text-rose-400 active:bg-rose-700'
            }`}
            aria-label="Brake and Reverse"
          >
            <span className="text-lg">🛑</span>
            <span className="mt-1">BRAKE</span>
            <span className="text-[9px] text-rose-300/80">/ REV</span>
          </button>

          {/* Gas / Throttle Pedal */}
          <button
            onTouchStart={(e) => { e.preventDefault(); handleGas(true); }}
            onTouchEnd={(e) => { e.preventDefault(); handleGas(false); }}
            onTouchCancel={(e) => { e.preventDefault(); handleGas(false); }}
            onMouseDown={() => handleGas(true)}
            onMouseUp={() => handleGas(false)}
            className={`w-16 h-32 md:w-20 md:h-36 rounded-2xl border-2 flex flex-col items-center justify-center font-black tracking-wider text-sm transition-all shadow-2xl select-none ${
              activeGas
                ? 'bg-emerald-500 border-white text-white scale-95 shadow-[0_0_24px_rgba(16,185,129,0.8)]'
                : 'bg-slate-900/90 border-emerald-500/60 text-emerald-400 active:bg-emerald-600'
            }`}
            aria-label="Accelerate"
          >
            <span className="text-2xl">⚡</span>
            <span className="mt-2 font-black">GAS</span>
            <span className="text-[10px] text-emerald-300/80 tracking-widest">DRIVE</span>
          </button>
        </div>
      </div>
    </div>
  );
};
