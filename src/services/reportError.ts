type ErrorSink = (scope: string, error: unknown) => void;

let sink: ErrorSink | null = null;

/** Where reported errors go besides the dev console — analytics' `app_error` (SPEC.md §11), set up with the app's services. */
export function setErrorSink(next: ErrorSink | null): void {
  sink = next;
}

function logInDev(scope: string, error: unknown): void {
  if (__DEV__) {
    console.warn(`[tangent:${scope}]`, error instanceof Error ? error.message : error);
  }
}

/**
 * Single place errors that don't reach the UI are reported: logged in development and passed to the sink.
 * Never pass PII or article history; the sink keeps only a title-free reason.
 */
export function reportError(scope: string, error: unknown): void {
  logInDev(scope, error);
  try {
    sink?.(scope, error);
  } catch (sinkError) {
    // Reporting must never take down the code that reported.
    logInDev('errorSink', sinkError);
  }
}
