export interface City {
  id: string;    // used as Socket.IO room key and API query param
  label: string; // display name in the UI
  lat: number;
  lng: number;
}

export const cities: City[] = [
  // Australia & Oceania
  { id: 'melbourne',     label: 'Melbourne',     lat: -37.8136, lng:  144.9631 },
  { id: 'sydney',        label: 'Sydney',        lat: -33.8688, lng:  151.2093 },
  { id: 'brisbane',      label: 'Brisbane',      lat: -27.4698, lng:  153.0251 },
  { id: 'adelaide',      label: 'Adelaide',      lat: -34.9285, lng:  138.6007 },
  { id: 'perth',         label: 'Perth',         lat: -31.9505, lng:  115.8605 },
  { id: 'hobart',        label: 'Hobart',        lat: -42.8821, lng:  147.3272 },
  { id: 'canberra',      label: 'Canberra',      lat: -35.2809, lng:  149.1300 },
  { id: 'auckland',      label: 'Auckland',      lat: -36.8509, lng:  174.7645 },
  // Asia
  { id: 'tokyo',         label: 'Tokyo',         lat:  35.6762, lng:  139.6503 },
  { id: 'singapore',     label: 'Singapore',     lat:   1.3521, lng:  103.8198 },
  { id: 'hong-kong',     label: 'Hong Kong',     lat:  22.3193, lng:  114.1694 },
  { id: 'mumbai',        label: 'Mumbai',        lat:  19.0760, lng:   72.8777 },
  { id: 'dubai',         label: 'Dubai',         lat:  25.2048, lng:   55.2708 },
  // Europe
  { id: 'london',        label: 'London',        lat:  51.5074, lng:   -0.1278 },
  { id: 'paris',         label: 'Paris',         lat:  48.8566, lng:    2.3522 },
  { id: 'berlin',        label: 'Berlin',        lat:  52.5200, lng:   13.4050 },
  { id: 'madrid',        label: 'Madrid',        lat:  40.4168, lng:   -3.7038 },
  { id: 'amsterdam',     label: 'Amsterdam',     lat:  52.3676, lng:    4.9041 },
  { id: 'stockholm',     label: 'Stockholm',     lat:  59.3293, lng:   18.0686 },
  { id: 'dublin',        label: 'Dublin',        lat:  53.3498, lng:   -6.2603 },
  // North America
  { id: 'new-york',      label: 'New York',      lat:  40.7128, lng:  -74.0060 },
  { id: 'toronto',       label: 'Toronto',       lat:  43.6532, lng:  -79.3832 },
  { id: 'chicago',       label: 'Chicago',       lat:  41.8781, lng:  -87.6298 },
  { id: 'san-francisco', label: 'San Francisco', lat:  37.7749, lng: -122.4194 },
  { id: 'vancouver',     label: 'Vancouver',     lat:  49.2827, lng: -123.1207 },
  // South America
  { id: 'sao-paulo',     label: 'São Paulo',     lat: -23.5505, lng:  -46.6333 },
  // Africa
  { id: 'cape-town',     label: 'Cape Town',     lat: -33.9249, lng:   18.4241 },
];

export function findCity(id: string): City | undefined {
  return cities.find((c) => c.id === id);
}
