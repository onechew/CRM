import { useEffect, useState } from 'react';

const TZ = 'America/Toronto';
const TORONTO = { lat: 43.6532, lon: -79.3832 };

/** WMO weather interpretation codes (Open-Meteo) → short label + icon */
function weatherInfo(code: number): { label: string; icon: string } {
  if (code === 0) return { label: 'Clear', icon: '☀️' };
  if (code === 1) return { label: 'Mainly clear', icon: '🌤️' };
  if (code === 2) return { label: 'Partly cloudy', icon: '⛅' };
  if (code === 3) return { label: 'Overcast', icon: '☁️' };
  if (code === 45 || code === 48) return { label: 'Fog', icon: '🌫️' };
  if (code >= 51 && code <= 57) return { label: 'Drizzle', icon: '🌦️' };
  if (code >= 61 && code <= 67) return { label: 'Rain', icon: '🌧️' };
  if (code >= 71 && code <= 77) return { label: 'Snow', icon: '🌨️' };
  if (code >= 80 && code <= 82) return { label: 'Showers', icon: '🌧️' };
  if (code >= 85 && code <= 86) return { label: 'Snow showers', icon: '🌨️' };
  if (code >= 95) return { label: 'Thunderstorm', icon: '⛈️' };
  return { label: '—', icon: '🌡️' };
}

export function formatTorontoDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function formatTorontoTime(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export type TorontoWeather = {
  loading: boolean;
  error: string | null;
  tempC: number | null;
  label: string | null;
  icon: string | null;
};

export function useTorontoWeather(): TorontoWeather {
  const [state, setState] = useState<TorontoWeather>({
    loading: true,
    error: null,
    tempC: null,
    label: null,
    icon: null,
  });

  useEffect(() => {
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${TORONTO.lat}&longitude=${TORONTO.lon}` +
      `&current=temperature_2m,weather_code` +
      `&timezone=${encodeURIComponent(TZ)}`;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Weather ${res.status}`);
        const data = (await res.json()) as {
          current?: { temperature_2m?: number; weather_code?: number };
        };
        if (cancelled) return;
        const temp = data.current?.temperature_2m;
        const code = data.current?.weather_code;
        const info = typeof code === 'number' ? weatherInfo(code) : null;
        setState({
          loading: false,
          error: null,
          tempC: typeof temp === 'number' ? Math.round(temp) : null,
          label: info?.label ?? null,
          icon: info?.icon ?? null,
        });
      } catch {
        if (!cancelled) {
          setState({
            loading: false,
            error: 'Weather unavailable',
            tempC: null,
            label: null,
            icon: null,
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

export const TORONTO_TZ_LABEL = 'America/Toronto';
