import { PostHog } from 'posthog-react-native';
import { connectPostHogNative } from './posthogNative';

export const connectPostHog = connectPostHogNative((key, options) => new PostHog(key, options));
