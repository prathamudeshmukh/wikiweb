import { useCallback, useEffect, useState } from 'react';
import { reportError } from '../services/reportError';

export type Loaded<T> = { status: 'loading' } | { status: 'ready'; value: T } | { status: 'error' };

/** Runs `load` on mount (and on retry), ignoring results that arrive after unmount. `load` should be stable. */
export function useLoaded<T>(scope: string, load: () => Promise<T>): { state: Loaded<T>; retry: () => void } {
  const [state, setState] = useState<Loaded<T>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    load().then(
      (value) => current && setState({ status: 'ready', value }),
      (error: unknown) => {
        reportError(scope, error);
        if (current) setState({ status: 'error' });
      },
    );
    return () => {
      current = false;
    };
  }, [scope, load, attempt]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }, []);
  return { state, retry };
}
