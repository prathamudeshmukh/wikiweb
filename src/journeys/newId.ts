let counter = 0;

/** A locally unique id: time, a per-launch counter and some randomness — journeys never leave the device. */
export function newId(): string {
  counter += 1;
  return `${Date.now().toString(36)}-${counter.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
