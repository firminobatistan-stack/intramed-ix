import { useEffect, useState } from 'react';

export const REGISTRATION_DISPLAY_DEADLINE_MS = new Date(
  '2026-11-19T18:00:00-03:00'
).getTime();

export const REGISTRATION_HARD_CUTOFF_MS = new Date(
  '2026-11-19T18:10:00-03:00'
).getTime();

export function isRegistrationHardClosed(nowMs = Date.now()): boolean {
  return nowMs >= REGISTRATION_HARD_CUTOFF_MS;
}

export function formatRemainingCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

export function useRegistrationCountdown() {
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const remainingMs = Math.max(0, REGISTRATION_DISPLAY_DEADLINE_MS - nowMs);
  const isDisplayClosed = nowMs >= REGISTRATION_DISPLAY_DEADLINE_MS;
  const isHardClosed = nowMs >= REGISTRATION_HARD_CUTOFF_MS;

  return {
    remainingMs,
    isDisplayClosed,
    isHardClosed,
    formatted: formatRemainingCountdown(remainingMs),
  };
}
