# Tangent — v1 Specification

> Browse Wikipedia as a web of columns. Every left swipe goes one hop deeper.

Status: Draft · 2026-10-01 · Visual design: [DESIGN.md](./DESIGN.md)

---

## 1. Overview

Tangent is a phone app (iOS + Android) for exploring Wikipedia through swipe decisions instead of search. The user starts in an interest-based feed of article cards. Left-swiping a card opens a new **column** — an infinite feed of articles connected to that card. Right-swiping goes back. Tapping reads. Every session becomes a **Journey**: a saved tree of the hops the user took.

### Goals
- Make wandering through Wikipedia feel playful and spatial, not like search.
- Every hop follows a real connection (hyperlinks first).
- Left swipes feel instant.
- Runs entirely on-device against public Wikimedia APIs — no backend.

### Non-goals (v1)
| Out | Reason |
|---|---|
| Map / graph view of a Journey | v2 — data model supports it now |
| Learning from behaviour | Needs scoring + storage; topic picks suffice |
| Accounts, cloud sync | Requires backend + auth |
| Non-English Wikipedias | Multiplies tiles, filters, QA |
| Sharing Journeys | Pairs with map view in v2 |
| Bookmarks / save list | Journeys already record reads |
| Monetisation | Prove usage first |

---

## 2. Glossary

| Term | Meaning |
|---|---|
| **Card** | One article preview: title, image (or typographic fallback), topic label, 2–3 sentence extract, why-line (how it connects to the seed), visited/read badges |
| **Territory** | One of 7 colour groups (Life, Cosmos, Earth, Past, Culture, Mind, Craft) that the 20 topics map into |
| **Stamp** | Collectible badge for a topic, earned the first time the user reads an article tagged with it |
| **Column** | Vertical, infinitely paginated feed of cards built around one **seed** article. Home is the root column (seeded by interests, not an article). |
| **Hop** | A left swipe (or peek-card *Explore*) that opens a new column |
| **Path** | The chain of seeds from Home to the current column, shown as the breadcrumb |
| **Journey** | Persisted tree (graph-ready) of all hops/reads in one exploration session |
| **Node** | One article occurrence in a Journey. Several nodes may share an article ID. |

---

## 3. User flows

### 3.1 Onboarding (first launch only)
1. Screen shows 20 typographic tiles (territory colour, topic icon, name).
2. User selects ≥ 3. **Continue** disabled until 3 are picked. **Skip** uses defaults (`Science`, `History`, `Culture`).
3. Selections persisted; user lands on Home.

Interests are editable later from Settings.

### 3.2 Home feed
Infinite column composed per page of 20 cards:

| Share | Source |
|---|---|
| ~70 % | Interest picks — `articletopic:<topic> incategory:Featured_articles`, topping up from `incategory:Good_articles` when a topic runs low; titles matching the Home blocklist (config) are skipped. Columns are **not** filtered this way. |
| ~20 % | Today on Wikipedia — featured article, On this day, most-read |
| ~10 % | Wildcard — a Featured article from a topic tile the user did **not** pick (rotating). `generator=random` was dropped: live results were mostly obscure stubs. |

Mix is interleaved deterministically (e.g. pattern of 10: `I I W? I T I I T I I`) so the feed never clumps.

### 3.3 Exploring
- **Left swipe** a card → new column seeded by it, pushed onto the path. If no Journey is active, one is created (first hop from Home starts a Journey).
- **Right swipe** anywhere → pop to parent column, restored at its previous scroll offset; the card we came from pulses briefly.
- **Breadcrumb tap** → jump directly to that column (pops everything above it).

### 3.4 Reading
- **Tap** card → reader sheet slides up over the current column. Swipe down to dismiss.
- **Tap inline link** in the reader → peek card (title, image, description) with:
  - **Explore →** — dismiss reader, open column seeded by the link (counts as a hop).
  - **Read** — replace reader contents with the linked article.
- Both actions add a node to the active Journey. Opening any article in the reader marks it **read**.

### 3.5 Journeys
- **Logbook** screen (from Home header): stamps grid (collected / 20) and expeditions list (title, date, hop count, territory route strip).
- Opening an expedition shows its **recap card** (start → end, route strip, tangents/read counts, furthest leap). **Continue expedition** restores its path to the most recent node; a node list reopens any column.

### 3.6 Learning layer
- **Stamps:** reading an article (reader open) whose top topic the user has no stamp for awards that stamp.
- **New territory toast:** a hop into a card whose territory is outside the user's chosen interests shows a stamp toast (once per territory per expedition).
- No quizzes, XP or streaks.

---

## 4. Interaction spec

### 4.1 Gestures
| Gesture | Where | Effect |
|---|---|---|
| Vertical drag | Column | Scroll |
| Horizontal drag left | On a card | Card follows finger; "Explore →" + preview of next column's first titles revealed behind it |
| Release left past threshold | On a card | Commit hop: card expands into new column, breadcrumb grows, light haptic |
| Release left under threshold | On a card | Spring back, no-op |
| Horizontal drag right | Anywhere in a non-root column | Column slides off revealing parent; commit past threshold |
| Right on Home | Home | Rubber-band bounce, no-op |
| System back (Android button / gesture, iOS edge swipe) | Anywhere | Same as right swipe |
| Tap | Card | Open reader |
| Swipe down | Reader sheet | Dismiss |

### 4.2 Constants
Validated on a real Android phone in the M0 gesture prototype (2026-10-01): preset **A** (these values) felt right over the looser (25 % / 500 px/s / 5°) and firmer (50 % / 1200 px/s / no tilt) alternatives.

```ts
SWIPE_COMMIT_RATIO       = 0.35   // of card width
SWIPE_COMMIT_VELOCITY    = 800    // px/s flick
DIRECTION_LOCK_SLOP      = 10     // px before axis is locked
DWELL_PREFETCH_MS        = 600
DWELL_VISIBLE_RATIO      = 0.75
MAX_CONCURRENT_PREFETCH  = 3
COLUMN_PAGE_SIZE         = 20
PAGINATE_THRESHOLD       = 5      // cards from end
BACKLINK_EVERY_N         = 4      // insert one backlink per N link cards
CARD_CACHE_TTL_HOURS     = 24
MIN_INTEREST_PICKS       = 3
```

### 4.3 Direction lock
First axis to exceed `DIRECTION_LOCK_SLOP` owns the touch until release. Prevents diagonal drags from half-scrolling and half-swiping.

### 4.4 Discoverability
First launch only: the 2nd Home card performs one left "wiggle" with caption *Swipe left to go deeper*. Flag persisted after shown.

---

## 5. Content engine

### 5.1 Column builder (non-root)
For seed article `S` and current path `P`:

1. **Links** — `S`'s own article links **in reading order**, one top-level section at a time (lead first), fetched lazily as the column scrolls. Reference-type sections (*Notes, References, External links, Further reading, Bibliography, Sources, Citations, Footnotes*) are skipped; infobox/navbox tables, citation markers and hatnotes are ignored.
2. **Backlinks** — namespace-0 non-redirect pages linking to `S`; one inserted every `BACKLINK_EVERY_N` link cards.
3. **morelike** — once links are exhausted, `morelike:S` search pages keep the column infinite.

Then apply, in order:
- **Filter** (§5.3)
- **Dedup** within column by `pageid`
- **Exclude path** — drop any `pageid` in `P` (including `S`)
- **Annotate** — `source` (for the why-line), `topic` (§5.4), `visited` if `pageid` appears elsewhere in the active Journey; `read` if in read history
- **Topic** — cards first render with the seed's territory; real topics are resolved in a separate background call and merged in (see §6 latency note)

Column builder is a pure function over fetched candidates + context, so it is fully unit-testable.

### 5.2 Home builder
Interleave three source streams (§3.2). Same filter, dedup, and annotation steps; no path exclusion.

### 5.3 Quality filter
Drop:
- Disambiguation pages (`pageprops.disambiguation`)
- Titles matching `^List of`, `^Lists of`, `^Index of`, `^Outline of`
- Pure year/date titles (`^\d{1,4}( BC| AD)?$`, `^(January|…|December) \d{1,2}$`)
- Pages with neither description nor extract

Keep everything else. Image-less pages render as typographic cards.

### 5.4 Card topics
Topics are resolved **after** a page of cards is shown (one `cirrusdoc` call per page, ~1.5 s), never on the critical path. Until then a card uses its fallback (column seed's territory; on Home the interest tile it came from).

Each card's topic = highest-scoring `articletopic` tag from `prop=cirrusdoc` (`weighted_tags`), mapped to a tile and its territory. Untagged → neutral ink style, no label. **Fallback** if `cirrusdoc` is unusable: use the seed column's topic. Coverage verified on sample pages; coarse-only articles handled per §6 topic note.

### 5.5 Interest tiles → topics
Tiles map to one or more ORES `articletopic` IDs. Initial set (tunable):

| Tile | articletopic |
|---|---|
| Space | `space` |
| Animals | `biology` |
| History | `history`, `military-and-warfare` |
| Music | `music` |
| Film & TV | `films`, `television` |
| Food | `food-and-drink` |
| Sport | `sports` |
| Tech | `computing`, `technology` |
| Art | `visual-arts` |
| Books | `literature` |
| Places | `geographical` |
| Philosophy | `philosophy-and-religion` |
| Science | `physics`, `chemistry` |
| Maths | `mathematics` |
| Medicine | `medicine-and-health` |
| Games | `video-games` |
| Earth | `earth-and-environment` |
| Society | `society`, `politics-and-government` |
| Business | `business-and-economics` |
| Transport | `transportation` |

Mapping lives in a config file, not code.

---

## 6. Wikimedia API usage

All requests to `https://en.wikipedia.org` send both `User-Agent` and `Api-User-Agent: Tangent/<version> (<contact>)` (native apps can set the real User-Agent; Api-User-Agent covers browser builds). The contact comes from `EXPO_PUBLIC_WIKI_API_CONTACT`, never from code.

**Throttling (observed 2026-10-01):** Wikimedia answers bursts with `429` and a `Retry-After` in seconds. The client honours it (capped at 10 s) and otherwise backs off 300 ms → 600 ms over 3 attempts. Measured burst cap: **10 back-to-back requests, then 429** for the rest of the window — identical with or without a real `User-Agent`. A column's first page costs ~4–5 requests, so **M5 needs a client-side request budget** (e.g. token bucket shared by feeds, prefetch and reader) and prefetch must stay within it (max 3 concurrent prefetches is not enough on its own).

| Need | Endpoint |
|---|---|
| Card data (by title) | `w/api.php?action=query&titles=…&redirects=1&prop=pageimages\|description\|extracts\|pageprops&piprop=thumbnail&pithumbsize=500&exintro&explaintext&exsentences=2&exlimit=20&ppprop=disambiguation&format=json&formatversion=2` |
| Backlinks | same props with `generator=backlinks&gbltitle=S&gblnamespace=0&gblfilterredir=nonredirects` |
| morelike | same props with `generator=search&gsrsearch=morelike:S&gsrlimit=20&gsroffset=N` |
| Interest feed | `generator=search&gsrsearch=articletopic:<topic>&gsrlimit=20&gsroffset=N` |
| Today | `api/rest_v1/feed/featured/YYYY/MM/DD` |
| Wildcard | `articletopic:<non-interest tile> incategory:Featured_articles` |
| Reader | `api/rest_v1/page/mobile-html/<title>` |
| Peek card | `api/rest_v1/page/summary/<title>` |

**Batching note:** TextExtracts returns at most 20 intro extracts per request, so card-detail batches are 20 — matching `COLUMN_PAGE_SIZE`. Link lists themselves are fetched in full (paged with `continue`) and hydrated 20 at a time.

**Topic note (verified 2026-10-01):** `cirrusdoc` returns the search index document; we read only `weighted_tags` entries prefixed `classification.prediction.articletopic/`. Values are hierarchical with a score, e.g. `STEM.Biology|952`, `STEM.Mathematics|941`. Rules:
- Ignore the coarse `*` buckets (`STEM.STEM*`, `Culture.Culture*`, …) when a specific tag exists; pick the highest-scoring specific tag.
- Only coarse tags (e.g. *Iron gall ink* → `STEM.STEM*|712` only): map the bucket to a territory default (STEM → Cosmos, Culture → Culture, Geography → Earth, History_and_Society → Past) with **no topic label** — colour only.
- Minimum score 500, else untagged.

**Ranking note (verified 2026-10-01, revised):** popularity ranking was tried and dropped. `cirrusdoc` popularity for 500 links takes ~14 s, and pure popularity surfaces citation and navbox links (*Wayback Machine, Oxford English Dictionary, Alaska*) rather than the article's subject matter. Reading order is both fast and relevant — Octopus lead: *Mollusc → Cephalopod → Squid → Cuttlefish → … → Camouflage → Venom → Blue-ringed octopus*.

| Need | Call | Measured |
|---|---|---|
| Section list | `action=parse&page=S&prop=sections` | ~0.5 s, 6 KB |
| Links of one section, in order | `action=parse&page=S&section=N&prop=text&disableeditsection=1&disablelimitreport=1` → extract `/wiki/` hrefs | ~1–2 s, ~24 KB (lead) |
| Card details for ≤20 titles | `action=query&titles=…&redirects=1&prop=pageimages\|description\|extracts\|pageprops` | ~0.6 s, ~13 KB |
| Topics for ≤20 pages (background) | `action=query&pageids=…&prop=cirrusdoc&cdincludes=weighted_tags` | ~1.5 s, ~20 KB |

**Payload note (verified):** `cirrusdoc` **must** be called with `cdincludes` — without it a 20-card batch is ~2.1 MB; with `cdincludes=weighted_tags` it is ~26 KB. The API marks `cirrusdoc` as internal ("might change at any time without notice"), so the seed-topic fallback in §5.4 is mandatory, not optional.

**Content note (verified):** raw `articletopic:biology` ranks *Anal sex* and *Oral sex* in its top five. Hence the Featured → Good restriction for Home (§3.2). Featured-only pools are still large (743 biology, ~490 space).

---

## 7. Performance

- **Prefetch on dwell:** card ≥ 75 % visible for 600 ms → fetch first page of its column (feeds the swipe-preview and makes the hop instant). Max 3 concurrent; cancel on scroll-away.
- **Pagination:** next page when ≤ 5 cards remain.
- **Caches:**
  - In-memory LRU of built columns for this session (path columns pinned).
  - SQLite card cache keyed by `pageid`, TTL 24 h.
- **Images:** request thumbnails at a standard Wikimedia step (`pithumbsize=500`, or 960 on 3× screens); non-standard widths (e.g. 640) are rejected by the thumbnail server (verified). Use `expo-image` with disk caching.
- **Hop architecture (validated in M0):** mount the next column offscreen when a card *starts* dragging (data comes from dwell prefetch); on release, start one UI-thread spring on a shared `progress` value that drives the flying card, incoming column, first-card rise and breadcrumb route. React only files the column into the stack after it lands. Mounting at release caused a ~300 ms stall.
- Push/flight springs are overshoot-clamped; an overshooting full-screen push exposes the parent column.
- **Targets:** hop with warm prefetch < 150 ms to first card; cold hop < 1.5 s on 4G; 60 fps during swipes.

---

## 8. Empty, error and edge states

| State | Behaviour |
|---|---|
| Offline at column end | "You're offline" card; cached columns and Journeys still browsable |
| Column has zero results | "Dead end — swipe right to go back" card |
| API error | Retry with backoff (3×), then inline "Couldn't load — tap to retry" card |
| Reader fails | Sheet shows error + "Open on Wikipedia" fallback |
| Attribution | Reader footer always shows `From Wikipedia · CC BY-SA 4.0` + source link; About lists licences |
| Article redirected | Resolve to target title; use target `pageid` for dedup |
| Very deep path | No cap; breadcrumb collapses middle crumbs to `…` beyond 4 |

---

## 9. Data model (SQLite via `expo-sqlite`)

```sql
CREATE TABLE journeys (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,           -- "From <first hop title>…"
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL,
  last_node_id  TEXT
);

CREATE TABLE journey_nodes (
  id              TEXT PRIMARY KEY,
  journey_id      TEXT NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
  parent_node_id  TEXT REFERENCES journey_nodes(id),
  page_id         INTEGER NOT NULL,      -- shared across nodes → graph in v2
  title           TEXT NOT NULL,
  via             TEXT NOT NULL CHECK (via IN ('swipe','peek_explore','peek_read')),
  created_at      INTEGER NOT NULL
);
CREATE INDEX idx_nodes_journey ON journey_nodes(journey_id);
CREATE INDEX idx_nodes_page    ON journey_nodes(page_id);

CREATE TABLE read_history (
  page_id        INTEGER PRIMARY KEY,
  first_read_at  INTEGER NOT NULL,
  last_read_at   INTEGER NOT NULL
);

CREATE TABLE card_cache (
  page_id     INTEGER PRIMARY KEY,
  payload     TEXT NOT NULL,             -- JSON Card
  fetched_at  INTEGER NOT NULL
);
```

```sql
CREATE TABLE stamps (
  topic       TEXT PRIMARY KEY,         -- tile id, e.g. 'maths'
  page_id     INTEGER NOT NULL,         -- article that earned it
  earned_at   INTEGER NOT NULL
);
```

`read_history` and `card_cache` payloads include `topic`. Recap stats are derived from `journey_nodes` + `card_cache`, not stored.

Key-value storage: `theme: 'system'|'paper'|'night'`, `reduceMotion: 'system'|'on'`, `interests: string[]`, `onboardingDone: boolean`, `swipeHintShown: boolean`.

All repository functions return new objects; no in-place mutation of domain state.

---

## 10. Architecture

**Stack:** Expo (managed) · React Native · TypeScript (strict) · `react-native-gesture-handler` · `react-native-reanimated` · `react-native-webview` · `expo-sqlite` · `expo-image` · `expo-haptics` · `posthog-react-native`. Input validation of API responses with `zod`.

**Feature-oriented layout:**
```
src/
  wiki-api/        typed client, zod schemas, request batching, user-agent
  content/         column builder, home builder, quality filter, topic map (pure)
  columns/         column stack state, pager, card, swipe gesture, breadcrumb
  reader/          reader sheet, webview bridge, peek card
  journeys/        repository, journey store, recap
  logbook/         logbook screen, stamps, settings
  theme/           tokens (DESIGN.md §2–4), fonts, territory map
  onboarding/      tiles screen, interests store
  prefetch/        dwell tracker, prefetch queue, caches
  analytics/       event constants + thin PostHog wrapper
  config/          constants (§4.2), tile→topic map
```

`content/` depends only on interfaces of `wiki-api/` (injected), never on React.

**Navigation state:** an immutable column stack `Column[]` (each: seed, cards, cursor, scrollOffset). Push on hop, pop on back, slice on breadcrumb jump.

---

## 11. Analytics (PostHog, minimal)

| Event | Properties |
|---|---|
| `swipe_left` | `depth`, `source` (`link`/`backlink`/`morelike`/`home_interest`/`home_today`/`home_wildcard`) |
| `swipe_right` | `depth` |
| `read_open` | `depth`, `entry` (`card`/`peek_read`) |
| `journey_depth` | `max_depth`, `node_count` — sent when a Journey goes idle / app backgrounds |
| `stamp_earned` | `topic`, `territory` |

No article titles, no PII. Anonymous distinct ID. Opt-out toggle in Settings.

---

## 12. Testing

Target ≥ 80 % coverage; TDD for `content/`, `wiki-api/`, `journeys/`.

- **Unit (Jest):** column builder (mixing, dedup, path exclusion, visited/read annotation), quality filter regexes, home interleave, tile→topic mapping, breadcrumb collapse, column-stack push/pop/jump.
- **Integration:** `wiki-api` against recorded JSON fixtures (incl. `continue` paging, redirects, disambiguation); journey repository against in-memory SQLite.
- **E2E (Maestro):** onboarding → Home; left swipe ×2 → breadcrumb shows 3 crumbs; right swipe returns to same scroll position; tap → reader → inline link → Explore creates column; reopen Journey from list.
- **Manual device checks:** swipe feel, direction lock, Android back, iOS edge swipe.

---

## 13. Milestones

| # | Milestone | Exit criteria |
|---|---|---|
| M0 | **Gesture prototype** (throwaway) | Static fake cards; column push/pop with left/right swipe + direction lock feels right on a real phone |
| M1 ✅ | API client + content engine | Builders pass unit/integration tests against fixtures — done 2026-10-01: 98 tests, ~98 % coverage, live smoke test (`npm run test:live`) |
| M2 | Columns + Home + onboarding | Live infinite Home; hops into real columns |
| M3 | Reader + peek card | Inline links intercepted; Explore/Read work |
| M4 | Journeys + breadcrumb | Persisted, reopenable Journeys; visited/read badges |
| M5 | Prefetch, caches, states, analytics | Perf targets met; all §8 states; events firing |

---

## 14. Risks & open questions

| Risk / question | Mitigation / note |
|---|---|
| Vertical scroll vs horizontal card swipe conflict | M0 prototype de-risks before any API work |
| Link lists dominated by low-value links | Pageview ranking + filter; revisit with lead-section boost if columns feel flat |
| `pageviews` prop is slow / sparse for some pages | Fall back to alphabetical-with-images-first |
| Wikimedia rate limiting (burst cap ≈ 10 requests measured) | Batching, caching, Retry-After honoured; shared client-side request budget in M5 |
| Reader HTML styling drift | Own CSS injected; test on a set of varied articles |
| Open: lead-section links ranked higher? | Decide after M2 dogfooding |
| Open: Journey "idle" definition for closing a session | Proposal: 30 min background or returning to Home |
| Name "Tangent" | Check App Store / Play Store / domain availability. Do not use "Wikipedia" or Wikimedia marks in name or icon |
