import { useEffect, useRef, useState, useCallback } from 'react';
import { CameraView, CarId, TimeOfDay, VehiclePhysicsState } from './game/types';
import { CAR_SPECS, createInitialPhysicsState } from './game/physics';
import { GameEngine } from './game/engine';
import { TitleScreen } from './components/TitleScreen';
import { HUD } from './components/HUD';
import { GarageModal } from './components/GarageModal';
import { PauseModal } from './components/PauseModal';
import { audioSystem } from './game/audio';

type GameState = 'title' | 'playing' | 'paused';

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // State
  const [gameState, setGameState] = useState<GameState>('title');
  const [isGarageOpen, setIsGarageOpen] = useState(false);
  const [selectedCarId, setSelectedCarId] = useState<CarId>('bmw_m4');
  const [selectedColorHex, setSelectedColorHex] = useState<string>(CAR_SPECS.bmw_m4.defaultColorHex);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('day');
  const [cameraMode, setCameraMode] = useState<CameraView>('chase_near');
  const [isMuted, setIsMuted] = useState(false);

  // Live Telemetry pushed from Engine
  const [telemetry, setTelemetry] = useState<VehiclePhysicsState>(createInitialPhysicsState(0, 0, 15, 0));

  // Sync document.body.dataset.state for testability
  useEffect(() => {
    document.body.dataset.state = gameState;
  }, [gameState]);

  // Handle autostart URL param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      setGameState('playing');
      audioSystem.unlock();
    }
  }, []);

  // Initialize Three.js Engine once on mount
  useEffect(() => {
    if (!mountRef.current) return;

    const engine = new GameEngine({
      onTelemetryUpdate: (state) => {
        setTelemetry(state);
      },
      onTimeOfDayChange: (time) => {
        setTimeOfDay(time);
      },
      onCameraChange: (cam) => {
        setCameraMode(cam);
      },
      onPauseRequest: () => {
        setGameState((prev) => (prev === 'playing' ? 'paused' : prev === 'paused' ? 'playing' : prev));
      },
    });

    engine.init(mountRef.current);
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Update engine pause state
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setPaused(gameState !== 'playing');
    }
  }, [gameState]);

  // Car and Color selection handlers
  const handleSelectCar = useCallback((carId: CarId) => {
    setSelectedCarId(carId);
    const defaultColor = CAR_SPECS[carId]?.defaultColorHex || '#165b40';
    setSelectedColorHex(defaultColor);
    engineRef.current?.spawnCar(carId, defaultColor);
  }, []);

  const handleSelectColor = useCallback((hex: string) => {
    setSelectedColorHex(hex);
    engineRef.current?.setCarColor(hex);
  }, []);

  // Game state handlers
  const handleStartGame = useCallback(() => {
    audioSystem.unlock();
    setGameState('playing');
  }, []);

  const handleResume = useCallback(() => {
    setGameState('playing');
  }, []);

  const handlePause = useCallback(() => {
    setGameState('paused');
  }, []);

  const handleResetCar = useCallback(() => {
    engineRef.current?.resetCar();
  }, []);

  const handleToggleTimeOfDay = useCallback(() => {
    engineRef.current?.toggleTimeOfDay();
  }, []);

  const handleCycleCamera = useCallback(() => {
    engineRef.current?.cycleCamera();
  }, []);

  const handleToggleAudio = useCallback(() => {
    const muted = audioSystem.toggleMute();
    setIsMuted(muted);
  }, []);

  const handleVirtualInput = useCallback((input: {
    throttle?: number;
    brake?: number;
    steer?: number;
    handbrake?: boolean;
    boost?: boolean;
    horn?: boolean;
    headlights?: boolean;
  }) => {
    engineRef.current?.setVirtualInput(input);
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#080b12] text-white">
      {/* Isolated Three.js WebGL Mount Container */}
      <div
        ref={mountRef}
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
        data-testid="threejs-canvas-container"
      />

      {/* Title Screen Overlay */}
      {gameState === 'title' && (
        <TitleScreen
          onStartGame={handleStartGame}
          onOpenGarage={() => setIsGarageOpen(true)}
          selectedCarId={selectedCarId}
          selectedColorHex={selectedColorHex}
          onSelectCar={handleSelectCar}
          onSelectColor={handleSelectColor}
        />
      )}

      {/* In-Game HUD Overlay */}
      {gameState === 'playing' && (
        <HUD
          telemetry={telemetry}
          minimapData={engineRef.current?.city?.minimapData || null}
          timeOfDay={timeOfDay}
          cameraMode={cameraMode}
          onToggleTimeOfDay={handleToggleTimeOfDay}
          onCycleCamera={handleCycleCamera}
          onResetCar={handleResetCar}
          onOpenGarage={() => setIsGarageOpen(true)}
          onPause={handlePause}
          onVirtualInput={handleVirtualInput}
        />
      )}

      {/* Garage / Vehicle Selection Modal */}
      <GarageModal
        isOpen={isGarageOpen}
        onClose={() => setIsGarageOpen(false)}
        selectedCarId={selectedCarId}
        selectedColorHex={selectedColorHex}
        onSelectCar={handleSelectCar}
        onSelectColor={handleSelectColor}
      />

      {/* Pause Menu Modal */}
      <PauseModal
        isOpen={gameState === 'paused'}
        onResume={handleResume}
        onOpenGarage={() => setIsGarageOpen(true)}
        onResetCar={handleResetCar}
        onToggleTimeOfDay={handleToggleTimeOfDay}
        onCycleCamera={handleCycleCamera}
        onToggleAudio={handleToggleAudio}
        isMuted={isMuted}
        timeOfDay={timeOfDay}
        cameraMode={cameraMode}
        onReturnToTitle={() => setGameState('title')}
      />
    </div>
  );
}
