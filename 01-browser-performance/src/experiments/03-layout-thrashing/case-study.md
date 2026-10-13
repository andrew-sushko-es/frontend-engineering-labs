# Experiment 03 — Layout Thrashing

## Goal

Investigate a laggy splitter-resize interaction and determine whether the
bottleneck comes from JavaScript, forced synchronous layout, style
recalculation, or the amount of browser layout work.

## Benchmark Environment

- Date: 2026-10-13
- Build: Production
- Dataset: 150 analytics cards
- CPU throttling: 6×
- Interaction: Drag the results-panel splitter
- Primary tool: Chrome DevTools Performance

---

## Problem

Dragging a splitter resized a results panel containing approximately 150
analytics cards.

The interaction was visibly laggy.

The initial implementation recalculated adaptive card presentation on every
`pointermove`.

The hot path was approximately:

```text
pointermove
→ resizeFromPointer()
→ applyAdaptiveCardLayout()
→ update panel width
→ iterate through ~150 cards
→ write styles
→ read geometry
→ update classes/styles
```

Inside the card loop, layout-affecting DOM writes were interleaved with
geometry reads such as `getBoundingClientRect()`.

Example:

```ts
resultsPanel.style.flexBasis = `${resultsWidth}px`;

for (const card of cards) {
  card.style.setProperty("--available-width", `${resultsWidth}px`);

  const cardWidth = card.getBoundingClientRect().width;

  card.classList.toggle("is-compact", cardWidth < 390);

  const metricsWidth = metrics.getBoundingClientRect().width;
  const tagsWidth = tags.getBoundingClientRect().width;

  // additional style updates
}
```

---

## Baseline

A representative ~1 second section of the drag showed:

| Metric | Baseline |
|---|---:|
| Rendering | 811 ms |
| Scripting | 127 ms |
| Painting | 28 ms |
| Recalculate Style | 268 ms |
| Layout | 406 ms |
| Representative pointermove | ~125–128 ms |
| User-visible result | Severe lag |

The Performance trace showed repeated style/layout work originating from the
splitter interaction.

A major issue was the ordering:

```text
DOM write
→ geometry read
→ browser needs current geometry
→ synchronous style/layout work
→ more DOM writes
→ another geometry dependency
```

---

## Root Cause

The original implementation had two related performance problems.

### 1. Forced synchronous layout

Layout-affecting writes were followed by geometry reads such as
`getBoundingClientRect()`.

Because layout was dirty, the browser sometimes had to update style/layout
synchronously before JavaScript could continue.

This created a classic read/write layout-thrashing pattern.

### 2. Expensive layout scope

Removing the forced synchronous reads did not solve the interaction.

Changing the results-panel width still affected a large grid containing 150
cards:

```text
results panel width changes
→ grid width changes
→ card widths change
→ text wrapping / component geometry can change
→ card heights and downstream positions can change
→ large document layout
```

The resulting Layout events were still approximately 60–70 ms and were rooted
at the document.

Therefore the final bottleneck was not JavaScript execution itself, but the
amount of browser layout work required for a very large offscreen document.

---

# Optimization Iterations

## Attempt 1 — Batch DOM Reads and Writes

### Hypothesis

If layout reads and writes were separated into phases instead of interleaved
per card, the browser should perform fewer synchronous style/layout flushes.

The logic was reorganized approximately as:

```text
A. perform writes
B. read card dimensions
C. perform responsive writes
D. read dependent dimensions
E. perform final writes
```

### Result

| Metric | Baseline | Batched |
|---|---:|---:|
| Rendering | 811 ms | 912 ms |
| Scripting | 127 ms | 41 ms |
| Recalculate Style | 268 ms | 236 ms |
| Layout | 406 ms | 524 ms |

Scripting improved substantially, and repeated style-tree updates were reduced.

However, the interaction remained laggy.

A large Layout still occurred after the batched writes.

### Conclusion

Batching fixed part of the **layout-thrashing mechanism**, but it did not make
the actual required layout inexpensive.

This demonstrated an important distinction:

```text
fewer forced flushes
≠
cheap layout
```

---

## Attempt 2 — Replace JavaScript Measurements with Container Queries

The measured widths were only being used to control presentation:

- compact card state;
- metrics column count;
- metric font sizing;
- tag column count.

JavaScript did not need those dimensions as application data.

### Hypothesis

Move responsive decisions into CSS container queries so `pointermove` no
longer requires synchronous DOM geometry reads.

The hot path should become:

```text
pointermove
→ change panel flex-basis
→ return from JavaScript

browser rendering pipeline:
Style
→ Layout
→ Paint
```

instead of:

```text
pointermove
→ write
→ getBoundingClientRect()
→ forced Layout
→ continue JavaScript
```

### Result

| Metric | Container Queries |
|---|---:|
| Rendering | 915 ms |
| Scripting | 18 ms |
| Painting | 41 ms |
| Recalculate Style | 212 ms |
| Layout | 539 ms |
| `getBoundingClientRect()` in hot path | No |
| Layout nested inside `pointermove` | No |
| User-visible result | Still laggy |

### Conclusion

This optimization was mechanically successful.

The forced synchronous Layout disappeared from `pointermove`, and JavaScript
became very cheap.

But Layout remained expensive.

This proved that:

> Removing forced synchronous layout does not necessarily remove the cost of
> layout that the browser legitimately needs to render the new geometry.

---

## Attempt 3 — Remove Per-Card Style Invalidations

After introducing container queries, the hot path still updated this property
for every card:

```ts
card.style.setProperty("--available-width", `${resultsWidth}px`);
```

It was used for:

```css
padding: clamp(13px, calc(var(--available-width) / 62), 22px);
```

This meant every pointer movement still performed approximately 150 style
mutations affecting layout geometry.

The value was also conceptually incorrect: `resultsWidth` represented the
entire results panel, not an individual card's actual width.

### Hypothesis

Remove the per-card CSS-variable mutation and temporarily use static padding so
the hot path only changes the results panel width.

```ts
const applyAdaptiveCardLayout = (resultsWidth: number) => {
  const resultsPanel = resultsPanelRef.current;

  if (!resultsPanel) {
    return;
  }

  resultsPanel.style.flexBasis = `${resultsWidth}px`;
};
```

### Result

| Metric | Static Padding |
|---|---:|
| Rendering | 872 ms |
| Scripting | 68 ms |
| Painting | 44 ms |
| Recalculate Style | **1.9 ms** |
| Layout | 692 ms |
| Representative Layout | **63.83 ms** |
| Layout root | `#document` |
| User-visible result | Still laggy |

### Conclusion

This was a particularly useful diagnostic result.

Style recalculation almost disappeared:

```text
212 ms
→
1.9 ms
```

but a single Layout still cost approximately 64 ms.

Therefore the per-card style mutations were inefficient, but they were **not
the dominant cause of the remaining jank**.

At this point the bottleneck was clearly the cost of layout itself.

---

## Final Optimization — `content-visibility: auto`

Only a small fraction of the 150 cards were visible while dragging, but the
document containing the cards was extremely tall.

The browser was still doing significant work for content far outside the
viewport.

### Hypothesis

Use `content-visibility: auto` so the browser can skip expensive rendering work
for offscreen card subtrees.

```css
.analytics-card {
  content-visibility: auto;
  contain-intrinsic-size: auto <estimated-card-height>;
}
```

The DOM and React components still exist, but the browser does not need to
fully process every offscreen subtree during each resize.

### Result

| Metric | Static Padding | `content-visibility` |
|---|---:|---:|
| Rendering | 872 ms | **447 ms** |
| Scripting | 68 ms | 41 ms |
| Painting | 44 ms | 160 ms |
| Recalculate Style | 1.9 ms | 17 ms |
| Layout | 692 ms | **319 ms** |
| Representative Layout | 63.83 ms | **5.26 ms** |
| Layout root | `#document` | `#document` |
| User-visible lag | Yes | **No** |

The representative Layout dropped from:

```text
63.83 ms
→
5.26 ms
```

which is approximately a **92% reduction**, or roughly **12× faster**.

The total Layout time in the comparable selected window also dropped:

```text
692 ms
→
319 ms
```

approximately **54% lower**.

Most importantly, the splitter became visibly smooth.

---

# Why the Final Optimization Worked

The browser still had to perform Layout.

That is expected because resizing the panel changes real geometry.

The optimization did not attempt to remove Layout:

```text
flexBasis changes
→ Layout still required
```

Instead, it reduced how much content required expensive rendering work:

```text
Before

150-card document
→ broad layout/rendering work
→ ~64 ms Layout
→ missed frame deadlines
→ visible jank
```

```text
After

150 cards still in DOM
→ offscreen subtrees can be skipped
→ ~5 ms Layout
→ work fits much closer to frame budget
→ smooth interaction
```

This demonstrates that seeing a `Layout` event in every frame is not
automatically a problem.

The important question is whether the rendering work fits within the available
frame budget.

---

# Why Painting Increased

Painting increased from:

```text
44 ms
→
160 ms
```

while the interaction became smoother.

This should not be interpreted in isolation as a regression.

Before the optimization, the browser spent large portions of the interaction
blocked in expensive Layout work.

After reducing Layout cost, the browser could progress through more complete
rendering cycles:

```text
Style
→ Layout
→ PrePaint
→ Paint
→ Composite
```

The overall Rendering time still decreased substantially:

```text
872 ms
→
447 ms
```

and the user-visible interaction became smooth.

The goal is therefore not to minimize every Performance category
independently, but to make frames complete within their timing budget.

---

# Before vs Final

| Metric | Initial | Final |
|---|---:|---:|
| Rendering | 811 ms | **447 ms** |
| Scripting | 127 ms | **41 ms** |
| Recalculate Style | 268 ms | **17 ms** |
| Layout | 406 ms* | **319 ms** |
| Forced Layout in `pointermove` | Yes | **No** |
| Geometry reads in drag hot path | Yes | **No** |
| Representative expensive Layout | ~60–70 ms | **5.26 ms** |
| User-visible splitter lag | Severe | **None observed** |

\* Total category timings depend on the exact selected trace window, so the
representative Layout duration is the stronger comparison for the final
layout-cost improvement.

---

# Trade-offs

### `content-visibility`

`content-visibility: auto` is a low-complexity optimization for this workload,
but it does not reduce:

- the number of React components created;
- the number of DOM nodes;
- React render cost;
- DOM memory usage.

For much larger datasets where React rendering and DOM size are also
bottlenecks, virtualization would be a stronger solution.

### Virtualization

For a list of thousands of cards:

```text
10,000 data items
→ only visible items + overscan are mounted
→ fewer React components
→ fewer DOM nodes
→ less browser layout work
```

Virtualization is more powerful but introduces substantially more application
complexity, especially with dynamic item heights.

For this 150-card scenario, it was unnecessary because `content-visibility`
already brought the interaction within the required performance budget.

### Container queries

Container queries removed JavaScript-driven responsive measurements and made
the component's presentation logic declarative.

They did not eliminate Layout because changing the container width still
changes real geometry.

### `requestAnimationFrame`

`requestAnimationFrame` could be used to coalesce multiple pointer updates and
process only the latest position once per rendering opportunity.

However, scheduling alone would not have fixed a ~64 ms Layout.

```text
rAF + 64 ms work
=
still ~64 ms work
```

The expensive work needed to be reduced first.

---

# What I Learned

1. A geometry read such as `getBoundingClientRect()` is not inherently
   expensive. It becomes dangerous when it requires current geometry after
   layout-affecting writes.

2. Read/write batching can eliminate repeated forced layout flushes without
   necessarily fixing the underlying cost of Layout.

3. Forced synchronous layout and expensive layout are related but distinct
   problems.

4. Responsive presentation that depends only on component width is often
   better expressed declaratively through CSS/container queries rather than
   JavaScript geometry measurement.

5. Large-scale style invalidation can be expensive, but eliminating it does
   not help enough when actual layout remains the dominant cost.

6. Layout work should be optimized based on scope and frame budget, not simply
   eliminated.

7. `content-visibility: auto` is effective when a large amount of DOM exists
   offscreen and browser rendering, rather than React itself, is the
   bottleneck.

8. Virtualization and `content-visibility` solve different layers of the
   problem:

   - `content-visibility` keeps the DOM but allows the browser to skip
     rendering offscreen subtrees;
   - virtualization avoids mounting most offscreen components and DOM nodes in
     the first place.

---

# What I Would Do in Production

I would keep the responsive behavior in CSS/container queries and avoid
synchronous geometry reads in the drag hot path.

I would remove the per-card `--available-width` JavaScript mutation and express
adaptive spacing through CSS, potentially using container-relative units.

For a moderate list like this one, I would use `content-visibility: auto` with
an appropriate intrinsic-size estimate.

If the dataset grew to thousands of expensive cards and React rendering,
memory, or DOM size also became bottlenecks, I would introduce virtualization.

I would only add `requestAnimationFrame` coalescing if profiling showed that
processing too many pointer updates was still contributing meaningful cost.

---

## Final Result

The interaction evolved from:

```text
pointermove
→ repeated DOM writes/geometry reads
→ forced synchronous layout
→ ~60–70 ms layout work
→ dropped frames and visible lag
```

to:

```text
pointermove
→ minimal panel-width update
→ return

browser rendering pipeline
→ CSS handles responsive presentation
→ offscreen card rendering is skipped
→ representative Layout ≈ 5.26 ms
→ smooth splitter interaction
```

The final optimization reduced representative Layout cost by approximately
**92% (~12×)** and removed the visible splitter jank.
