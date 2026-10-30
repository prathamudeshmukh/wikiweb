/**
 * A ref for a column's list that reports where it came to rest. Native reports through the list's own drag and
 * momentum callbacks instead, so it needs no ref.
 */
export function useScrollSettled(_onSettled: (offset: number) => void): undefined {
  return undefined;
}
