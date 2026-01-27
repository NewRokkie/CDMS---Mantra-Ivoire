import { useEffect } from 'react';

export const useKey = (key: string, callback: () => void, opts?: { when?: boolean }) => {
  useEffect(() => {
    if (opts?.when === false) return;
    const handler = (e: KeyboardEvent) => e.key === key && callback();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [key, callback, opts?.when]);
};
