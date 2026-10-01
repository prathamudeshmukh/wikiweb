import { z } from 'zod';

// Only the fields Tangent reads. Everything from the network is validated here before use.

const cirrusDoc = z.object({
  source: z.object({
    weighted_tags: z.array(z.string()).optional(),
    popularity_score: z.number().optional(),
  }),
});

export const queryPageSchema = z.object({
  pageid: z.number().optional(),
  title: z.string(),
  missing: z.boolean().optional(),
  /** Search-generator rank (1-based). Pages arrive unordered; this restores relevance order. */
  index: z.number().optional(),
  description: z.string().optional(),
  extract: z.string().optional(),
  thumbnail: z.object({ source: z.string(), width: z.number(), height: z.number() }).optional(),
  pageprops: z.object({ disambiguation: z.string().optional() }).optional(),
  cirrusdoc: z.array(cirrusDoc).optional(),
});

export const queryResponseSchema = z.object({
  query: z.object({ pages: z.array(queryPageSchema).optional() }).optional(),
  continue: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
});

const feedPage = z.object({
  pageid: z.number().optional(),
  titles: z.object({ normalized: z.string() }),
});

export const featuredFeedSchema = z.object({
  tfa: feedPage.optional(),
  mostread: z.object({ articles: z.array(feedPage) }).optional(),
  onthisday: z.array(z.object({ pages: z.array(feedPage) })).optional(),
});

export type QueryPage = z.infer<typeof queryPageSchema>;
export type QueryResponse = z.infer<typeof queryResponseSchema>;
