import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppServices } from '../services/AppServices';
import { useTheme } from '../theme/useTheme';
import { buildReaderDocument } from './readerDocument';
import { loadReaderFontFaces } from './readerFonts';

export type ArticleDocument =
  | { status: 'loading' }
  | { status: 'ready'; html: string }
  | { status: 'error'; error: Error };

const LOADING: ArticleDocument = { status: 'loading' };

/** Fetches an article and dresses it for the reader; re-runs when the title or theme changes. */
export function useArticleDocument(title: string): { document: ArticleDocument; retry(): void } {
  const { api } = useAppServices();
  const palette = useTheme();
  const [attempt, setAttempt] = useState(0);
  const request = useMemo(() => ({ title, palette, attempt }), [title, palette, attempt]);
  // A result is kept with the request it answers; a newer request reads as loading until its own result lands.
  const [settled, setSettled] = useState<{ request: typeof request; document: ArticleDocument } | null>(null);

  useEffect(() => {
    let current = true;
    const settle = (document: ArticleDocument) => current && setSettled({ request, document });
    Promise.all([api.articleHtml(request.title), loadReaderFontFaces()])
      .then(([html, fontFaceCss]) => settle({ status: 'ready', html: buildReaderDocument({ html, title: request.title, palette: request.palette, fontFaceCss }) }))
      .catch((error: unknown) => settle({ status: 'error', error: error instanceof Error ? error : new Error(String(error)) }));
    return () => {
      current = false;
    };
  }, [api, request]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  const document = settled?.request === request ? settled.document : LOADING;
  return { document, retry };
}
