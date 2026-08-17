# Saga Map (Home Page) Visual Enhancement Plan

> **Status: implemented.** Three structural corrections were needed along the way —
> they are recorded inline below, since each one is a case where the obvious
> implementation produces no visible effect.

## Problem
The current home page (`SagaMap.jsx`) is functional but visually basic. It has a plain dark background, simple circular buttons, and static text. It lacks the vibrant, 3D, "world map" feel of a premium casual mobile game.

---

## Proposed Changes

### 1. Thematic "World Map" Background
We will replace the plain dark background with a rich, continuous vertical gradient that simulates traveling through different "zones" as the player scrolls up (e.g., deep forest green at the bottom -> purple twilight -> pink candy clouds at the top). 
- We will add subtle parallax SVG overlay layers (like distant hills or floating candy islands) behind the path to give it depth.

> **Correction — the gradient must live on the scrolling element.** Painted on
> `.saga-map` (the viewport-height flex container) the gradient is pinned to the
> screen and never moves, so nothing "travels". It belongs on `.saga-path`, the
> tall element that actually scrolls.
>
> **Correction — spacing.** At the original 110px per level the whole path was
> ~650px against a ~600px viewport: roughly 30px of scroll travel, which made
> every scroll-driven effect here imperceptible. Raised to **170px** per level
> (~900px tall). The existing auto-scroll-to-current-level behaviour means the
> extra length costs nothing in navigation.
>
> **Implemented as:** the zone gradient is generated from `THEMES` in
> `DynamicBackground.jsx` (now exported), so each stretch of the map previews the
> actual backdrop of the level it leads to, and adding a level extends the
> gradient for free. Two SVG hill layers translate at 0.28x and 0.14x of the
> scroll offset (rAF-throttled) for parallax depth.

### 2. 3D "Stepping Stone" Level Nodes
The current level buttons are flat circles. We will upgrade them to look like tactile 3D candy drops or stepping stones:
- **Locked Nodes**: Dimmed, grayed-out flat stones.
- **Completed Nodes**: Vibrant 3D candy buttons with an inner highlight and a thick, darker bottom border (`box-shadow` or `border-bottom`) to create a satisfying 3D push effect when tapped.
- **Current Node**: An aggressively pulsing, glowing 3D button.

### 3. Player Avatar / Location Marker
Currently, the "current" level just pulses. We will add a small, bouncy 3D marker (like a little flag, a character icon, or a glowing pin) that sits directly on top of the player's current active level. This gives a sense of physical presence on the map.

### 4. "Stitched" Candy Trail Path
We will enhance the SVG `<polyline>` that connects the levels:
- Make it thicker and more vibrant.
- Style it like a dashed "stitch" line or a trail of small candy dots.
- *Optional*: Color the path differently for completed sections vs. locked sections.

> **Correction — the trail was never rendering.** The existing polyline emitted
> `points="50%, 120 ..."`. SVG's `points` attribute takes bare numbers; percentages
> are not valid units there, so the parser aborted at the first `%` and the
> connecting line simply never drew. Fixed by measuring the map width
> (`ResizeObserver`) and emitting real pixel coordinates.
>
> **Implemented as:** two overlaid polylines — a faint dotted base for the full
> route, and a glowing gold ribbon covering the stretch already cleared. The
> optional completed/locked colouring was worth doing precisely because it is
> what makes the longer map legible at a glance.

### 5. Frosted Glass (Glassmorphism) Header
The top header ("Candy Saga") currently has a simple linear-gradient fade. We will upgrade it to a premium frosted glass effect (`backdrop-filter: blur()`) so the map underneath blurs beautifully as the player scrolls behind the sticky header. We will also give the title text a bubbly, 3D "candy" text-shadow.

> **Correction — nothing was passing behind the header.** `.saga-map` is a flex
> column, so the header and the scroll area are *stacked siblings* that never
> overlap; `backdrop-filter` had nothing but flat background to blur. `position:
> sticky` does not help either, because the header's parent is not the scrolling
> element — the scroll happens inside `.saga-scroll-area`.
>
> **Implemented as:** the header is `position: absolute` over the scroll region,
> with matching `padding-top` on `.saga-scroll-area` so content clears it. The map
> now genuinely slides underneath and blurs. The auto-scroll centering math was
> adjusted for that new padding via the path's `offsetTop`.

---

## Resolved Questions

**Avatar Choice**: 🍬 bouncy candy — on-theme with the game's own candy sprites.
Rendered as a sibling of the level node rather than a child, so it bobs
independently instead of inheriting the node's pulse and hover scaling.
