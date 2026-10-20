import { posthog } from 'posthog-js';
import { connectPostHogWeb } from './posthogWeb';

export const connectPostHog = connectPostHogWeb((key, config) => posthog.init(key, config));
