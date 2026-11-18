import { useEffect, useState } from 'react';

export interface GyroTilt {
  /** Normalized horizontal tilt (-1 to 1, from gamma) */
  x: number;
  /** Normalized vertical tilt (-1 to 1, from beta) */
  y: number;
  active: boolean;
}

/**
 * Listens to mobile DeviceOrientation (gyroscope) and returns normalized [-1, 1] tilt.
 * Gracefully handles iOS 13+ permission on first user interaction.
 */
export function useGyroscopeTilt(enabled = true): GyroTilt {
  const [tilt, setTilt] = useState<GyroTilt>({ x: 0, y: 0, active: false });

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) {
      return;
    }

    let mounted = true;
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (!mounted) return;
      if (e.gamma == null && e.beta == null) return;
      const gamma = Math.max(-35, Math.min(35, e.gamma ?? 0));
      // Center beta around typical phone holding angle (~42 deg)
      const beta = Math.max(-35, Math.min(35, (e.beta ?? 42) - 42));
      setTilt({
        x: gamma / 35,
        y: beta / 35,
        active: true,
      });
    };

    const devOrient = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };

    if (typeof devOrient.requestPermission === 'function') {
      const requestOnGesture = async () => {
        try {
          const res = await devOrient.requestPermission!();
          if (res === 'granted' && mounted) {
            window.addEventListener('deviceorientation', handleOrientation, { passive: true });
          }
        } catch {
          // Ignore denied or non-gesture errors
        }
        window.removeEventListener('pointerdown', requestOnGesture);
      };
      window.addEventListener('pointerdown', requestOnGesture, { once: true, passive: true });
      return () => {
        mounted = false;
        window.removeEventListener('pointerdown', requestOnGesture);
        window.removeEventListener('deviceorientation', handleOrientation);
      };
    }

    window.addEventListener('deviceorientation', handleOrientation, { passive: true });
    return () => {
      mounted = false;
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [enabled]);

  return tilt;
}
