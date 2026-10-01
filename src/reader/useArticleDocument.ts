import { useCallback, useEffect, useState } from 'react';
import { useAppServices } from '../services/AppServices';
import { useTheme } from '../theme/useTheme';
import { buildReaderDocument } from './readerDocument';
import { loadReaderFontFaces } from './readerFonts';

export type ArticleDocument =
  | { status: 'loading' }
  | { status: 'ready'; html: string }
  | { status: 'error'; error: Error };

/** Fetches an article and dresses it for the reader; re-runs when the title or theme changes. */
export function useArticleDocument(title: string): { document: ArticleDocument; retry(): void } {
  const { api } = useAppServices();
  const palette = useTheme();
  const [document, setDocument] = useState<ArticleDocument>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    setDocument({ status: 'loading' });
    Promise.all([api.articleHtml(title), loadReaderFontFaces()])
      .then(([html, fontFaceCss]) => current && setDocument({ status: 'ready', html: buildReaderDocument({ html, title, palette, fontFaceCss }) }))
      .catch((error: unknown) => current && setDocument({ status: 'error', error: error instanceof Error ? error : new Error(String(error)) }));
    return () => {
      current = false;
    };
  }, [api, title, palette, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { document, retry };
}
