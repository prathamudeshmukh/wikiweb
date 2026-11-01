import Constants from 'expo-constants';
import { Linking, Platform } from 'react-native';
import { FEEDBACK } from '../config/constants';
import { reportError } from '../services/reportError';

interface MailSignature {
  version: string;
  platform: string;
}

/** The Settings row's and opted-out card's email (SPEC.md §3.10): signed with version and platform, nothing else. */
export function feedbackMailto({ version, platform }: MailSignature): string {
  const body = `\n\n— Tangent ${version} · ${platform}`;
  return `mailto:${FEEDBACK.email}?subject=${encodeURIComponent(FEEDBACK.mailSubject)}&body=${encodeURIComponent(body)}`;
}

/** Opens the user's mail app; when none opens, the address shown beside the button is the way through. */
export async function openFeedbackMail(): Promise<void> {
  const url = feedbackMailto({ version: Constants.expoConfig?.version ?? 'unknown', platform: Platform.OS });
  try {
    await Linking.openURL(url);
  } catch (error) {
    reportError('feedback.mailto', error);
  }
}
