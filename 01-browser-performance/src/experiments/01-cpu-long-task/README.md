# Experiment 01 — CPU Long Task

## Goal

Practice locating a blocking interaction with Chrome DevTools Performance tools.

## Scenario

A B2B company directory applies search, filter, and sorting criteria to a deterministic fixture.

## How to Run

From `01-browser-performance`, install dependencies and run `npm run dev`. Open the Browser Performance Lab shell and select **01 — CPU Long Task**.

## Reproduction Steps

1. Select 1000 companies (the default) or 2000 companies and Large taxonomy.
2. Enter `biopharma` in Search companies.
3. Select United States and the first therapeutic-area option.
4. Enable Active only and choose Country sorting.
5. Set Chrome Performance CPU throttling to 6×.
6. Record a Chrome Performance trace while clicking Apply Filters.

## Recommended DevTools Setup

TODO: configure the Performance panel and CPU throttling before recording a trace.

## Metrics to Collect

TODO: record the Apply Filters duration and the duration of the relevant main-thread task.

## Benchmark Environment

Chrome production build with 6× CPU slowdown, 1000 companies (or 2000 for a stronger trace), and Large taxonomy.

## Baseline Measurements

TODO: record baseline measurements after profiling on the target machine.

## Profiling Evidence

TODO: record the Performance trace and identify the dominant call stack.

## Findings

TODO: document the evidence gathered during investigation.

## Hypothesis

TODO: write a hypothesis after reviewing the profiling evidence.

## Optimization

TODO: complete only after the baseline has been profiled and explained.

## Reference Measurements

TODO: add measurements after an optimization is implemented in a later phase.

## Before / After

TODO: add a comparison after a later optimization phase.

## Trade-offs

TODO: document trade-offs after a later optimization phase.

## What I Learned

TODO: complete after the investigation.
