# Tangent — Design Direction (v1)

> An explorer's atlas for Wikipedia. Every left swipe is a tangent.

Status: Draft · 2026-10-01 · Companion to [SPEC.md](./SPEC.md)

---

## 1. Principles

1. **Curious, not childish.** Field journal and old atlas, brought to life. Playful through type, motion and stamps — never through mascots, XP or streaks.
2. **Every card teaches.** A card is a small lesson even if you never tap it.
3. **The web is always visible.** Each card says why it is here; each column says where it came from; the breadcrumb is a route.
4. **One signature moment.** The hop gets custom choreography. Everything else is calm and platform-standard.
5. **Built from a system.** Three fonts, seven colours, one icon family, one stamp template. No one-off art.

---

## 2. Colour

### 2.1 Base tokens

| Token | Light (Paper) | Dark (Night atlas) | Use |
|---|---|---|---|
| `bg.paper` | `#F4EDE0` | `#1B1712` | App background |
| `bg.card` | `#FBF7EF` | `#25201A` | Card and sheet surfaces |
| `ink.primary` | `#1F1B16` | `#EDE4D3` | Titles, body |
| `ink.muted` | `#6B6258` | `#A89C8A` | Metadata, why-line, captions |
| `line.hairline` | `#D9CFBF` | `#3A332A` | Rules, image frames, dashed empty stamps |

### 2.2 Territories

Twenty topic tiles group into seven territories. Topic **label** stays specific (`● MATHS`); **colour** comes from the territory.

| Territory | Topics | Light | Dark |
|---|---|---|---|
| Life | Animals, Medicine, Food | `#3F6B3A` | `#8DB880` |
| Cosmos | Space, Science, Maths | `#2E3A7A` | `#9AA6E8` |
| Earth | Places, Earth, Transport | `#875C10` | `#D9A94F` |
| Past | History, Society, Business | `#9A3B2E` | `#E08A7A` |
| Culture | Music, Film & TV, Art, Games | `#B23A5E` | `#EE8FAA` |
| Mind | Philosophy, Books | `#6B3B66` | `#C493BF` |
| Craft | Tech, Sport | `#1F6F6B` | `#6BBDB6` |
| *(untagged)* | — | `ink.primary` | `ink.primary` |

### 2.3 Contrast (verified)

All pairs below pass **WCAG AA for normal text (≥ 4.5:1)**:

| Pair | Light | Dark |
|---|---|---|
| ink.primary on bg.paper | 14.7 | 14.1 |
| ink.muted on bg.paper | 5.1 | 6.6 |
| Territory on bg.paper (min) | 4.9 (Culture) | 6.9 (Past) |
| `bg.card` text on territory block (min) | 5.3 | — |

Dark mode typographic blocks use `bg.paper` (dark) text on the dark territory colour (min 6.9).

### 2.4 Rules
- Territory colour appears **only** in: topic dot + label, typographic card block, stamps (+ the explore label behind a dragged card, the route strip in the Logbook and the loading compass needle, which are the same accent).
- **Atlas exception (M7):** the world atlas (§5.12) may tint continents: fill at 12 % (Paper) / 14 % (Night atlas) and a 1 pt outline at 45 %, inside the atlas frame only. Places and labels on it follow the rules above. Nothing else in the app uses tints.
- Never as body text, never tinting photos, never as a full-screen background.
- Theme follows system; override in Settings (System / Paper / Night atlas).

---

## 3. Typography

| Role | Font | Weight | Size / line | Notes |
|---|---|---|---|---|
| Wordmark | Fraunces | 700, `SOFT 100`, `WONK 1` | 22/26 | lowercase `tangent` |
| Card title | Fraunces | 600, opsz 72 | 28/32 | max 3 lines, then ellipsis |
| Reader H1 | Fraunces | 600 | 30/36 | |
| Reader H2 | Fraunces | 600 | 22/28 | |
| Recap headline | Fraunces | 600 italic | 26/32 | |
| Body / extract | Literata | 400 | 17/27 | extract fills the card's free height in whole lines, then ellipsis |
| Meta label | IBM Plex Mono | 500, caps, +8 % tracking | 11/16 | `● BIOLOGY · 4 MIN` |
| Breadcrumb | IBM Plex Mono | 500, caps | 12/16 | middle crumbs collapse to `…` beyond 4 |
| Why-line | IBM Plex Mono | 400 | 11/16 | `↳ LINKED FROM OCTOPUS` |

Rules:
- Respect system font scale (Dynamic Type / Android font scale). Layouts wrap; never clip.
- Mono only for labels ≤ 5 words.
- Reader WebView loads the same fonts (bundled) via injected CSS.

Packages: `@expo-google-fonts/fraunces`, `@expo-google-fonts/literata`, `@expo-google-fonts/ibm-plex-mono`.

**SDK 57 constraint (M2):** iOS/Android can't select faces from variable fonts until SDK 58 (and `fontVariationSettings` arrives with React Native 0.88), so each weight is loaded as a static file and Fraunces' `SOFT`/`WONK` axes are not applied yet. Revisit on SDK 58.

---

## 4. Spacing, shape, elevation

| Token | Value |
|---|---|
| Grid | 4 pt |
| Screen gutter | 16 |
| Card padding | 20 |
| Card radius | 20 |
| Image radius | 14, with 1 px `line.hairline` frame |
| Card height | viewport − header − 56 pt peek |
| Card shadow (light) | `0 2 0 #D9CFBF`, `0 12 24 rgba(31,27,22,0.08)` — a "paper lift" |
| Card shadow (dark) | none; 1 px `line.hairline` border instead |
| Paper grain | tiled 256 px noise PNG, 3 % opacity, light mode only, behind cards — *not yet implemented (M5 polish)* |

---

## 5. Components

### 5.1 Article card (image)
```
┌──────────────────────────────┐
│ ┌──────────────────────────┐ │
│ │                          │ │  image 16:10, cover, framed
│ │        [ photo ]         │ │
│ └──────────────────────────┘ │
│ Cephalopod                   │  Fraunces 28/32
│ intelligence                 │
│ ● BIOLOGY · 4 MIN     ◌ ✓ ✦  │  meta · visited ◌ / read ✓ badges · Find ✦ (§5.11)
│                              │
│ Octopuses can open jars,     │  Literata 17/27, fills free height
│ escape tanks and recognise   │
│ individual human faces…      │
│                              │
│ ↳ LINKED FROM OCTOPUS        │  why-line, ink.muted
└──────────────────────────────┘
```

### 5.2 Article card (typographic, no image)
Same layout; image slot replaced by a territory-colour block (16:10) containing the title in Fraunces 34/38 `bg.card` colour and the topic icon (Phosphor duotone, 48 pt) bottom-right. Title is not repeated below the block.

### 5.3 Why-line copy
| Source | Copy |
|---|---|
| Outgoing link | `↳ LINKED FROM {SEED}` |
| Sideways (detour out of the seed's territory) | `⤳ DETOUR INTO {TOPIC} · LINKS TO {SEED}` — `⤳ DETOUR · LINKS TO {SEED}` when the card has no topic label |
| Backlink (seed has no territory) | `↰ LINKS TO {SEED}` |
| morelike | `≈ SIMILAR TO {SEED}` |
| Home – interest | `★ YOU LIKE {TOPIC}` — from a subfield/leaf pick (SPEC §3.9), `{TOPIC}` is that node's label: `★ YOU LIKE STOICISM` |
| Home – today | `☀ TODAY ON WIKIPEDIA` |
| Home – wildcard | `↯ WILDCARD` (was `✦` until M6 — ✦ now means Find) |

### 5.4 Badges
- **Visited** (seen on another branch of this expedition): dashed circle `◌` in `ink.muted`.
- **Read**: small check `✓` in `ink.muted`.
Both top-right of meta row; never colour-coded.

### 5.5 Seed header (top of every non-root column)
Compact 56 pt strip: 40 pt thumbnail (or territory swatch), title in Fraunces 18, `EXPLORING FROM` mono label, topic dot. Tap → reader for the seed.
A column set off from the atlas (§5.12) swaps the label for `SET OFF FROM YOUR ATLAS`, or `FIRST STEP INTO {TERRITORY}` when the territory was uncharted.

### 5.6 Breadcrumb / route
Mono caps crumbs joined by a dotted route line (2 pt dots, 4 pt gap, `ink.muted`); current crumb in `ink.primary`. Tap a crumb → jump. Home crumb shows the wordmark glyph.

### 5.7 Stamp
SVG template, 72 pt (Logbook) / 120 pt (toast):
- Double circle border (outer 2 pt, inner 1 pt), territory colour
- Topic name set on a circular path, Plex Mono caps
- Topic Phosphor icon centred (duotone)
- `feTurbulence` + `feDisplacementMap` roughen filter for an inked edge; rotation −8° to +8° seeded by topic
- Uncollected: dashed `line.hairline` outline, icon at 25 % opacity

### 5.8 Peek card (reader inline link)
Bottom sheet, 180 pt: thumbnail, title (Fraunces 22), description (Literata 15), two buttons:
- **Take a tangent →** (primary, ink fill, `bg.card` text)
- **Read** (secondary, hairline outline)

### 5.9 Toast — "New territory"
Stamp drops in at centre-top, mono caption `NEW TERRITORY · PHILOSOPHY`, auto-dismiss 1.8 s, medium haptic.

### 5.10 Recap card (expedition log)
```
┌──────────────────────────────┐
│ EXPEDITION LOG · 1 OCT       │  mono
│                              │
│ From Octopus                 │  Fraunces italic 26
│ to Roman aqueducts           │
│                              │
│ ●───●───●───●───●───●───●    │  route strip, dots in territory colours
│ LIFE      EARTH      PAST    │
│                              │
│ 7 tangents · 3 read · 2 finds│  Literata; "· finds" hidden when 0
│ Furthest leap:               │
│ Iron gall ink → Magna Carta  │
│                              │
│ [ Continue expedition → ]    │
└──────────────────────────────┘
```
"Furthest leap" = consecutive hop pair whose territories differ and whose nodes are deepest; ties → latest.

### 5.11 Find mark ✦ (M6)
The four-point star from the app-icon rim (§9) — the same vector, no new art.
- **Off:** outline ✦ in `ink.muted`. **On:** solid ✦ in the card's territory colour (ink when the card has no territory).
- **Card:** end of the meta row after ◌ ✓, ~16 pt (a touch larger than the badges), padded to a 44 pt touch target. Visible on every card, found or not.
- **Reader:** ✦ button at the right end of the header bar, opposite close.
- **Peek card** for a Find: ✦ in the title row, solid.
- Never on compass, dead-end, error or offline cards.

### 5.12 World atlas (M7)
Behaviour: SPEC §3.8. Mock: https://claude.ai/artifact/5Nhx1k1iX7KuRBDtrrmNyr
```
┌──────────────────────────────┐
│ WORLD ATLAS                  │  mono, ink.muted
│ Everywhere you've wandered   │  Fraunces italic 24/28
│ 8 expeditions · 73 places ·  │  Literata 13, ink.muted
│ 6 of 7 territories charted   │
│ ╭──────────────────────────╮ │
│ │ MIND · 16      COSMOS · 4│ │  map frame: bg.card, radius 18,
│ │  (∴∵)    ┆CRAFT┆   (∵)   │ │  card shadow; continents tinted,
│ │ LIFE · 20      EARTH · 9 │ │  uncharted dashed
│ │  (∴∵∴)  ⋯routes⋯  (∵∴)   │ │
│ │ PAST · 4    CULTURE · 20 │ │
│ │  (∵)          (∴∵∴)      │ │
│ │     TAP A TERRITORY TO ZOOM│
│ ╰──────────────────────────╯ │
│ ┆○ Blind spot: Craft. Never  ┆│  blind-spot bar
│ ┆  entered.        SET OFF → ┆│
│ [ALL · 8] [29 SEP · 14 HOPS ]│  expedition chips, scroll sideways
│           [From Ferment…   ] │
│           [●●●●●●●●●       ] │
└──────────────────────────────┘
```

**Map.** Drawn in a 340 × 380 unit space (`react-native-svg` viewBox), scaled to the frame width; 1 unit ≈ 1 pt on a 375 pt phone. Gutter 8 pt each side.

**Continents.** One per territory, at fixed centres so the world keeps its shape:

| Territory | Centre | Territory | Centre |
|---|---|---|---|
| Mind | 64, 66 | Earth | 272, 206 |
| Cosmos | 262, 62 | Past | 96, 322 |
| Craft | 166, 136 | Culture | 242, 318 |
| Life | 70, 214 | | |

- Shape: a closed blob through 16 points around the centre, each at radius × (0.88–1.10), jitter seeded by territory so it never changes. Radius = `min(46, 20 + 5.4 × √places)`.
- Charted: territory tint and outline (§2.4 exception). Label above it: Plex Mono 500 caps 8.5, territory colour, `{TERRITORY} · {n}`.
- Uncharted: radius 24, 1 pt dashed (3/3) outline in `ink.muted` at 60 %, no fill, label `{TERRITORY} · UNCHARTED` in `ink.muted`.

**Places.** Slot `s` (SPEC §3.8) sits at radius `6.4 × √(s + 0.5)` and angle `s × 137.5°` from its continent's centre, giving an even sunflower packing that grows outward.
- Radius `2.3 + 0.45 × min(visits, 8)`.
- Read: solid territory colour. Passed through: `bg.card` fill, territory-colour stroke at 45 % of the radius. Find: the ✦ vector (§5.11) in territory colour at 1.5 × the radius.
- Touch target: at least 44 pt, centred on the place, without overlapping a neighbour's glyph.
- Labels: Literata 10, `ink.primary`, 3 pt `bg.card` halo, right of the glyph, truncated at 18 characters. In the world view, only places with ≥ `ATLAS_LABEL_MIN_VISITS` visits and Finds get labels (Finds only while there are ≤ 20 expeditions). Zoomed in, every place in that territory is labelled.

**Routes.** Quadratic curves between places, bowed 16 % of their length to one side (alternating by expedition) so overlapping routes separate.
- All: `ink.primary`, 0.9 pt, dotted 2/2.5, at 20 % opacity (7 % with more than 20 expeditions).
- Selected expedition: solid 1.8 pt at 90 %, `SET OFF` (Plex Mono 7.5 caps) above its root, a 7 pt `ink.primary` ring around its most recent node. Other routes drop to 3.5 %, and places it didn't pass through drop to 22 %.

**Zoom.** Tapping a charted continent fits it to the frame (viewBox width = radius × 3.1). Strokes, labels and glyphs keep their on-screen size. Controls on the frame: `‹ WORLD` (hairline pill, top-left) when zoomed; the hint `TAP A TERRITORY TO ZOOM` (Plex Mono 9.5, `ink.muted`, bottom-right) when not; and the zoom's `SET OFF INTO {TERRITORY} →` (`ink.primary` pill with `bg.card` text, bottom-right) in place of the hint.

**Blind-spot bar.** Full width under the map, 1.5 pt dashed `line.hairline` border, radius 14. A 10 pt dashed ring in the territory's colour (`ink.muted` when uncharted), the copy in Literata 13 with the territory name bold, and `SET OFF →` in Plex Mono 11 at the right. The whole bar is one button.

**Expedition chips.** Horizontal row, scrolls sideways, 8 pt gap. `ALL · {n}` first, then 168 pt chips: `{DATE} · {n} HOPS` (Plex Mono 9.5, `ink.muted`), title (Literata 13, one line), and a route strip of the first 12 nodes (3.2 pt dots on a `line.hairline` rule). Selected chip: 1 pt `ink.primary` border plus a 1 pt inner ring.

**Place sheet.** A bottom sheet styled like the peek card (§5.8), sized to its content. Meta row `● {TERRITORY} · VISITED {n}× · ✓ READ` in territory colour, title in Fraunces 24/28, then **Set off from here →** (primary) and **Read** (secondary, hairline). Below, `PASSED THROUGH ON {n} EXPEDITIONS` with up to 3 rows (date in Plex Mono 10, title in Literata 14, `line.hairline` rule on the left) and `+{n} MORE` after that. A Home find adds `✦ FOUND ON HOME, OUTSIDE ANY EXPEDITION` in Plex Mono, `ink.muted`.

**Territory sheet.** Same sheet: meta `● {TERRITORY} · {n} PLACES` (or `· UNCHARTED` in `ink.muted`), title, one line in Literata 15 naming the territory's tiles, and **Set off into {Territory} →**.

---

## 6. Screens

### 6.1 Onboarding
```
┌──────────────────────────────┐
│ tangent                      │
│ Where shall we start?        │  Fraunces 30
│ PICK AT LEAST 3              │  mono
│ ┌──────┐ ┌──────┐ ┌──────┐   │
│ │ icon │ │ icon │ │ icon │   │  unselected: card surface, icon in territory colour
│ │Space │ │Animals││History│   │  selected: filled territory colour, rotates ±2°, check badge
│ └──────┘ └──────┘ └──────┘   │
│   … 24 tiles, 4 columns …    │
│                              │
│ [ Set off → ]   skip         │  disabled until 3 picked
└──────────────────────────────┘
```

### 6.2 Home
Header: wordmark left, Logbook (`BookOpen`) right. One snapping card + 56 pt peek.

**First-hop hint** (until the first hop; rules in SPEC §4.4): a chip straddles the focused card's bottom edge, 14 pt from its right edge — `ink.primary` pill, `bg.card` text, IBM Plex Mono 500 11/16 caps, padding 3 × 10, moves with the card. The card peels (§7). No chip on compass, error or offline cards.

### 6.3 Column
Header = breadcrumb route, then seed header, then snapping cards. No Logbook button mid-expedition. Until the first return, each column's first card carries the same chip with the back copy (§8); no peel.

### 6.4 Reader sheet
Full-height sheet over the column, grabber on top, header bar with close (left) and Find ✦ (right, §5.11), `bg.card` surface, injected CSS (fonts, colours, hides edit links, max measure 68 ch, images framed like cards). Footer: `FROM WIKIPEDIA · CC BY-SA 4.0` + link to source.

### 6.5 Logbook
Back, title `LOGBOOK`, gear. Then the world atlas (M7, §5.12): eyebrow, title, stats, map, blind-spot bar, expedition chips. Then the stamps grid (5 per row, `6 / 24` count). Then `FINDS · {n}` (M6): a horizontal strip of the latest finds (thumbnail or territory swatch, title, solid ✦), newest first, with *See all →* to the `FINDS` list screen (title, `FOUND ON · FROM {first}…` / `FOUND ON HOME` caption). Tap a find → peek card (§5.8). Then the expeditions list: title, date, hop count, territory route strip. Tap → recap card.

### 6.6 Settings
Interests (re-open tile picker) · Theme (System / Paper / Night atlas) · Reduce motion (System / On) · Share anonymous usage (toggle) · About & attributions.

### 6.7 States
| State | Visual |
|---|---|
| Loading card | compass card: hairline frame, a needle (territory colour; ink on Home) hunting in ≤ 400 ms swings above `SETTING A COURSE…`. If the column is still empty after 400 ms, `WHILE YOU TRAVEL` + a quote from the seed card fade in (Fraunces 600 italic 22/28): its extract's second sentence if ≤ 140 chars, else the first (trimmed with `…`), else its description; none on Home or resumed columns. Picked once, never swapped. Reduce Motion: needle rests at 45°. |
| Dead end | `Compass` icon + `DEAD END — SWIPE RIGHT TO GO BACK` |
| Offline | `CloudSlash` icon + `YOU'RE OFFLINE — YOUR LOGBOOK STILL WORKS` |
| Error | `Warning` icon + `COULDN'T LOAD — TAP TO RETRY` |

---

## 7. Motion

| Moment | Spec |
|---|---|
| **Drag left** | Card translates with finger; rotates `translateX / width × −3°`; behind it, territory-colour `TAKE A TANGENT →` label and next column's first 2–3 titles (from prefetch) at 40 % opacity |
| **Hop commit** | Spring (damping 18, stiffness 180, ~350 ms): card scales to seed-header size and moves to header slot; new column translates in from right `+width → 0`; first card rises `+24 → 0` with 60 ms delay; light haptic |
| **Route draw** | New dotted segment + crumb fade/slide in, 250 ms ease-out, starts at 150 ms into hop |
| **Back** | Exact reverse; route segment erases right-to-left |
| **Below threshold** | Spring back to 0, no haptic |
| **Home right swipe** | Rubber-band to max 24 pt, spring back |
| **Snap scroll** | Platform paging spring |
| **Hint peel** | Focused Home card eases out to `−96` pt (380 ms, ease-out cubic) with the drag's tilt and label fade, holds 600 ms, springs back (damping 18, stiffness 180, overshoot clamped — an overshoot past rest read as a shake on device). No haptic. Reduce Motion: none |
| **Stamp toast** | Scale 1.4 → 1.0 with −8°→ seeded rotation, 220 ms; ink-spread mask 0 → 100 % 180 ms; medium haptic |
| **Find** | Outline → solid: the stamp's ink-spread mask 0 → 100 % in 180 ms; light haptic. Remove: instant to outline, no haptic. Reduce Motion: cross-fade |
| **Reader** | Platform bottom sheet |
| **Atlas zoom** | viewBox eases to the continent (or back to the world) in 340 ms, ease-out cubic. No haptic. |
| **Atlas route trace** | Selecting a chip cross-fades routes and place opacity in 200 ms. Routes never animate drawing in, so the hop stays the one signature moment. |
| **Set off** | The Logbook closes and the new column pushes in from the right on the hop's column spring, with no card flight because there is no card. Light haptic. |
| **Reduce Motion** | All of the above → 200 ms cross-fades; no tilt, no scale, no route drawing |

Hard limit: no animation > 400 ms.

M0 prototype (2026-10-01): hop springs (damping 18, stiffness 180) validated on device; push and flight springs are overshoot-clamped. Measured flight ≈ 320 ms.

---

## 8. Voice & microcopy

Curious, warm, short. Second person. Cartographic verbs (set off, cross, chart, wander).

| Where | Copy |
|---|---|
| Swipe label | Take a tangent → |
| First-hop hint chip | ← Swipe left to take a tangent |
| First-return hint chip | Swipe right to go back → |
| Onboarding | Where shall we start? |
| Onboarding CTA | Set off → |
| Seed header | Exploring from {title} |
| Recap title | From {first} to {last} |
| Recap count | {n} tangents · {r} read · {f} finds (finds part hidden when 0) |
| Toast | New territory · {topic} |
| Logbook empty | No expeditions yet. Swipe left on anything that catches your eye. |
| Find ✦ label (off / on) | Keep as a find / Remove find |
| Find removed toast | Find removed · Undo |
| Logbook Finds section | Finds · {n} — See all → |
| Find caption | Found on · From {first}… / Found on Home |
| Finds empty | Nothing found yet. Tap ✦ on anything worth keeping. |
| Atlas eyebrow / title | World atlas / Everywhere you've wandered |
| Atlas stats | {e} expeditions · {p} places · {c} of 7 territories charted |
| Atlas empty (no places) | Uncharted so far. Set off and the map fills in. (in place of the stats line) |
| Atlas hint / zoom out | Tap a territory to zoom / ‹ World |
| Uncharted label | {Territory} · Uncharted |
| Blind-spot bar | **Blind spot: {Territory}.** Never entered. / Only {n} places so far. — Set off → |
| Place sheet | Set off from here → · Read · Passed through on {n} expeditions · Found on Home, outside any expedition |
| Territory sheet title | You've never been to {Territory} / Only {n} places in {Territory} |
| Set off into | Set off into {Territory} → |
| Seed header label (from atlas) | Set off from your atlas / First step into {Territory} |

---

## 9. Iconography & assets

- **Icons:** `phosphor-react-native`, Regular weight for UI, Duotone for topics. Topic → icon map lives in config next to tile → topic map.
- **Stamps:** generated from §5.7 template; config only.
- **Grain:** one 256 px PNG.
- **App icon:** a stamp, generated by `npm run icons` from `src/brand/iconArt.ts` (PNGs committed in `assets/`).
  - Double ring (outer 24, inner 9 on a 1024 canvas), inked edge (fixed-seed `feTurbulence`), **upright** — unlike Logbook stamps, the icon never tilts.
  - Rim: `TANGENT ✦ TANGENT ✦`, IBM Plex Mono 600 caps, lead word centred at the top. Every letter, star and gap takes one equal slot; caps centred between the rings; ✦ is a vector star at 3 and 9 o'clock.
  - Centre: the wordmark glyph (`src/brand/tangentGlyph.ts`, shared with the Home header), unchanged, its circle concentric with the seal.
  - One artwork everywhere, flat `bg.paper` behind it: ink on paper (iOS light, splash), paper on walnut (iOS dark, dark splash), white on transparent (iOS tinted, Android monochrome). Android foreground is scaled into the 66/108 dp safe zone on a `#F4EDE0` adaptive background.
  - Favicon: the glyph alone, ink on paper (the stamp is unreadable at 16–48 px).
- **Photos:** Wikipedia thumbnails, unfiltered, framed.

### Topic icon map (Phosphor)
| Tile | Icon | Tile | Icon |
|---|---|---|---|
| Space | `Planet` | Books | `BookOpen` |
| Animals | `PawPrint` | Places | `MapPin` |
| History | `Bank` | Philosophy | `Brain` |
| Music | `MusicNotes` | Science | `Atom` |
| Film & TV | `FilmSlate` | Maths | `MathOperations` |
| Food | `ForkKnife` | Medicine | `FirstAidKit` |
| Sport | `SoccerBall` | Games | `GameController` |
| Tech | `Cpu` | Earth | `Mountains` |
| Art | `PaintBrush` | Society | `UsersThree` |
| Business | `ChartLineUp` | Transport | `Train` |
| Architecture | `Buildings` | Engineering | `Crane` |
| Comics & Anime | `ChatCircleDots` | Military | `Sword` |

---

## 10. Accessibility

- AA contrast (§2.3) in both themes.
- Every gesture has a button equivalent: card long-press → action menu (Read / Take a tangent); column header back button; VoiceOver/TalkBack custom actions on cards.
- The card is one accessible element, so its ✦ is not separately focusable: cards expose a custom action *Keep as a find* / *Remove find* (M6), and the label gains "Kept as a find" when on.
- Font scaling respected; minimum touch target 44 pt.
- Reduce Motion honoured (§7).
- Haptics off when system haptics are off.
- Images get `alt` from Wikipedia description, else title.
- **Atlas (M7):** the map is one accessible element labelled with the stats line (*8 expeditions, 73 places, 6 of 7 territories charted*), with custom actions *List places by territory* and *Set off into {blind spot}*. The list opens the same places as an accessible list grouped by territory, each row opening its place sheet. Chips, the blind-spot bar and both sheets are ordinary buttons. Zoom and route tracing are visual only; the list covers what they show.

---

## 11. Open design items

| Item | Note |
|---|---|
| Name availability | Check App Store, Play Store, domain for "Tangent" before branding work |
| `cirrusdoc` topic coverage | Verified working; coarse-only articles get territory colour without a label (SPEC §6) |
| Furthest-leap heuristic | Tune after dogfooding |
| Atlas density | Continent radius caps at 46. Check a heavy profile (~200 places in one territory) for overlap before M7 ships; fall back to count badges at world zoom. |
| Atlas in Night atlas | Tint percentages are from the mock; verify place glyph contrast on tinted continents on device. |
| Long-press menu vs. gesture discoverability | Validate in M0 prototype |
| Niche interests (SPEC §3.9, M8) | Not designed yet: the tree drill-down in Settings → Interests, the Home prompt card (`NARROW PHILOSOPHY?` + subfield chips), the exhaustion card, the Logbook *Completed* section, and a pressed state for the tappable topic label. Prompt/exhaustion cards share one non-article card type. |
