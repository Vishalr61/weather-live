import { useEffect, useRef, useState } from 'react';
import { createSoundscapeEngine } from '../audio/soundscapeEngine.ts';
import type { SoundscapeEngine } from '../audio/soundscapeEngine.ts';

export function useSoundscape(weatherCode: number | null): {
  enabled: boolean;
  toggle: () => void;
} {
  const [enabled, setEnabled] = useState(false);
  const engineRef = useRef<SoundscapeEngine | null>(null);

  // Lazily created inside the toggle click handler, not a mount effect —
  // AudioContext can only start unsuspended from within a real user-gesture
  // event handler (browser autoplay policy).
  const toggle = () => {
    if (!engineRef.current) {
      engineRef.current = createSoundscapeEngine();
    }
    setEnabled((prev) => {
      const next = !prev;
      engineRef.current?.setEnabled(next);
      return next;
    });
  };

  useEffect(() => {
    if (weatherCode != null) engineRef.current?.setWeatherCode(weatherCode);
  }, [weatherCode]);

  useEffect(() => {
    return () => engineRef.current?.dispose();
  }, []);

  return { enabled, toggle };
}
