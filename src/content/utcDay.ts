/** `YYYY-MM-DD` in UTC — the day Wikipedia's featured feed is keyed by. */
export const utcDay = (date: Date): string => date.toISOString().slice(0, 10);
