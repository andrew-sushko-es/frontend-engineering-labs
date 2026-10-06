# Add to WatchList Optimization

## Problem

Small UI state changes caused very broad React rerenders. Toggling Watchlist for a single company rendered all 500 CompanyCard components and all 500 CompanyStats components.

## Profiling Evidence

React DevTools Profiler showed 500 CompanyCard and 500 CompanyStats renders for a single Watchlist toggle. An unrelated CompanyCard reported both context changed and changed props, while CompanyStats rendered because its parent rerendered. Watchlist commit p50 was 942 ms and p95 was 1013.6 ms in the React profiling build.
Chrome Performance on the normal production build showed a 117.49 ms task dominated by 91 ms of scripting, compared with only 6.8 ms Layout and 17.2 ms Paint. This confirmed that excessive JavaScript/React work, rather than browser layout, was the primary bottleneck.

## Root Cause

Every CompanyCard consumed a broad MarketplaceContext. Updating one company's watchlist state changed the Provider value and notified all card consumers. At the same time, CompanyList recreated object and callback props such as displayMeta, onCompare, onSelect, and onWatchList, making props referentially unstable. As each card rerendered, CompanyStats also rerendered because its parent rendered.

## Hypothesis

If cards stop subscribing to broad context updates and unchanged cards receive referentially stable props, React.memo should be able to skip unrelated cards. A one-company Watchlist update should then reduce the render scope from hundreds of cards to approximately one.

## Optimization

Removed broad Marketplace Context consumption from CompanyCard, passed card-specific state explicitly, stabilized object/callback props, and memoized CompanyCard. This allowed shallow prop equality to bail out unrelated cards.

## Before / After

CompanyCard renders fell from 500 → 1, and CompanyStats renders from 500 → 1. React commit p50 improved from 942 ms → 106.75 ms (~8.8×) and p95 from 1013.6 ms → 110.42 ms (~9.2×). In the production browser trace, task duration improved from 117.49 ms → 51.36 ms (−56%), while scripting fell from 91 ms → 28 ms (−69%).
