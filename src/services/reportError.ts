/**
 * Single place errors that don't reach the UI are reported. Today it logs in development only;
 * crash/analytics reporting plugs in here (SPEC.md §11). Never pass PII or article history.
 */
export function reportError(scope: string, error: unknown): void {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.warn(`[tangent:${scope}]`, error instanceof Error ? error.message : error);
  }
}
