import type { Ref } from 'react';

/** What the reader can ask of the article on screen. */
export interface ArticleViewHandle {
  scrollTo(id: string): void;
}

/** The article itself: a WebView on native, a sandboxed iframe on web (SPEC.md §15.4). */
export interface ArticleViewProps {
  ref: Ref<ArticleViewHandle>;
  /** The reader document (`buildReaderDocument`). */
  html: string;
  background: string;
  /** A link the article tried to follow; returns whether to let it load (only the document itself should). */
  onLink: (url: string) => boolean;
}
