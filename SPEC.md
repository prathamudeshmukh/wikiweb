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
| Monetisation | Prove usage first |

---

## 2. Glossary

| Term | Meaning |
|---|---|
| **Card** | One article preview: title, image (or typographic fallback), topic label, extract (intro capped at ~600 characters, trimmed to fit the card), why-line (how it connects to the seed), visited/read badges |
| **Territory** | One of 7 colour groups (Life, Cosmos, Earth, Past, Culture, Mind, Craft) that the 24 topics map into |
| **Stamp** | Collectible badge for a topic, earned the first time the user reads an article tagged with it |
| **Column** | Vertical, infinitely paginated feed of cards built around one **seed** article. Home is the root column (seeded by interests, not an article). |
| **Hop** | A left swipe (or peek-card *Explore*) that opens a new column |
| **Path** | The chain of seeds from Home to the current column, shown as the breadcrumb |
| **Journey** | Persisted tree (graph-ready) of all hops/reads in one exploration session |
| **Node** | One article occurrence in a Journey. Several nodes may share an article ID. |
| **Find** | An article the user kept with ✦ because they value it — read or not. Collected in the Logbook; a launch point for new expeditions. |
| **Atlas** | One map of every expedition at the top of the Logbook: territories drawn as continents, articles as places, expeditions as routes (§3.8) |
| **Place** | One article (`page_id`) on the atlas, however many expeditions reached it |
| **Set off** | Start a new expedition from the atlas, from a place or into a territory |
| **Interest tree** | Hand-curated nodes below a tile: **subfield** (level 1) and **leaf** (level 2), e.g. *Philosophy → Logic → Paradoxes* (§3.9) |
| **Pick** | One saved interest: a tile, subfield or leaf, stored as a path id (`philosophy/logic`) |

---

## 3. User flows

### 3.1 Onboarding (first launch only)
1. Screen shows 24 typographic tiles (territory colour, topic icon, name).
2. User selects ≥ 3. **Continue** disabled until 3 are picked. **Skip** uses defaults (`Science`, `History`, `Culture`).
3. Selections persisted; user lands on Home.

Interests are editable later from Settings (Logbook gear → Interests): the same tile picker, starting from the saved picks, with **Save** enabled only when the picks changed and still touch ≥ 3 tiles. Saving returns straight to Home, which rebuilds from the new picks. Tiles with an interest tree can be narrowed to subfields and leaves here (§3.9); onboarding itself never shows the tree.

### 3.2 Home feed
Infinite column composed per page of 20 cards:

| Share | Source |
|---|---|
| ~70 % | Interest picks — `articletopic:<topic>` from `incategory:Featured_articles` and `incategory:Good_articles` **alternately** (Good outnumbers Featured ~7:1, so a combined pool is almost all obscure), each in **random order** (`gsrsort=random`) so every session opens on a fresh slice instead of the same famous few; titles matching the Home blocklist (config) are skipped. Columns are **not** filtered this way. A tile narrowed to subfields/leaves (§3.9) draws from those nodes' queries instead (§5.5), rotating over picks rather than tiles. |
| ~20 % | Today on Wikipedia — featured article, On this day, most-read |
| ~10 % | Wildcard — a random Featured article from a topic tile the user did **not** pick (rotating). `generator=random` was dropped: live results were mostly obscure stubs. |

Mix is interleaved deterministically (e.g. pattern of 10: `I I W? I T I I T I I`) so the feed never clumps. Within each batch, hub interest cards sink (§5.6; Home skips the graded specificity penalty so well-known picks stay in the mix) — today and wildcard cards keep their slots. Articles already **read** are left out of Home (visited-but-unread ones stay, badged).

**Refresh.** Home is rebuilt — a new random slice, same mix — so it never goes stale after an exploration:
- **Returning from an expedition** (back, swipe or breadcrumb from a column to Home) swaps in a fresh Home, scrolled to the top. Opening an article straight from Home and coming back keeps Home as it was.
- The next Home is **built in the background** as soon as the user leaves Home and swapped in, still hidden under the column, the moment its first page is ready — so they land on it with no loading state. If it is late, the old Home stays until it arrives; if the user has already scrolled or opened a card by then, the fresh Home is held for the next pull or return instead of yanking the list away. If it fails, the old Home stays (error reported, never a blank Home).
- **Pull-to-refresh** on Home (only — columns are deterministic reading order) does the same on demand.
- No refreshed Home repeats a card an earlier Home showed this app session (in memory only), nor one read since it was built.

**Cold start.** Opening the app reopens on the Home saved last time, with no network request; only pull-to-refresh, a return from an expedition or new interests replace it. Decided 2026-10-05.
- Home's loaded cards (up to `HOME_SNAPSHOT.maxCards`) are saved to `home_snapshot` whenever they change, shortly after they settle — never only on going to the background, which the OS may skip.
- It reopens at the top. Read articles are left out (checked against `read_history`, which the session may still be loading), and so are *Today on Wikipedia* cards featured on another UTC day (each carries its own day, so re-saving never refreshes it).
- Scrolling past the saved cards continues with a freshly built Home that leaves them out; its first request waits for that scroll.
- No snapshot, one for other interests, nothing left after filtering, or a read that fails (reported) → Home loads the normal way.

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

**Implementation notes (M3, verified on device):**
- The app fetches `page/mobile-html` itself and renders it in a WebView with `baseUrl` set, so Wikipedia's page script (PCS) still loads images and collapsible tables.
- PCS handles link taps itself and cancels them, so a capture-phase script injected before content loads forwards every link tap to the app over the WebView message bridge; the app decides: peek (article), scroll (in-page anchor), browser (other site), or ignore (files, edit links).
- Theming sets Wikipedia's own CSS variables (`--background-color-base`, `--color-base`, …), which its `!important` rules already read.
- "Take a tangent" hands the card to the explore screen only after the reader's closing animation ends (fallback 600 ms), so the flight is visible.

### 3.5 Journeys
- **Logbook** screen (from Home header): stamps grid (collected / 24) and expeditions list (title, date, hop count, territory route strip).
- **Completed** (M8, §3.9): interest-tree nodes the user has read in full (leaves and subfields), newest first, between the stamps and the expeditions — `STOICISM · 37 ARTICLES · {date}`. Hidden while empty. Tapping a row opens the tree screen of its tile, scrolled to the node's parent.
- Opening an expedition shows its **recap card** (start → end, route strip, tangents/read counts, furthest leap). **Continue expedition** restores its path to the most recent node; a node list reopens any column.

### 3.6 Learning layer
- **Stamps:** reading an article (reader open) whose top topic the user has no stamp for awards that stamp.
- **New territory toast:** a hop into a card whose territory is outside the user's chosen interests shows a stamp toast (once per territory per expedition).
- No quizzes, XP or streaks.

### 3.7 Finds (M6)
Journeys record what the user did; a **Find** records what they valued. (Bookmarks were a v1 non-goal because reads were already recorded — Finds add the missing signal: *which* articles mattered.)
- **Keep:** tap ✦ on a card (end of the meta row), in the reader header, or on a Find's peek card. Outline ✦ → solid ✦ in the card's territory colour, plus a brief `✦ KEPT IN FINDS` toast (no action) so the save is confirmed.
- **Remove:** tap the solid ✦ — instant, no confirmation. Toast `FIND REMOVED · UNDO`; undo restores the original row (same `found_at` and expedition). Re-finding after the toast is gone creates a fresh find.
- **Provenance:** a find remembers the expedition it was made on (none when made on Home outside one). The first find of an article wins. A find made in the reader knows only the article's title, so its topic and thumbnail are looked up afterwards and filled in.
- **Logbook:** `FINDS · {n}` section between stamps and expeditions — a strip of the latest finds, newest first, plus *See all →* to the full list (shown with the invitation from DESIGN.md §8 while empty). Each list row: `FOUND ON · FROM {first title}…` or `FOUND ON HOME`, with its own ✦ to remove it there.
- **Opening a Find** shows the peek card (*Take a tangent →* / *Read*), captioned with where and when it was found. A tangent from it starts a **new** expedition, like a hop from Home.
- **Recap:** `{n} tangents · {r} read · {f} finds` — the finds part is hidden when 0.
- **Not coupled:** finding earns no stamp (stamps stay earned by reading), Home never resurfaces Finds, and the hop choreography is unchanged. A found card shows solid ✦ wherever it appears.

### 3.8 World atlas (v2)
One map of every expedition, at the top of the Logbook above the stamps. It shows the shape of the user's curiosity across all expeditions, and every place and territory on it is a starting point for a new one. The set-off actions are the point: a map that only displays history repeats what the stamps grid already says (§11 says how to tell whether it works). Visuals: DESIGN.md §5.12. Mock: https://claude.ai/artifact/5Nhx1k1iX7KuRBDtrrmNyr

**Places**
- A place is an article that is a node in any expedition, or a Find made on Home. Articles only read from Home, without a find, are not places.
- A place belongs to the territory of its **first** occurrence (`journey_nodes.territory`, else `finds.territory`). Untagged articles are left off the atlas; they still appear in their expedition's recap.
- **Fixed position.** Within its territory, a place's slot is its rank by first-occurrence time (earliest = 0), and slots fill outward from the territory's centre. New places only add slots, so the atlas grows outward and no place ever moves. Slots are derived on load, not stored.
- **Size** grows with visits: nodes for that `page_id` across all expeditions, +1 for a Home find, capped at `ATLAS_MAX_VISIT_SIZE`.
- **Glyph** follows the card badges: solid when in read history, hollow when only passed through, ✦ when it is a Find.

**Territories**
- Each territory is a continent sized by its place count. A territory with no places is **uncharted**: dashed outline, no fill, label `{TERRITORY} · UNCHARTED`.
- **Blind-spot bar** under the map names the territory with the fewest places (ties: one outside the user's interests first, then the order in DESIGN.md §2.2). Copy: `Blind spot: Craft. Never entered.` or `Blind spot: Past. Only 4 places so far.` Hidden once every territory has more than `ATLAS_BLIND_SPOT_MAX_PLACES` places.

**Routes**
- An expedition's route is its `journey_nodes` parent → child edges drawn between places. An edge whose two nodes are the same place is skipped.
- With **All** selected, every route is drawn faint. Selecting an expedition draws its route solid, labels its root `SET OFF`, rings its most recent node, and fades every place it didn't pass through. Selecting it again, or **All**, clears this.
- A row of chips under the map selects expeditions: **All · {n}**, then one per expedition, newest first, each showing date, hop count, title and its route strip (§3.5).

**Interactions**

| Action | Result |
|---|---|
| Tap a charted territory | Zoom into it, with every place labelled. *‹ World* zooms out. |
| Tap a place | Place sheet |
| Tap an uncharted territory, or the blind-spot bar | Territory sheet |
| Zoomed into a territory | Button **Set off into {Territory} →** |
| Tap an expedition chip | Trace its route (above) |

**Place sheet:** `● {TERRITORY} · VISITED {n}× · ✓ READ` (or `PASSED`; `· ✦ FOUND {date}` for a Find), then the title. Primary **Set off from here →**, secondary **Read** (opens the reader, marks the article read, adds no node). Below: `PASSED THROUGH ON {n} EXPEDITIONS` with the 3 newest; tapping one traces its route. A Home find adds `✦ FOUND ON HOME`.

**Territory sheet:** `● {TERRITORY} · {n} PLACES` or `· UNCHARTED`, a title (*You've never been to Craft* / *Only 4 places in Past*), the tiles that map to the territory, and **Set off into {Territory} →**.

**Setting off**
- **Set off from here** works like *Take a tangent* on a Find (§3.7). It opens a column seeded by the article and starts a **new** expedition with the seed as its root node (`via: 'peek_explore'`, so no migration). The Logbook is only reachable from Home, so no expedition is ever active at this point.
- **Set off into {Territory}** first picks a seed: one random Featured or Good article from the territory's tiles that is not already a place. It uses the same query as the Home interest stream (§3.2), with the blocklist applied. Then it continues as above.
- The seed header's label reads `SET OFF FROM YOUR ATLAS`, or `FIRST STEP INTO {TERRITORY}` for an uncharted territory (DESIGN.md §5.5). While a territory seed loads, the column shows its loading compass card with the needle in the territory's colour. If no seed is found or the request fails, the column shows the §8 card.
- Back from the new column goes to Home, the root of the column stack, and that ends the expedition as usual. The atlas is not part of the column stack.

**Offline:** the atlas is built from local tables only, so it renders offline. *Set off into* needs the network and shows the offline card without it; *Set off from here* follows the column's normal offline behaviour.

### 3.9 Niche interests (M8)
Broad tiles are too coarse for someone into *Stoicism* or *Logic*: ORES `articletopic` stops at two levels and has no such topics (*Philosophy* is even merged with religion). So some tiles get a hand-curated **interest tree** below them: **tile → subfield → leaf** (e.g. *Philosophy → Logic → Paradoxes*). Decided in a design session 2026-10-04.

**Scope.** Trees for **Philosophy, Science, Maths, History** only. The other 20 tiles stay flat and behave exactly as today; the drill-down affordance shows only on tiles with a tree. More tiles get trees only if people actually drill down (§11).

**Picking**
- Onboarding stays flat (§3.1) — the tree is never shown before the first Home.
- The tree lives in **Settings → Interests**: tapping a tile that has a tree opens its **tree screen** (DESIGN.md §5.13) instead of toggling it. One screen per tile, no third level: the broad pick (*All of Philosophy*) at the top, then one card per subfield with its leaves as chips. Subfields and leaves are both pickable. Picks made there are a draft until **Save** on the tile grid, as today.
- **Most specific pick wins.** A tile with no picks below it means *all of the tile* (its `articletopic` query). Picking any subfield or leaf **narrows** the tile to just those picks; picking a subfield means all of that subfield. Clearing every pick below a tile makes it broad again. A pick and its own ancestor are never both kept — picking a child replaces the ancestor.
- **Minimum:** at least `MIN_INTEREST_PICKS` **tiles touched** — a tile counts if it is picked itself or has any pick below it. Any number of subfields/leaves within those tiles.

**Home**
- The interest round-robin (§3.2) rotates over the **effective picks** (broad tiles, subfields, leaves), not over tiles. Five Philosophy leaves plus two broad tiles means Philosophy fills most interest slots — that is what was asked for.
- A card from a subfield/leaf pick carries that node, and its why-line names it: `★ YOU LIKE STOICISM` (DESIGN.md §5.3). Its **colour, topic label and stamp still come from `cirrusdoc`** (§5.4), so an article looks the same on Home and in any column. The fallback topic for an untagged card is the node's tile.

**Nudges into the tree**
- **Prompt card.** After the user has read `NICHE_NUDGE_READS` (3) articles whose topic is a tile that has a tree and that they picked **broadly**, Home inserts one prompt card: `NARROW PHILOSOPHY?` with chips for the tile's subfields (DESIGN.md §5.14). Chips are multi-select: each tap toggles that pick at once, and Home rebuilds (as after Settings → Save) `NICHE_CHIP_SETTLE_MS` after the last tap, with one toast naming every pick. Tapping the card body opens the tile's tree. Limits: **once per tile, at most one per app session, never again for that tile once dismissed** (swipe right on it, or scrolled past without acting, counts as dismissed).
- **Topic label.** Tapping the topic label on any card whose tile has a tree opens that tile's tree in Settings → Interests.

**When a pick runs dry**
- A subfield/leaf pool is small (tens to low hundreds of articles; *Stoicism* has 37). A node is **exhausted** when every article in its pool is in `read_history`. Shown-but-unread articles don't count — they come back next session. Checked when the node's stream ends, against `read_history`; not stored, so a category that grows on Wikipedia revives the node by itself.
- First time a node is found exhausted: Home shows a one-time card `YOU'VE READ ALL OF STOICISM · 37 ARTICLES` with chips for sibling nodes not already picked (*Epicureanism, Cynicism*), which behave like the prompt card's chips, and the node is written to `completed_leaves` for the Logbook's **Completed** section.
- From then on that pick's stream **widens to its parent** (leaf → subfield → tile) until the parent is exhausted too. The saved pick is not changed.

**Tree edits.** Picks are stored as **path ids** (`philosophy/logic/paradoxes`). A saved pick whose node no longer exists resolves to its nearest existing ancestor and reports a warning (`reportError`, reason code only). The first segment is always a tile id, so a pick never resolves below tile level and the tiles-touched minimum can't break. Existing saved tile ids are valid path ids — no migration.

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
MIN_INTEREST_PICKS       = 3      // tiles touched (picked, or with a pick below them)
NICHE_NUDGE_READS        = 3      // reads in a broad tree tile before its prompt card
NICHE_CHIP_SETTLE_MS     = 1200   // prompt/exhaustion chips: rebuild Home this long after the last tap
HINT_PEEL_DISTANCE       = 96     // pt; below the commit distance on the narrowest phone
HINT_PEEL_HOLD_MS        = 600
HINT_FIRST_PEEL_DELAY_MS = 800    // after Home appears
HINT_IDLE_MS             = 8000   // idle on Home before the next peel
ATLAS_MAX_VISIT_SIZE     = 8      // visits beyond this don't grow a place
ATLAS_LABEL_MIN_VISITS   = 3      // world view labels only places this visited, plus Finds
ATLAS_BLIND_SPOT_MAX_PLACES = 10  // hide the blind-spot bar once every territory has more
ATLAS_ZOOM_MS            = 340    // territory zoom; 0 under Reduce Motion
```

### 4.3 Direction lock
First axis to exceed `DIRECTION_LOCK_SLOP` owns the touch until release. Prevents diagonal drags from half-scrolling and half-swiping.

### 4.4 Discoverability
Two in-place hints teach the first hop and the first return. Each stays until the user has done the thing it teaches, then never shows again. Visuals: DESIGN.md §6.2–6.3, §7.

**Home hint** — until the first hop (`swipeHintShown`):
- A chip `← SWIPE LEFT TO TAKE A TANGENT` sits on the bottom edge of the **focused** Home card and moves with it.
- The focused card **peels**: slides `HINT_PEEL_DISTANCE` left (revealing the real `TAKE A TANGENT →` label), holds `HINT_PEEL_HOLD_MS`, springs back. The label fades in as drag ÷ commit distance, so a shorter peel shows nothing readable.
- A peel plays `HINT_FIRST_PEEL_DELAY_MS` after Home appears — including when the reader closes over Home — and again after every `HINT_IDLE_MS` without scroll, tap or drag. Any interaction restarts the idle timer from 0.
- Peel only while: Home is the top column, nothing is over it (reader, Logbook), the app is foregrounded, no touch is in progress, and the focused card is an article card. Compass, error and offline cards get no chip and no peel. Otherwise the idle timer pauses.
- Reduce Motion: chip only, no peel.
- **Any** first hop clears it: a left swipe or *Take a tangent* from the reader.

**Back hint** — until the first return (`backHintShown`):
- Chip `SWIPE RIGHT TO GO BACK →` on the first card of every column until then (so a second hop before any return still shows it). No peel.
- **Any** first return clears it: right swipe, breadcrumb crumb tap, or system back.

**Existing users:** if any `journey_nodes` row exists at launch, both flags are set and neither hint shows.

**Screen readers:** chips are hidden from accessibility (`importantForAccessibility="no-hide-descendants"`). Card actions for screen readers are an open item (§14).

---

## 5. Content engine

### 5.1 Column builder (non-root)
For seed article `S` and current path `P`:

1. **Links** — `S`'s own article links **in reading order**, one top-level section at a time (lead first), fetched lazily as the column scrolls. Reference-type sections (*Notes, References, External links, Further reading, Bibliography, Sources, Citations, Footnotes*) are skipped; infobox/navbox tables, citation markers and hatnotes are ignored.
2. **Sideways** — one every `sidewaysEveryN` (4) link cards: articles that link to `S` and talk about it, from **outside `S`'s territory** — search `linksto:"S" "<S without its (suffix)>" -articletopic:<every topic in S's territory>`, by relevance. Why-line `⤳ DETOUR INTO {TOPIC} · LINKS TO {SEED}`. A seed with no territory gets plain relevance-ranked backlinks (`↰ LINKS TO`). The raw backlinks list was dropped: it pages in page-id order, which is mostly mega-articles (*Albania, Amsterdam, Andorra…*).
3. **morelike** — once links are exhausted, `morelike:S` search pages keep the column infinite.

Then apply, in order:
- **Filter** (§5.3)
- **Dedup** within column by `pageid`
- **Exclude path** — drop any `pageid` in `P` (including `S`)
- **Annotate** — `source` (for the why-line), `topic` (§5.4), `visited` if `pageid` appears elsewhere in the active Journey; `read` if in read history
- **Rank** each hydrated batch (§5.6)

Column builder is a pure function over fetched candidates + context, so it is fully unit-testable.

### 5.2 Home builder
Interleave three source streams (§3.2). Same filter, dedup, and annotation steps; no path exclusion.

### 5.3 Quality filter
Drop:
- Links inside notice boxes (`side-box`, `ambox`, `metadata` — e.g. "this article contains Tibetan script… mojibake")
- Disambiguation pages (`pageprops.disambiguation`)
- Titles matching `^List of`, `^Lists of`, `^Index of`, `^Outline of`
- Pure year/date titles (`^\d{1,4}( BC| AD)?$`, `^(January|…|December) \d{1,2}$`)
- Pages with neither description nor extract

Keep everything else. Image-less pages render as typographic cards.

### 5.4 Card topics
Topics arrive **with** each batch: one `cirrusdoc` call (`cdincludes=incoming_links|weighted_tags`, by title) runs in parallel with hydration, so cards never change colour after they appear. The extra ~1.5 s on a cold column is hidden by dwell prefetch (§7). A card whose own topic is unknown uses its fallback (column seed's territory; on Home the interest tile it came from).

Each card's topic = highest-scoring `articletopic` tag from `prop=cirrusdoc` (`weighted_tags`), mapped to a tile and its territory. Untagged → neutral ink style, no label. **Fallback** if `cirrusdoc` is unusable: use the seed column's topic. Coverage verified on sample pages; coarse-only articles handled per §6 topic note.

### 5.5 Interest tiles → topics
Tiles map to one or more ORES `articletopic` IDs. Initial set (tunable):

| Tile | articletopic |
|---|---|
| Space | `space` |
| Animals | `biology` |
| History | `history` |
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
| Architecture | `architecture` |
| Engineering | `engineering` |
| Comics & Anime | `comics-and-anime` |
| Military | `military-and-warfare` |

The last four were added 2026-10-03 (Featured / Good pools: architecture 136 / 1103, engineering 86 / 583, comics-and-anime 67 / 1176, military-and-warfare 1123 / 5321). Military was split out of History. Broad labels (`biography`, `media`, `entertainment`) stay unmapped on purpose: a card takes its highest-scoring mapped tag, so they would relabel large parts of other tiles. Thin pools (`fashion`, `linguistics`, `software`, `radio`, …) can't fill Home.

Mapping lives in a config file, not code.

**Interest tree (§3.9).** Also config, next to the tiles: each subfield and leaf has an id (unique among its siblings), a label, an approximate pool size (shown on leaf chips), three sample article titles for subfields (shown on their cards), and a query:
- `incategory:<Category>` — **shallow only**. `deepcat:` is never used: it wanders (`deepcat:Logic` + Good/Featured returns *September 11 attacks, Shakespeare, Tolkien, South Park*, live 2026-10-04) and is capped at depth 5 / 256 categories.
- optionally `morelike:<Anchor article>` alternated with it, for small categories.
- **No Featured/Good restriction.** Niche categories have no reviewed articles (`incategory:Stoicism` 37 articles, 0 Featured/Good). The hand-picked category is the quality gate instead of review status; the Home blocklist and §5.3 filter still apply.
- **Order: shuffled tiers** (decided 2026-10-04). Relevance order (`gsrsort=relevance`), each page of `FEED.listPageSize` shuffled. Random order surfaced the obscure tail first (*Supersymmetric WKB approximation* in Quantum mechanics) where relevance gives *Uncertainty principle, Multiverse*; shuffling within pages keeps sessions varied, and read articles drop out, so a reader works outward from the core.
- A subfield searches its own extra categories plus all its leaves' (`incategory:A|B|C`).

Every node is verified live when added: pool size, and the top results scanned for off-topic or explicit pages. Two levels below the tile at most, ~4–8 children per node.

### 5.6 Ranking
Each hydrated batch (≤20 cards) is reordered; cards placed in a slot (sideways, today, wildcard) keep their position. Constants live in `RANKING` (config) and were picked from `npm run eval:feeds` (15 seed columns + 3 Home mixes, live).

- **Hubs sink.** ≥ 20 000 incoming links (eval: p90 of column cards ≈ 35k; *United Kingdom* 365k, *Species* 75k) or a listed generic title (`HUB_TITLES`: *Country, Language, City…*) → below every specific card, least-linked first. Demoted, never dropped. A hub that arrived in a slot gives the slot to the next ranked card.
- **Score** for the rest = position (1 → 0 across the batch) − 1.5 × decades of incoming links above 1 000 + 1.5 if the card links back to the seed (`prop=links&pltitles=S`, one call per batch, in parallel) + 0.5 per extra time the section links it (max 3).
- **Signals failing** (`cirrusdoc` is internal) → reported; the batch shows in source order with fallback topics. `HUB_TITLES` still applies.

Result (eval, 2026-10-02): hubs (≥ 20k) in the first five column cards 15/75 → 0/75; Home's first five ≥ 5k links 10/15 → 0/15.

---

## 6. Wikimedia API usage

All requests to `https://en.wikipedia.org` send both `User-Agent` and `Api-User-Agent: Tangent/<version> (<contact>)` (native apps can set the real User-Agent; Api-User-Agent covers browser builds). The contact comes from `EXPO_PUBLIC_WIKI_API_CONTACT`, never from code.

**Throttling (observed 2026-10-01):** Wikimedia answers bursts with `429` and a `Retry-After` in seconds. The client honours it (capped at 10 s) and otherwise backs off 300 ms → 600 ms over 3 attempts. Measured burst cap: **10 back-to-back requests, then 429** for the rest of the window — identical with or without a real `User-Agent`. A column's first page costs ~7 requests (with ranking signals), so every request goes through one **request budget** (`REQUEST_BUDGET`): a token bucket of 8 refilling one per 250 ms, shared by feeds, prefetch and reader. Prefetch requests run on a low-priority lane that never dips into the last 4 tokens, are promoted when their column comes on screen, and are dropped if cancelled before their turn.

| Need | Endpoint |
|---|---|
| Card data (by title) | `w/api.php?action=query&titles=…&redirects=1&prop=pageimages\|description\|extracts\|pageprops&piprop=thumbnail&pithumbsize=500&exintro&explaintext&exchars=600&exlimit=20&ppprop=disambiguation&format=json&formatversion=2` |
| Sideways | `generator=search&gsrsearch=linksto:"S" "S" -articletopic:…&gsrsort=relevance` |
| Ranking signals (≤20 titles) | `titles=…&redirects=1&prop=cirrusdoc&cdincludes=incoming_links\|weighted_tags` |
| Links back to S (≤20 titles) | `titles=…&redirects=1&prop=links&pltitles=S&pllimit=max` |
| morelike | same props with `generator=search&gsrsearch=morelike:S&gsrlimit=20&gsroffset=N` |
| Interest feed | `generator=search&gsrsearch=articletopic:<topic> incategory:<Featured_articles or Good_articles>&gsrsort=random&gsrlimit=20` |
| Today | `api/rest_v1/feed/featured/YYYY/MM/DD` |
| Wildcard | `articletopic:<non-interest tile> incategory:Featured_articles` |
| Reader | `api/rest_v1/page/mobile-html/<title>` |
| Peek card | `api/rest_v1/page/summary/<title>` |

**Batching note:** TextExtracts returns at most 20 intro extracts per request, so card-detail batches are 20 — matching `COLUMN_PAGE_SIZE`. Link lists themselves are fetched in full (paged with `continue`) and hydrated 20 at a time.

**Topic note (verified 2026-10-01):** `cirrusdoc` returns the search index document; we read only `weighted_tags` entries prefixed `classification.prediction.articletopic/`. Values are hierarchical with a score, e.g. `STEM.Biology|952`, `STEM.Mathematics|941`. Rules:
- Ignore the coarse `*` buckets (`STEM.STEM*`, `Culture.Culture*`, …) when a specific tag exists; pick the highest-scoring specific tag.
- Only coarse tags (e.g. *Iron gall ink* → `STEM.STEM*|712` only): map the bucket to a territory default (STEM → Cosmos, Culture → Culture, Geography → Earth, History_and_Society → Past) with **no topic label** — colour only.
- Minimum score 500, else untagged.

**Ranking note (verified 2026-10-01, revised; superseded by §5.6 on 2026-10-02):** popularity ranking was tried and dropped. `cirrusdoc` popularity for 500 links takes ~14 s, and pure popularity surfaces citation and navbox links (*Wayback Machine, Oxford English Dictionary, Alaska*) rather than the article's subject matter. Reading order is both fast and relevant — Octopus lead: *Mollusc → Cephalopod → Squid → Cuttlefish → … → Camouflage → Venom → Blue-ringed octopus*.

| Need | Call | Measured |
|---|---|---|
| Section list | `action=parse&page=S&prop=sections` | ~0.5 s, 6 KB |
| Links of one section, in order | `action=parse&page=S&section=N&prop=text&disableeditsection=1&disablelimitreport=1` → extract `/wiki/` hrefs | ~1–2 s, ~24 KB (lead) |
| Card details for ≤20 titles | `action=query&titles=…&redirects=1&prop=pageimages\|description\|extracts\|pageprops` | ~0.6 s, ~13 KB |
| Topics + incoming links for ≤20 titles (parallel with card details) | `action=query&titles=…&prop=cirrusdoc&cdincludes=incoming_links\|weighted_tags` | ~1.5 s, ~20 KB |

**Payload note (verified):** `cirrusdoc` **must** be called with `cdincludes` — without it a 20-card batch is ~2.1 MB; with `cdincludes=weighted_tags` it is ~26 KB. The API marks `cirrusdoc` as internal ("might change at any time without notice"), so the seed-topic fallback in §5.4 is mandatory, not optional.

**Content note (verified):** raw `articletopic:biology` ranks *Anal sex* and *Oral sex* in its top five. Hence the Featured → Good restriction for Home (§3.2). Featured-only pools are still large (743 biology, ~490 space).

---

## 7. Performance

- **Prefetch on dwell:** card ≥ 75 % visible for 600 ms (FlatList viewability, top column only) → fetch first page of its column on a prefetch lane (feeds the swipe-preview and makes the hop instant). Max 3 concurrent; cancel on scroll-away unless finished; the 6 most recent finished ones are kept. The column then takes over that same feed. Measured live: hop after 3 s of reading → first page in ~80 ms, vs ~3 s cold.
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

```sql
-- M6
CREATE TABLE finds (
  page_id        INTEGER PRIMARY KEY,   -- one find per article; the first wins
  found_at       INTEGER NOT NULL,
  journey_id     TEXT REFERENCES journeys(id) ON DELETE SET NULL,  -- NULL: found on Home outside an expedition
  title          TEXT NOT NULL,         -- card snapshot so the Logbook renders offline
  thumbnail_url  TEXT,
  tile_id        TEXT,
  territory      TEXT
);
CREATE INDEX idx_finds_journey ON finds(journey_id);
```

```sql
-- §3.2 — the Home on screen, so a cold start reopens on it offline. One row.
CREATE TABLE home_snapshot (
  id             INTEGER PRIMARY KEY CHECK (id = 1),
  interests_key  TEXT NOT NULL,         -- the picks it was built for, joined with '|'
  cards          TEXT NOT NULL          -- JSON Card[]; validated on load, dropped if its shape has changed
);
```

```sql
-- M8 (§3.9) — the Logbook record; whether a node is exhausted *now* is derived from read_history
CREATE TABLE completed_leaves (
  node_path      TEXT PRIMARY KEY,      -- e.g. 'philosophy/ethics/stoicism'
  completed_at   INTEGER NOT NULL,
  article_count  INTEGER NOT NULL       -- pool size when completed
);
```

`read_history` and `card_cache` payloads include `topic`. Recap stats are derived from `journey_nodes` + `card_cache`, not stored.

**As built (M4):** `journey_nodes` also stores `tile_id`, `territory` and `thumbnail_url` (the topic a card had when it was hopped into), so routes and resumed columns render offline and before `card_cache` exists (M5). A `journey_reads(journey_id, page_id)` table records which articles were read on which expedition, for the recap's *n read*. Schema changes go through `PRAGMA user_version` migrations.

**Journey rules (M4):** a swipe or *Take a tangent* from Home starts an expedition; every hop adds a node under the node of the column it left. *Read* on a peek card adds a `peek_read` node under the column (or previous in-place read) the reader was opened from; a tangent from the reader then leaves from that node. Reading a card from a column marks it read but adds no node. *Continue expedition* reopens the column ancestors of the most recent node (in-place reads reopen the column they were read from). Visited = the article is a node of the active expedition; read = in read history.

Key-value storage: `theme: 'system'|'paper'|'night'`, `reduceMotion: 'system'|'on'`, `interests: string[]` (path ids, §3.9; plain tile ids are valid), `nichePromptsSeen: string[]` (tile ids whose prompt card was shown), `nicheReads: Record<string, number>` (reads per tree tile towards its prompt, counted from every read once its topic is known), `onboardingDone: boolean`, `swipeHintShown: boolean`, `backHintShown: boolean`, `hintPeelsSeen: number` (peels played before the first hop, for `first_hop`), `analyticsOptOut: boolean` (Settings switch, §11).

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
  atlas/           place/route builder and slot geometry (pure), atlas map (react-native-svg), sheets
  theme/           tokens (DESIGN.md §2–4), fonts, territory map
  onboarding/      tiles screen, interests store
  prefetch/        dwell tracker, prefetch queue, caches
  analytics/       event constants + thin PostHog wrapper
  config/          constants (§4.2), tile→topic map, interest tree
```

`content/` depends only on interfaces of `wiki-api/` (injected), never on React.

**Navigation state:** an immutable column stack `Column[]` (each: seed, cards, cursor, scrollOffset). Push on hop, pop on back, slice on breadcrumb jump.

---

## 11. Analytics (PostHog)

Analytics exists mainly to judge **feed quality**: which columns and Home picks keep people hopping and reading, and which they back out of.

**Setup.** `posthog-react-native` on the EU host. The project key comes from `EXPO_PUBLIC_POSTHOG_KEY` (host override: `EXPO_PUBLIC_POSTHOG_HOST`). With no key, analytics is a no-op; development builds log events to the console instead of sending. Anonymous: `personProfiles: 'never'`, GeoIP off, session replay off. Touch autocapture and app lifecycle events are on. Screen views are sent by hand as route patterns (`/expedition/[id]`), never with params.

**Privacy rule.** Article titles are sent **only** on the feed-quality events (`card_seen`, `column_left`, `hop`, `return`, `read_open`), and only for the column's seed and the card acted on. Everything else is title-free: views that show a title carry `ph-no-capture`, so touch autocapture sends nothing from them; errors are sent as fixed reason codes. Settings has a **Share usage data** switch (on by default) that says it includes the titles of articles explored. Store listings must declare browsing history.

| Event | When | Properties |
|---|---|---|
| `card_seen` | A card dwells (§7: ≥ 75 % visible for 600 ms) in the column on top; once per card per column visit | `card_title`, `source`, `topic`, `territory`, `position`, `hub`, `seed_title`, `depth`, `interest_node` (path id of the subfield/leaf a Home card came from, else null) |
| `column_left` | The column on top stops being on top | `seed_title`, `depth`, `outcome` (`hop`/`swipe`/`crumb`/`system_back`/`refresh`/`resume`/`background`/`replaced`), `cards_seen`, `deepest_position`, `reads`, `seconds`, `feed_end` (`dead_end`/`error`/null) |
| `hop` | A hop lands | `route` (`swipe`/`tangent`/`atlas`), card properties (`position` null for a tangent, or a card swiped before it dwelt), `seed_title` and `depth` of the column left |
| `return` | Back to a lower column | `route` (`swipe`/`crumb`/`system_back`), `columns_popped`, `seed_title` and `depth` of the column left |
| `read_open` | The reader opens | `entry: card` + card and column properties, or `entry: peek_read` + `card_title` |
| `expedition_ended` | Back on Home, or the app goes to the background mid-expedition | `expedition_id`, `ended_by` (`home`/`background`), `node_count`, `max_depth`, `reads`, `duration_s`, `territories`, `stamps_earned`. May repeat per expedition; the latest per `expedition_id` wins. |
| `stamp_earned` | A new stamp | `topic`, `territory` |
| `first_hop` | Once per install | `route`, `peels_seen`, `seconds_on_home` (Home time this launch, while Home is on top and the app foregrounded) |
| `first_return` | Once per install | `route` |
| `interests_saved` | Picks saved (§3.9) | `from` (`onboarding`/`settings`/`prompt`/`exhaustion`), `tiles`, `subfields`, `leaves` (counts after the save), `added` (path ids). Title-free. |
| `interest_tree_opened` | A tree screen opens | `tile`, `from` (`settings`/`prompt`/`topic_label`/`completed`) |
| `niche_prompt_shown` | A prompt card dwells | `tile` |
| `niche_prompt_dismissed` | A prompt card is swiped away or scrolled past without a chip | `tile`, `how` (`swipe`/`scrolled_past`) |
| `niche_node_exhausted` | A node is first found exhausted | `node` (path id), `articles` |
| `find_kept` | ✦ keeps an article (§3.7) | `from` (`card`/`reader`/`peek`/`list`), `topic`, `territory`, `on_expedition`. Title-free. |
| `find_removed` | ✦ removes a find | `from` |
| `find_restored` | Undo on the removed toast | — |
| `atlas_set_off` | Set off from the atlas (§3.8), before the column lands | `from` (`place`/`territory_sheet`/`blind_spot`/`zoom`), `territory`, `charted`, `place_count` (in that territory). Title-free. |
| `app_error` | Anything passed to `reportError` | `scope`, `reason` (`http_429`, `api_<code>`, `network`, `parse`, `cancelled`, or the error class — never the message) |

A column **visit** runs from the column becoming the one on top to it stopping (a hop covering it counts as leaving, with `outcome: hop`); time with the reader, Logbook or Settings over it counts towards the visit. Only the app going to the background ends a visit or reports an expedition — iOS *inactive* (Control Centre, alerts) doesn't. Cards already dwelt on when a column comes on top count as seen, and a feed that ended before then still sets `feed_end`. Opting out also drops events not yet sent, and `Application Opened` is sent without its launch URL (a deep link can name an article). Skip rate is `card_seen` without a matching `hop` or `read_open`; a flat column is a `column_left` with no hop out and no reads.

**Do people drill down?** (§3.9) Read 4 weeks after release: the share of active users with a narrowed tile, `interests_saved` split by `from` (does the prompt card do the work?), prompt dismiss rate, and node-card skip rate against broad interest cards.

**Is the atlas worth it?** (§3.8) Two measures, read 4 weeks after release: the share of new expeditions started from the atlas (`hop` with `route: atlas`), and, for users who set off at least once, the territories per expedition (`expedition_ended.territories`) before and after their first set-off. If under 5 % of expeditions start from the atlas and territory spread doesn't move, reduce the atlas to a per-expedition map (§1 non-goals).

## 12. Testing

Target ≥ 80 % coverage; TDD for `content/`, `wiki-api/`, `journeys/`.

- **Unit (Jest):** column builder (mixing, dedup, path exclusion, visited/read annotation), quality filter regexes, home interleave, tile→topic mapping, breadcrumb collapse, column-stack push/pop/jump.
- **Integration:** `wiki-api` against recorded JSON fixtures (incl. `continue` paging, redirects, disambiguation); journey repository against in-memory SQLite.
- **Unit (Jest), atlas (§3.8):** places from nodes + Home finds (Home reads excluded); first occurrence sets territory; untagged left off; slots unchanged when a new expedition is added; visit count and cap; blind-spot choice and ties; territory seed skips existing places.
- **Unit (Jest), niche interests (§3.9):** most-specific-wins resolution (child replaces ancestor, clearing restores broad); tiles-touched minimum; missing node → nearest ancestor + warning; plain tile ids still resolve; round-robin over effective picks; why-line names the node while colour stays from `cirrusdoc`; exhaustion only when every pool article is read (shown-unread doesn't count); widening leaf → subfield → tile; prompt card once per tile / once per session / never after dismissal.
- **Config check (live, `npm run test:live`):** every tree node's query returns ≥ 1 article and uses no `deepcat:`.
- **E2E (Maestro):** onboarding → Home; left swipe ×2 → breadcrumb shows 3 crumbs; right swipe returns to same scroll position; tap → reader → inline link → Explore creates column; reopen Journey from list; Logbook → atlas place → *Set off from here* → column seeded by it, and a new expedition is listed.
- **Manual device checks:** swipe feel, direction lock, Android back, iOS edge swipe.

---

## 13. Milestones

| # | Milestone | Exit criteria |
|---|---|---|
| M0 | **Gesture prototype** (throwaway) | Static fake cards; column push/pop with left/right swipe + direction lock feels right on a real phone |
| M1 ✅ | API client + content engine | Builders pass unit/integration tests against fixtures — done 2026-10-01: 98 tests, ~98 % coverage, live smoke test (`npm run test:live`) |
| M2 ✅ | Columns + Home + onboarding | Live infinite Home; hops into real columns — done 2026-10-01: Expo Router, onboarding (persisted in expo-sqlite kv-store), live Home and column feeds, the M0 hop on real data, breadcrumb jumps, skeleton/error/dead-end cards, Paper + Night atlas. Verified on an Android emulator; 185 tests, 92 % coverage. Card tap → reader is M3; Logbook button is M4. |
| M3 ✅ | Reader + peek card | Inline links intercepted; Explore/Read work — done 2026-10-01: reader modal (mobile-html themed via Wikipedia's CSS variables, fonts embedded, CC BY-SA footer), peek card with Take a tangent / Read, hop from the peek card after the sheet closes. Verified on an Android emulator in Paper and Night atlas. Marking articles *read* lands with Journeys in M4. |
| M4 ✅ | Journeys + breadcrumb | Persisted, reopenable Journeys; visited/read badges — done 2026-10-02: journeys in expo-sqlite (hops, in-place reads, read history, stamps), live ◌/✓ badges, Logbook (stamp grid, expeditions) and recap card with *Continue expedition* and a reopenable node list. Verified on an Android emulator; 307 tests, 92 % coverage. New-territory toast and Settings (Logbook gear) move to M5. |
| M5 | Prefetch, caches, states, analytics | Perf targets met; all §8 states; events firing — analytics done 2026-10-03: feed-quality events with titles (§11), opt-out switch in Settings, `app_error` from `reportError`. |
| M6 (built, device check pending) | Finds (§3.7) | ✦ on cards, reader and peek card; `finds` migration; Logbook Finds strip + list; undo toast; recap count; `find_*` events; card accessibility action *Keep as a find* / *Remove find*; wildcard why-line re-glyphed `✦` → `↯` |
| M7 | World atlas (§3.8) | Atlas at the top of the Logbook; place, territory and blind-spot sheets; *Set off from here* / *Set off into*; route tracing; territory zoom; `atlas_set_off` |
| M8 (built, device check pending) | Niche interests (§3.9) | Live-verified trees for Philosophy, Science, Maths, History; tree in Settings → Interests; path-id picks with ancestor fallback; Home rotates over effective picks; node why-line; prompt card + tappable topic label; exhaustion card, widening, `completed_leaves` + Logbook *Completed* |

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
| Journey "idle" definition for closing a session | Decided (M4): returning to Home ends the expedition; the next hop from Home starts a new one. Restarting the app opens on Home, so it ends one too. Background timeout not needed. |
| Open: screen-reader users can't hop | Cards expose only "Opens the article". Add accessibility actions *Take a tangent* / *Read* on cards and *Go back* on columns (DESIGN.md §10), plus an at-rest hop animation for action-triggered hops. Not part of the first-hop hints work. |
| Atlas: territory tints break DESIGN.md §2.4 | Decided: exception written into §2.4 (continent fill and outline inside the atlas only) |
| Atlas: crowding at scale | World view labels only frequent places and Finds. Past ~200 places in one territory, show count badges instead of dots. Decide after dogfooding a heavy profile. |
| Atlas: a removed Home find leaves the atlas | Later places in that territory shift by one slot. Accepted: rare and small. Persist slots if expedition deletion is ever added. |
| Atlas: set off from a place vs. resume an expedition | The place sheet leads with *Set off*; resuming stays on the recap card. Revisit if `atlas_set_off` is low but route tracing is used heavily. |
| Niche: tree curation cost | ~25 nodes per tile, each verified live. Start with 4 tiles; extend only if people drill down. |
| Niche: Wikipedia categories change | A renamed/emptied category makes a node return nothing; the live config check (§12) catches it, and Home's round-robin skips an empty stream meanwhile. |
| Niche: unreviewed articles reach Home | Categories are hand-picked and scanned; blocklist and §5.3 filter still apply. Watch skip rate of node cards (`card_seen` without hop/read). |
| Niche: do people drill down? | Decided (§11): `interests_saved` by `from`, `interest_tree_opened` by `from`, prompt shown/dismissed, `niche_node_exhausted`, and `card_seen.interest_node` for node-card skip rate. Extend trees past 4 tiles only if ≥ 15 % of active users narrow a tile within 4 weeks. |
| Name "Tangent" | Check App Store / Play Store / domain availability. Do not use "Wikipedia" or Wikimedia marks in name or icon |
