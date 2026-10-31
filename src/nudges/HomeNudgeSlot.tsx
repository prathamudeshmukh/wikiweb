import type { GestureType } from 'react-native-gesture-handler';
import { FeedbackCard } from '../feedback/FeedbackCard';
import type { FeedbackAnswer } from '../feedback/useFeedbackAnswer';
import { NudgeCard } from './NudgeCard';
import type { HomeNudgeView } from './useHomeNudge';

interface HomeNudgeSlotProps {
  nudge: HomeNudgeView;
  feedback: FeedbackAnswer;
  width: number;
  height: number;
  enabled: boolean;
  columnPan: GestureType;
}

/** Whatever Home's single nudge slot holds (SPEC.md §3.9, §3.10). */
export function HomeNudgeSlot({ nudge, feedback, width, height, enabled, columnPan }: HomeNudgeSlotProps) {
  const due = nudge.nudge;
  if (!due) return null;
  if (due.kind === 'feedback') {
    return (
      <FeedbackCard
        nudge={due}
        width={width}
        height={height}
        enabled={enabled}
        onRate={feedback.rate}
        onEmail={feedback.email}
        onDismiss={nudge.onDismiss}
        columnPan={columnPan}
      />
    );
  }
  return (
    <NudgeCard
      nudge={due}
      chips={nudge.chips}
      pickedChips={nudge.pickedChips}
      width={width}
      height={height}
      enabled={enabled}
      onChip={nudge.onChip}
      onOpenTree={nudge.onOpenTree}
      onDismiss={nudge.onDismiss}
      columnPan={columnPan}
    />
  );
}
