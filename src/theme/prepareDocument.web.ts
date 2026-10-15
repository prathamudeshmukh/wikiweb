/** Stops the browser claiming the app's drags (SPEC.md §15.3). */
export function prepareDocument(): void {
  // Overscrolling sideways would otherwise bounce the page or start the browser's own back/forward swipe.
  for (const element of [document.documentElement, document.body]) element.style.overscrollBehaviorX = 'none';
  // A mouse drag that starts on a card's picture would otherwise become a native image drag, and the swipe never starts.
  document.addEventListener('dragstart', (event) => {
    if (event.target instanceof HTMLImageElement) event.preventDefault();
  });
}
