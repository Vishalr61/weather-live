import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

export type TempUnit = 'celsius' | 'fahrenheit';

interface UnitContextValue {
  unit: TempUnit;
  toggleUnit: () => void;
  // All temperature data from the server is Celsius — this is the one place
  // that knows how to display it, so components consume this instead of
  // reading `unit` and converting themselves everywhere a number is shown.
  formatTemp: (celsius: number) => string;
  convertTemp: (celsius: number) => number;
}

const STORAGE_KEY = 'weatherlive:unit';

const UnitContext = createContext<UnitContextValue | null>(null);

function celsiusToFahrenheit(c: number): number {
  return (c * 9) / 5 + 32;
}

function getInitialUnit(): TempUnit {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'fahrenheit' ? 'fahrenheit' : 'celsius';
}

export function UnitProvider({ children }: { children: ReactNode }) {
  const [unit, setUnit] = useState<TempUnit>(getInitialUnit);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, unit);
  }, [unit]);

  const toggleUnit = useCallback(() => {
    setUnit((u) => (u === 'celsius' ? 'fahrenheit' : 'celsius'));
  }, []);

  const convertTemp = useCallback(
    (celsius: number) => (unit === 'fahrenheit' ? celsiusToFahrenheit(celsius) : celsius),
    [unit]
  );

  const formatTemp = useCallback(
    (celsius: number) => {
      const value = Math.round(convertTemp(celsius));
      return unit === 'fahrenheit' ? `${value}°F` : `${value}°C`;
    },
    [unit, convertTemp]
  );

  return (
    <UnitContext.Provider value={{ unit, toggleUnit, formatTemp, convertTemp }}>
      {children}
    </UnitContext.Provider>
  );
}

export function useUnit(): UnitContextValue {
  const ctx = useContext(UnitContext);
  if (!ctx) throw new Error('useUnit must be used within <UnitProvider>');
  return ctx;
}
