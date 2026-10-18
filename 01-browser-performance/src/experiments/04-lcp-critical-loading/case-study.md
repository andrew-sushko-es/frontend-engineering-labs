# Experiment 04 — LCP & Critical Loading

## 1. Problem

The primary above-the-fold content of a React SPA appeared significantly later than expected.

The Largest Contentful Paint (LCP) element was the hero heading (`h2`), not the large hero image.

The heading depended on a landing-page configuration fetched at runtime and on a React experiment component loaded through a dynamic import.

The investigation focused on identifying the critical request chain and reducing unnecessary sequential resource loading without removing code splitting.

## 2. Environment

- Application: React SPA built with Vite
- Server: local development host serving the production build
- Browser: Chrome DevTools
- Network: Fast 3G throttling for the main investigation
- Cache: disabled for cold-load recordings
- CPU throttling: used during profiling; the exact setting was not consistently recorded for every benchmark
- Browser extensions: NordPass extension activity was identified as a source of trace contamination; clean-environment comparisons were subsequently performed in Incognito
- Measurements: 20 cold-load runs for each of the two final optimization variants

The initial measurements and later clean-environment measurements are not directly interchangeable because the environment changed during the investigation.

## 3. Reproduction

1. Build the application for production.
2. Open Chrome DevTools.
3. Select the Fast 3G network profile and disable the cache.
4. Reload the page with Experiment 04 selected.
5. Record the load in the Performance panel.
6. Identify the LCP element and inspect its timestamp.
7. Use the Network panel to inspect resource start times, durations, priorities, sizes, and initiators.
8. Inspect the network dependency tree and trace the chain of requests preceding LCP.
9. Inspect the Main track and Bottom-Up panel to distinguish JavaScript execution from network waiting and rendering.
10. Repeat the load under controlled conditions.

## 4. Baseline and evidence

The initial diagnostic run reported LCP around 10.84 seconds.

The Performance panel identified the LCP element as the hero `h2`. Its timestamp was approximately 10.84 seconds.

The LCP breakdown showed:

- TTFB: approximately 9 ms
- Element render delay: approximately 10,827 ms

The Network dependency tree exposed the following critical request chain:

HTML document → main JavaScript bundle → experiment chunk → landing configuration JSON.

The landing configuration request started only after the experiment chunk had loaded. Its response took approximately 2.01 seconds, almost entirely in the waiting-for-response phase.

The main JavaScript bundle was approximately 72.2 KB transferred and took several seconds to download under throttling.

A separate large JPEG request was visible, but the actual LCP element was text. Therefore, the JPEG's size alone did not establish it as the cause of poor LCP.

The initial measurements were affected by browser-extension activity, so they were retained as diagnostic evidence rather than used as the final controlled benchmark baseline.

## 5. Root cause

The hero heading was rendered conditionally, based on the landing configuration.

The application first needed to download and execute the main JavaScript bundle. The shell then loaded the selected experiment using a dynamic import. The experiment subsequently requested the configuration JSON.

Until the configuration became available, the hero heading was replaced by a placeholder.

This created a chain of sequential dependencies. Under slow network conditions, each late-discovered request added delay before the heading could render.

The root cause was not simply a large image or an expensive React render. It was the combination of late resource discovery, sequential requests, and a critical above-the-fold heading that depended on runtime-loaded content.

## 6. Optimization 1 — Preload the configuration

### Hypothesis

If the browser can discover and request the configuration before the main JavaScript and experiment chunk finish loading, the configuration request can overlap with those downloads.

This should reduce the sequential waiting time without changing the content rendered by the application.

### Change

Added an early preload for the landing configuration in the HTML document.

### Expected trade-off

A shared HTML document may preload the configuration even on routes that do not need it. Preloading also consumes bandwidth and request capacity, so it should be reserved for genuinely critical resources.

### Measured result

In the earlier benchmark, LCP fell from approximately 10.59 seconds at p50 to approximately 8.61 seconds at p50.

That comparison was later superseded by a clean-environment benchmark because browser-extension activity had affected the earlier recordings.

## 7. Optimization 2 — Modulepreload the experiment chunk

### Hypothesis

If the browser starts fetching the experiment module before the main bundle finishes loading, the experiment chunk can download in parallel rather than waiting for the shell's dynamic import to discover it.

This should shorten the critical request chain while preserving lazy component evaluation and code splitting.

### Change

Added a `modulepreload` hint for the experiment chunk in the HTML.

The module can be fetched and prepared before the dynamic import executes. `modulepreload` does not immediately execute the module's top-level code.

### Expected trade-off

The experiment chunk may be downloaded even if the user never selects that experiment. A shared HTML preload can therefore reduce the effectiveness of code splitting for other entry points.

For production, route-specific HTML or selective preload generation could avoid that unnecessary transfer.

## 8. Controlled before/after benchmark

The following two variants were benchmarked in the same clean browser environment with 20 measurements each.

- Variant A: configuration preload only.
- Variant B: configuration preload plus experiment modulepreload.

| Metric | Variant A | Variant B |
| ------ | --------: | --------: |
| Min    |  7,820 ms |  5,850 ms |
| p50    |  7,860 ms |  5,880 ms |
| p75    |  7,880 ms |  5,890 ms |
| p95    |  7,880 ms |  5,901 ms |
| Max    |  7,880 ms |  5,910 ms |

Percentiles use linear interpolation.

The p50 reduction was 1,980 ms, or approximately 25.2%.

The optimized measurements were tightly clustered, indicating a repeatable improvement within this test environment.

This is a controlled comparison of the two optimization variants, not a field-data comparison and not proof that all users will experience the same improvement.

## 9. Remaining bottleneck investigation

In a later optimized trace, the main JavaScript request started at approximately 2.03 seconds and finished around 5.76 seconds.

Its timing breakdown was approximately:

- Waiting for response: 2.11 seconds
- Content download: 1.62 seconds
- Transferred size: 72.2 KB
- Decoded body: 231 KB

The selected Performance interval showed approximately 53.9 ms of Layout, 4.9 ms of Recalculate Style, and a React function-call entry with 30.5 ms total time.

These values suggest that JavaScript execution and rendering in the selected interval were small compared with the several-second resource-loading delay. The selected interval does not represent the complete cost of all application execution.

The initial HTML request took approximately 2.02 seconds under Fast 3G throttling, with approximately 2.01 seconds waiting for the response.

Without network throttling, a separate HTML request completed in approximately 4.21 ms, including 1.79 ms waiting for the response.

This supports the conclusion that simulated network conditions contributed substantially to the observed delay. It does not establish that every part of the throttled response time was network latency rather than server processing.

No third optimization was implemented. The next step would be to investigate the remaining critical path, especially initial HTML delivery and main-bundle loading, and formulate a new hypothesis before changing code.

## 10. What I learned

- LCP measures when the largest qualifying content element becomes visible, not when the page finishes loading.
- The LCP element must be identified from evidence rather than assumed to be an image.
- A text-based LCP can depend on JavaScript, configuration requests, and fonts.
- Resource discovery delay differs from resource download duration.
- A request that starts late can delay LCP even if its response is small.
- `preload` and `modulepreload` help the browser discover critical resources earlier.
- `modulepreload` does not immediately execute the module.
- Dynamic imports can preserve code splitting while allowing a critical chunk to be downloaded earlier.
- Network waiting, JavaScript execution, and browser rendering must be measured separately.
- Synthetic throttling is useful for exposing critical dependencies, but results must be interpreted within the test environment.
- Browser extensions and inconsistent benchmark conditions can contaminate performance traces.

## 11. What I would do in production

1. Measure real-user LCP at p75, segmented by mobile and desktop.
2. Confirm the actual LCP element and break down its four phases.
3. Avoid making critical above-the-fold content depend unnecessarily on a runtime configuration request.
4. Use preload hints selectively for resources required by the initial view.
5. Preserve lazy loading for noncritical features.
6. Consider server-rendered or statically generated HTML if critical content needs to be available before the application JavaScript executes.
7. Use a CDN for static assets and sensible cache policies for HTML and hashed resources.
8. Re-test under representative network and CPU conditions, with extensions excluded from laboratory measurements.
9. Verify that any preload optimization does not create excessive downloads on unrelated routes.

## 12. Conclusion

The investigation demonstrated that the main performance problem was a sequential critical loading chain, rather than the size of the hero image or an inherently expensive React render.

Preloading the configuration reduced dependency depth. Modulepreloading the experiment chunk reduced it further.

The final controlled comparison improved median LCP from 7.86 seconds to 5.88 seconds, a 25.2% reduction.

The experiment demonstrates a repeatable laboratory improvement. Further work would be required to determine whether the remaining delay warrants additional optimization and to validate the outcome with real-user data.
