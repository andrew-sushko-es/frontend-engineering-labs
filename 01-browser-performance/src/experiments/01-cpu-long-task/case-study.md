Problem
Applying filters caused a noticeable UI freeze. With 250 companies, the interface remained unchanged for roughly one second while synchronous filtering executed.
Reproduction
Production build, 250 companies, Large taxonomy, 6× CPU throttling, no network throttling. Apply the full filter scenario and trigger Apply Filters.
Baseline
Across 20 unprofiled measurements, Apply Filters had a p50 of 992 ms, p75 of ~995 ms, and p95 of ~1029 ms. The diagnostic Performance trace contained a 1290 ms Long Task, with 1269 ms of scripting.
Profiling Evidence
Chrome Performance Bottom-Up showed findLookupNodeById consuming approximately 1207.7 ms Self Time / 1210.7 ms Total Time, around 94% of sampled CPU time. Call Tree connected this work to filterCompanies → matchesCompanyFilters → resolveLookupLabel → findLookupNodeById. React event handling appeared above this application code but did not itself have significant Self Time.
Root Cause
matchesCompanyFilters executes once for every company and performs multiple lookup resolutions for each company. Each resolution started a fresh recursive traversal of the relevant hierarchical taxonomy. A lookup could therefore cost O(L), producing approximately O(N × R × L) filtering work, where N is the number of companies, R is lookup resolutions per company, and L is taxonomy nodes potentially visited by a lookup.
Hypothesis
If hierarchical taxonomies are indexed once by ID, lookup resolution during filtering can use expected O(1) access instead of repeated O(L) tree traversal. This should remove findLookupNodeById from the hot path and substantially reduce Apply Filters duration.
Optimization
Precomputed reusable lookup Maps from the hierarchical taxonomies and replaced recursive lookup resolution in the filtering path with direct Map access. Index construction is performed outside the company-filtering loop and reused between filter operations.
Before / After
p50 improved from 992 ms → 12.35 ms, approximately an 80× speedup and 98.8% reduction in duration. p95 improved from approximately 1029 ms → 14.31 ms. In the optimized Performance trace, findLookupNodeById no longer dominated CPU time; normalizeSearchValue became the largest application-level cost at only about 13.3 ms Self Time.
What I Learned
A function with high Total Time is not necessarily the CPU bottleneck; Self Time helped distinguish a parent that merely owns expensive descendants from the function actually consuming CPU. Bottom-Up was effective for finding the CPU hotspot, while Call Tree showed how the interaction reached it. The experiment also demonstrated that optimizing the algorithm/data-access pattern can be much more impactful than React-level memoization when the real bottleneck is synchronous application JavaScript.
