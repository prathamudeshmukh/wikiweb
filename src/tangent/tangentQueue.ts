import type { Card } from '../content/card';

/**
 * Hand-off from the reader to the explore screen: the reader requests a tangent ("Take a tangent →"
 * on a peek card), closes, and the explore screen takes the request and runs the hop.
 */
export interface TangentQueue {
  request(card: Card): void;
  /** The pending request, if any; taking it clears it. */
  take(): Card | null;
  subscribe(listener: () => void): () => void;
}

export function createTangentQueue(): TangentQueue {
  let pending: Card | null = null;
  const listeners = new Set<() => void>();
  return {
    request(card) {
      pending = card;
      listeners.forEach((listener) => listener());
    },
    take() {
      const card = pending;
      pending = null;
      return card;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
