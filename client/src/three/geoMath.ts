import { Vector3 } from 'three';

// Standard lat/lng → sphere-surface conversion matching the equirectangular
// UV layout of the earth_atmos texture. Every consumer (city markers, the
// sun-direction light) MUST use this same function, or positions will be
// rotated relative to real geography.
export function latLngToVector3(lat: number, lng: number, radius: number): Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

// Coarse subsolar-point approximation (no equation-of-time correction) —
// accurate to within a few degrees, which is plenty for a visual terminator.
export function getSubsolarPoint(date: Date): { lat: number; lng: number } {
  const startOfYear = Date.UTC(date.getUTCFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - startOfYear) / 86_400_000);
  const declination = -23.44 * Math.cos((Math.PI / 180) * (360 / 365) * (dayOfYear + 10));

  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  const lng = (((-(utcHours - 12) * 15) + 540) % 360) - 180;

  return { lat: declination, lng };
}
