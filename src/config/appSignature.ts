import Constants from 'expo-constants';
import { Platform } from 'react-native';

/** Which build this is, as the feedback email and the About footer show it. */
export interface AppSignature {
  version: string;
  platform: string;
}

export function appSignature(): AppSignature {
  return { version: Constants.expoConfig?.version ?? 'unknown', platform: Platform.OS };
}
