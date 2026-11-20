import { useEffect, useState } from 'react';

const TZ = 'America/Toronto';
const TORONTO = { lat: 43.6532, lon: -79.3832 };

/** WMO weather interpretation codes (Open-Meteo) → short label */
function weatherLabel(code: number): string {
  if (code === 0) return 'Clear';
  if (code === 1) return 'Mainly clear';
  if (code === 2) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if (code === 45 || code === 48) return 'Fog';
  if (code >= 51 && code <= 57) return 'Drizzle';
  if (code >= 61 && code <= 67) return 'Rain';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Showers';
  if (code >= 85 && code <= 86) return 'Snow showers';
  if (code >= 95) return 'Thunderstorm';
  return '—';
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
};

export function useTorontoWeather(): TorontoWeather {
  const [state, setState] = useState<TorontoWeather>({
    loading: true,
    error: null,
    tempC: null,
    label: null,
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
        setState({
          loading: false,
          error: null,
          tempC: typeof temp === 'number' ? Math.round(temp) : null,
          label: typeof code === 'number' ? weatherLabel(code) : null,
        });
      } catch {
        if (!cancelled) {
          setState({
            loading: false,
            error: 'Weather unavailable',
            tempC: null,
            label: null,
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
