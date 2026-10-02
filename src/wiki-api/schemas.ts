import { z } from 'zod';

// Only the fields Tangent reads. Everything from the network is validated here before use.

const cirrusDoc = z.object({
  source: z.object({
    weighted_tags: z.array(z.string()).optional(),
    incoming_links: z.number().optional(),
    popularity_score: z.number().optional(),
  }),
});

export const queryPageSchema = z.object({
  pageid: z.number().optional(),
  ns: z.number().optional(),
  title: z.string(),
  missing: z.boolean().optional(),
  /** Search-generator rank (1-based). Pages arrive unordered; this restores relevance order. */
  index: z.number().optional(),
  description: z.string().optional(),
  extract: z.string().optional(),
  thumbnail: z.object({ source: z.string(), width: z.number(), height: z.number() }).optional(),
  pageprops: z.object({ disambiguation: z.string().optional() }).optional(),
  cirrusdoc: z.array(cirrusDoc).optional(),
  /** Only the links asked about via `pltitles`. */
  links: z.array(z.object({ title: z.string() })).optional(),
});

const titleMapping = z.array(z.object({ from: z.string(), to: z.string() }));

export const queryResponseSchema = z.object({
  query: z
    .object({
      pages: z.array(queryPageSchema).optional(),
      /** Requested title → canonical spelling (e.g. lowercase first letter). */
      normalized: titleMapping.optional(),
      /** Requested (normalised) title → redirect target. */
      redirects: titleMapping.optional(),
    })
    .optional(),
  continue: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
});

export const sectionsResponseSchema = z.object({
  parse: z.object({
    sections: z.array(z.object({ index: z.string(), line: z.string(), level: z.string() })),
  }),
});

export const sectionTextResponseSchema = z.object({
  parse: z.object({ text: z.string() }),
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

export const summarySchema = z.object({
  type: z.string(),
  pageid: z.number(),
  titles: z.object({ normalized: z.string() }),
  description: z.string().optional(),
  extract: z.string().optional(),
  thumbnail: z.object({ source: z.string(), width: z.number(), height: z.number() }).optional(),
});
