import { Switch } from 'react-native';
import { useTheme } from '../theme/useTheme';
import type { UsageSharing } from './useUsageSharing';

/** The Share usage data switch, held until the saved choice has loaded (Settings and About, SPEC.md §11). */
export function UsageSharingSwitch({ usage }: { usage: UsageSharing }) {
  const palette = useTheme();
  const loading = usage.sharing === undefined;
  return (
    <Switch
      value={usage.sharing ?? false}
      disabled={loading}
      // Switch doesn't announce disabled on its own.
      accessibilityState={{ disabled: loading }}
      onValueChange={usage.setSharing}
      accessibilityLabel="Share usage data"
      trackColor={{ true: palette.ink, false: palette.line }}
    />
  );
}
