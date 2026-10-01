import type { Card } from '../content/card';
import type { JourneyNode } from '../journeys/journeyTypes';

/**
 * A one-slot hand-off between screens: one side requests, the explore screen takes the request and acts
 * on it once it's showing again (e.g. after the reader's sheet has closed).
 */
export interface Handoff<T> {
  request(value: T): void;
  /** The pending request, if any; taking it clears it. */
  take(): T | null;
  subscribe(listener: () => void): () => void;
}

/** "Take a tangent →" on a reader peek card. */
export interface Tangent {
  card: Card;
  /** The Journey node the reader was at, so the hop joins the expedition there. */
  fromNodeId: string | null;
}

/** "Continue expedition": the columns to reopen, root first. */
export type ResumePoint = readonly JourneyNode[];

export type TangentQueue = Handoff<Tangent>;
export type ResumeQueue = Handoff<ResumePoint>;

export function createHandoff<T>(): Handoff<T> {
  let pending: T | null = null;
  const listeners = new Set<() => void>();
  return {
    request(value) {
      pending = value;
      listeners.forEach((listener) => listener());
    },
    take() {
      const value = pending;
      pending = null;
      return value;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
