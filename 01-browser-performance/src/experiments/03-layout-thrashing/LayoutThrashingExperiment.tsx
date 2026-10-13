import { useRef, useState } from "react";
import {
  generateAnalyticsCards,
  type AnalyticsCardData,
} from "./data/generateAnalyticsCards";

const cardFixtures = {
  50: generateAnalyticsCards(50),
  150: generateAnalyticsCards(150),
  300: generateAnalyticsCards(300),
} as const;

const minimumSummaryWidth = 260;
const splitterWidth = 12;
const minimumResultsWidth = 360;

type CardCount = keyof typeof cardFixtures;
type ResizeSession = { duration: number; moveCount: number } | null;

function AnalyticsCard({ card }: { card: AnalyticsCardData }) {
  const statusClassName = card.status.toLowerCase().replace(" ", "-");

  return (
    <article className="analytics-card" data-analytics-card>
      <header className="analytics-card-header">
        <div>
          <p className="analytics-card-kicker">Portfolio account</p>
          <h3>{card.name}</h3>
        </div>
        <span className={`analytics-status ${statusClassName}`}>
          {card.status}
        </span>
      </header>

      <p className="analytics-card-description">{card.summary}</p>

      <dl className="analytics-card-metadata">
        <div>
          <dt>Owner</dt>
          <dd>{card.owner}</dd>
        </div>
        <div>
          <dt>Region</dt>
          <dd>{card.region}</dd>
        </div>
        <div>
          <dt>Segment</dt>
          <dd>{card.segment}</dd>
        </div>
        <div>
          <dt>Forecast</dt>
          <dd>{card.revenue}</dd>
        </div>
      </dl>

      <div className="analytics-card-metrics" data-card-metrics>
        <div>
          <span>Pipeline</span>
          <strong>{card.pipeline}</strong>
        </div>
        <div>
          <span>Conversion</span>
          <strong>{card.conversion}</strong>
        </div>
        <div>
          <span>Renewal</span>
          <strong>{card.renewal}</strong>
        </div>
        <div>
          <span>Coverage</span>
          <strong>{card.progress}%</strong>
        </div>
      </div>

      <div
        className="analytics-progress"
        aria-label={`${card.progress}% plan progress`}
      >
        <span style={{ width: `${card.progress}%` }} />
      </div>

      <div className="analytics-card-footer">
        <ul className="analytics-tags" data-card-tags>
          {card.tags.map((tag) => (
            <li key={tag}>{tag}</li>
          ))}
        </ul>
        <span className="analytics-card-update">Updated today</span>
      </div>
    </article>
  );
}

export function LayoutThrashingExperiment() {
  const workspaceRef = useRef<HTMLDivElement>(null);
  const resultsPanelRef = useRef<HTMLElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startedAt: number;
    moveCount: number;
  } | null>(null);
  const [cardCount, setCardCount] = useState<CardCount>(150);
  const [lastResizeSession, setLastResizeSession] =
    useState<ResizeSession>(null);

  const applyAdaptiveCardLayout = (resultsWidth: number) => {
    const resultsPanel = resultsPanelRef.current;
    if (!resultsPanel) {
      return;
    }

    resultsPanel.style.flexBasis = `${resultsWidth}px`;

    // const cards = [
    //   ...resultsPanel.querySelectorAll<HTMLElement>("[data-analytics-card]"),
    // ];

    // for (const card of cards) {
    //   card.style.setProperty("--available-width", `${resultsWidth}px`);
    // }

    // const measurements = cards.map((card) => {
    //   const metrics = card.querySelector<HTMLElement>("[data-card-metrics]");
    //   const tags = card.querySelector<HTMLElement>("[data-card-tags]");

    //   return {
    //     card,
    //     metrics,
    //     tags,
    //     cardWidth: card.getBoundingClientRect().width,
    //     metricsWidth: metrics?.getBoundingClientRect().width,
    //     tagsWidth: tags?.getBoundingClientRect().width,
    //   };
    // });

    // for (const measurement of measurements) {
    //   // calculate flags from captured dimensions
    //   // apply classes / CSS custom properties
    //   const { card, cardWidth, metrics, tags, metricsWidth, tagsWidth } =
    //     measurement;
    //   const isCompact = cardWidth < 390;
    //   card.classList.toggle("is-compact", isCompact);

    //   if (metrics && metricsWidth) {
    //     metrics.style.setProperty("--metric-columns", isCompact ? "2" : "4");
    //     metrics.classList.toggle("is-tight", metricsWidth < 325);
    //   }

    //   if (tags && tagsWidth) {
    //     tags.style.setProperty("--tag-columns", tagsWidth < 270 ? "2" : "3");
    //   }
    // }
  };

  const resizeFromPointer = (clientX: number) => {
    const workspace = workspaceRef.current;
    if (!workspace) {
      return;
    }

    const workspaceRect = workspace.getBoundingClientRect();
    const maximumResultsWidth = Math.max(
      minimumResultsWidth,
      workspaceRect.width - minimumSummaryWidth - splitterWidth,
    );
    const nextResultsWidth = Math.min(
      maximumResultsWidth,
      Math.max(minimumResultsWidth, workspaceRect.right - clientX),
    );

    applyAdaptiveCardLayout(nextResultsWidth);
  };

  const finishResize = () => {
    const drag = dragRef.current;
    if (!drag) {
      return;
    }

    setLastResizeSession({
      duration: performance.now() - drag.startedAt,
      moveCount: drag.moveCount,
    });
    dragRef.current = null;
  };

  return (
    <div className="experiment-layout layout-thrashing-experiment">
      <section className="task-panel" aria-labelledby="layout-task-heading">
        <p className="section-label">Task</p>
        <h2 id="layout-task-heading">
          Inspect a dense dashboard while it resizes
        </h2>
        <p>
          Use the portfolio dashboard below to examine the browser work produced
          by a continuous panel resize.
        </p>
      </section>

      <section
        className="reproduction-panel"
        aria-labelledby="layout-tools-heading"
      >
        <p className="section-label" id="layout-tools-heading">
          Suggested tools
        </p>
        <ul>
          <li>Chrome Performance</li>
          <li>Rendering / FPS meter</li>
        </ul>
        <ol>
          <li>Select 150 cards.</li>
          <li>Start recording.</li>
          <li>Drag the splitter continuously for 3–5 seconds.</li>
          <li>Stop recording and inspect slow frames and rendering work.</li>
        </ol>
      </section>

      <section
        className="analytics-dashboard"
        aria-label="Portfolio analytics dashboard"
      >
        <header className="analytics-toolbar">
          <div>
            <p className="section-label">Portfolio analytics</p>
            <h2>Account health review</h2>
          </div>
          <fieldset className="analytics-card-count">
            <legend>Cards</legend>
            {([50, 150, 300] as const).map((count) => (
              <label key={count}>
                <input
                  checked={cardCount === count}
                  name="analytics-card-count"
                  onChange={() => {
                    setCardCount(count);
                    setLastResizeSession(null);
                  }}
                  type="radio"
                />{" "}
                {count}
              </label>
            ))}
          </fieldset>
        </header>

        <div className="analytics-workspace" ref={workspaceRef}>
          <aside
            className="analytics-summary"
            aria-label="Portfolio summary and filters"
          >
            <p className="section-label">Review context</p>
            <h3>Q4 forecast</h3>
            <p className="analytics-summary-copy">
              24 accounts need a decision before the next regional forecast
              review.
            </p>
            <dl className="analytics-summary-metrics">
              <div>
                <dt>Open pipeline</dt>
                <dd>$4.8m</dd>
              </div>
              <div>
                <dt>At-risk revenue</dt>
                <dd>$820k</dd>
              </div>
              <div>
                <dt>Coverage</dt>
                <dd>3.2×</dd>
              </div>
            </dl>
            <div className="analytics-filter-list" aria-label="Applied filters">
              <span>Enterprise</span>
              <span>Renewal in 90 days</span>
              <span>Owner assigned</span>
            </div>
          </aside>

          <div
            aria-label="Resize results panel"
            aria-orientation="vertical"
            className="analytics-splitter"
            onLostPointerCapture={finishResize}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              dragRef.current = {
                pointerId: event.pointerId,
                startedAt: performance.now(),
                moveCount: 0,
              };
            }}
            onPointerMove={(event) => {
              const drag = dragRef.current;
              if (!drag || drag.pointerId !== event.pointerId) {
                return;
              }
              drag.moveCount += 1;
              resizeFromPointer(event.clientX);
            }}
            onPointerUp={finishResize}
            role="separator"
            tabIndex={0}
          >
            <span aria-hidden="true" />
          </div>

          <section
            className="analytics-results-panel"
            ref={resultsPanelRef}
            aria-labelledby="analytics-results-heading"
          >
            <header className="analytics-results-header">
              <div>
                <p className="section-label">Results panel</p>
                <h3 id="analytics-results-heading">Portfolio accounts</h3>
              </div>
              {lastResizeSession && (
                <p className="analytics-resize-session">
                  Last resize: {(lastResizeSession.duration / 1000).toFixed(1)}s
                  · {lastResizeSession.moveCount} moves
                </p>
              )}
            </header>
            <div className="analytics-card-grid">
              {cardFixtures[cardCount].map((card) => (
                <AnalyticsCard card={card} key={card.id} />
              ))}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
