export interface City {
  id: string;    // used as Socket.IO room key and API query param
  label: string; // display name in the UI
  lat: number;
  lng: number;
}

export const cities: City[] = [
  { id: 'melbourne', label: 'Melbourne', lat: -37.8136, lng: 144.9631 },
  { id: 'sydney',    label: 'Sydney',    lat: -33.8688, lng: 151.2093 },
  { id: 'brisbane',  label: 'Brisbane',  lat: -27.4698, lng: 153.0251 },
  { id: 'adelaide',  label: 'Adelaide',  lat: -34.9285, lng: 138.6007 },
  { id: 'perth',     label: 'Perth',     lat: -31.9505, lng: 115.8605 },
  { id: 'auckland',  label: 'Auckland',  lat: -36.8509, lng: 174.7645 },
  { id: 'london',    label: 'London',    lat:  51.5074, lng:  -0.1278 },
  { id: 'new-york',  label: 'New York',  lat:  40.7128, lng: -74.0060 },
];

export function findCity(id: string): City | undefined {
  return cities.find((c) => c.id === id);
}
