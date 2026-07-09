import { useEffect, useRef } from 'react';
import { createGlobe } from '../three/globeScene.ts';
import type { GlobeHandle } from '../three/globeScene.ts';
import type { City, GlobalAlertPayload, WeatherSnapshotPayload } from '../types.ts';
import '../styles/globe.css';

export interface FlyToRequest {
  cityId: string;
  nonce: number;
}

interface GlobeProps {
  cities: City[];
  snapshot: WeatherSnapshotPayload | null;
  selectedCityId: string;
  onSelectCity: (cityId: string) => void;
  lastAlert: GlobalAlertPayload | null;
  flyTo: FlyToRequest | null;
  watchedCityIds: string[];
}

export function Globe({
  cities,
  snapshot,
  selectedCityId,
  onSelectCity,
  lastAlert,
  flyTo,
  watchedCityIds,
}: GlobeProps) {
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

  // Keyed on `nonce`, not just cityId, so re-selecting the same city (e.g.
  // searching for it again after rotating away) still triggers a flight.
  useEffect(() => {
    if (flyTo) globeRef.current?.flyToCity(flyTo.cityId);
  }, [flyTo]);

  // Also re-runs when `cities` changes: the watchlist is hydrated from
  // localStorage synchronously at mount, often before the city list (and
  // therefore the markers themselves) have finished loading — without this
  // dependency, watch rings for a restored watchlist would silently never
  // get drawn on a fresh page load.
  useEffect(() => {
    globeRef.current?.setWatchedCities(watchedCityIds);
  }, [cities, watchedCityIds]);

  return <div ref={containerRef} className="globe-canvas" />;
}
