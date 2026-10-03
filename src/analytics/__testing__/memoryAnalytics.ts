import type { Analytics } from '../analytics';
import type { AnalyticsEvent, AnalyticsEventName } from '../events';

type PropertiesOf<N extends AnalyticsEventName> = Extract<AnalyticsEvent, { name: N }>['properties'];

export interface MemoryAnalytics extends Analytics {
  events(): readonly AnalyticsEvent[];
  named<N extends AnalyticsEventName>(name: N): PropertiesOf<N>[];
  screens(): readonly string[];
  optedOut(): boolean;
}

/** Records what would have been sent, so tests can check it. */
export function memoryAnalytics(): MemoryAnalytics {
  let events: AnalyticsEvent[] = [];
  let screens: string[] = [];
  let optedOut = false;

  function named<N extends AnalyticsEventName>(name: N): PropertiesOf<N>[] {
    return events.filter((event) => event.name === name).map((event) => event.properties as PropertiesOf<N>);
  }

  return {
    track: (event) => {
      events = [...events, event];
    },
    screen: (route) => {
      screens = [...screens, route];
    },
    setOptedOut: (value) => {
      optedOut = value;
    },
    events: () => events,
    named,
    screens: () => screens,
    optedOut: () => optedOut,
  };
}
