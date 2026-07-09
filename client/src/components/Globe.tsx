import { useEffect, useRef } from 'react';
import { createGlobe } from '../three/globeScene.ts';
import type { GlobeHandle } from '../three/globeScene.ts';
import type { City, GlobalAlertPayload, WeatherSnapshotPayload } from '../types.ts';
import '../styles/globe.css';

interface GlobeProps {
  cities: City[];
  snapshot: WeatherSnapshotPayload | null;
  selectedCityId: string;
  onSelectCity: (cityId: string) => void;
  lastAlert: GlobalAlertPayload | null;
}

export function Globe({ cities, snapshot, selectedCityId, onSelectCity, lastAlert }: GlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<GlobeHandle | null>(null);

  // Ref pattern (mirrors useSocket.ts's callbacksRef) so the scene isn't torn
  // down and rebuilt whenever Home.tsx re-renders with a new onSelectCity
  // closure — the WebGL scene is created exactly once per mount.
  const onSelectCityRef = useRef(onSelectCity);
  onSelectCityRef.current = onSelectCity;

  useEffect(() => {
    if (!containerRef.current) return;
    const globe = createGlobe(containerRef.current);
    globe.onCityClick((cityId) => onSelectCityRef.current(cityId));
    globeRef.current = globe;
    return () => {
      globe.dispose();
      globeRef.current = null;
    };
  }, []);

  useEffect(() => {
    globeRef.current?.setCities(cities);
  }, [cities]);

  useEffect(() => {
    if (snapshot) globeRef.current?.updateSnapshot(snapshot);
  }, [snapshot]);

  useEffect(() => {
    globeRef.current?.setSelectedCity(selectedCityId || null);
  }, [selectedCityId]);

  useEffect(() => {
    if (lastAlert) globeRef.current?.triggerRipple(lastAlert);
  }, [lastAlert]);

  return <div ref={containerRef} className="globe-canvas" />;
}
