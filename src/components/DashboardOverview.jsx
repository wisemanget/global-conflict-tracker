import { useEffect, useState } from "react";
import { getChangeMeta, truncateText } from "../utils";
import { theaterColors, threatColors } from "../constants";

export default function DashboardOverview({
  topDevelopments,
  conflictData,
  onOpenDetail,
  timestamp,
}) {
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  const leadStory = topDevelopments[activeStoryIndex] || topDevelopments[0] || null;
  const leadReport = topDevelopments[0] || null;
  const watchList = topDevelopments.filter((_, index) => index !== activeStoryIndex).slice(0, 4);
  const criticalCount = conflictData.filter((conflict) => (conflict.threat_level || 0) >= 5).length;
  const escalatedCount = conflictData.filter((conflict) => conflict.change_status === "escalated").length;

  useEffect(() => {
    if (!topDevelopments.length) {
      setActiveStoryIndex(0);
      return;
    }

    setActiveStoryIndex((current) => (current >= topDevelopments.length ? 0 : current));
  }, [topDevelopments]);

  useEffect(() => {
    if (!autoplay || topDevelopments.length <= 1) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setActiveStoryIndex((current) => (current + 1) % topDevelopments.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [autoplay, topDevelopments]);

  const impactCounts = new Map();
  conflictData.forEach((conflict) => {
    (conflict.impact_tags || []).forEach((tag) => {
      impactCounts.set(tag, (impactCounts.get(tag) || 0) + 1);
    });
  });

  const topImpact =
    [...impactCounts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] || "Military";

  const hottestTheater =
    Object.entries(
      conflictData.reduce((accumulator, conflict) => {
        const current = accumulator[conflict.theater] || { score: 0, count: 0 };
        current.score += conflict.threat_level || 0;
        current.count += 1;
        accumulator[conflict.theater] = current;
        return accumulator;
      }, {}),
    )
      .sort((left, right) => right[1].score / right[1].count - left[1].score / left[1].count)[0]?.[0] || "Middle East";

  const changeItems = topDevelopments
    .flatMap((conflict) =>
      (conflict.change_summary || []).slice(0, 1).map((summary) => ({
        iso: conflict.iso_code,
        country: conflict.country,
        summary,
        status: conflict.change_status,
      })),
    )
    .slice(0, 4);

  const overviewBullets = topDevelopments.slice(0, 3).map((conflict) => ({
    iso: conflict.iso_code,
    country: conflict.country,
    note: conflict.briefing_note || conflict.tldr || conflict.headline,
  }));

  function showStory(index) {
    setActiveStoryIndex(index);
    setAutoplay(false);
  }

  function stepStory(direction) {
    if (!topDevelopments.length) {
      return;
    }

    setActiveStoryIndex((current) => (current + direction + topDevelopments.length) % topDevelopments.length);
    setAutoplay(false);
  }

  return (
    <section className="glance-shell">
      {leadReport ? (
        <button
          type="button"
          className="briefing-lead-cta"
          onClick={() => onOpenDetail(leadReport.iso_code)}
        >
          <span className="briefing-lead-cta-kicker">Lead report</span>
          <span className="briefing-lead-cta-country">{leadReport.country}</span>
          <span className="briefing-lead-cta-headline">{leadReport.headline}</span>
          <span className="briefing-lead-cta-arrow" aria-hidden="true">{"→"}</span>
        </button>
      ) : null}
      <section className="glance-hero">
        <div className="glance-hero-copy">
          <span className="glance-kicker">At a Glance</span>
          <h2 className="glance-title">
            {leadStory ? leadStory.headline : "Live global conflict snapshot"}
          </h2>
          <p className="glance-summary">
            {`The biggest pressure point is ${hottestTheater}. ${criticalCount} conflicts are at critical level, ${escalatedCount} are actively worsening, and ${topImpact} is the most common spillover risk in the current briefing cycle.`}
          </p>

          <div className="glance-metric-row">
            <div className="glance-metric-card">
              <span className="glance-metric-label">Critical now</span>
              <strong className="glance-metric-value">{criticalCount}</strong>
            </div>
            <div className="glance-metric-card">
              <span className="glance-metric-label">Escalating</span>
              <strong className="glance-metric-value">{escalatedCount}</strong>
            </div>
            <div className="glance-metric-card">
              <span className="glance-metric-label">Hottest theater</span>
              <strong className="glance-metric-value">{hottestTheater}</strong>
            </div>
            <div className="glance-metric-card">
              <span className="glance-metric-label">Top impact</span>
              <strong className="glance-metric-value">{topImpact}</strong>
            </div>
          </div>

          <div className="glance-bullet-list">
            {overviewBullets.map((item) => (
              <button
                key={`bullet-${item.iso}`}
                type="button"
                className="glance-bullet-card"
                onClick={() => onOpenDetail(item.iso)}
              >
                <span className="glance-bullet-country">{item.country}</span>
                <span className="glance-bullet-text">{truncateText(item.note, 120)}</span>
              </button>
            ))}
          </div>
        </div>

        {leadStory ? (
          <section
            className="glance-lead-card"
            onMouseEnter={() => setAutoplay(false)}
            onMouseLeave={() => setAutoplay(true)}
          >
            <div className="glance-lead-top">
              <span className="glance-lead-label">60-second briefing</span>
              <span
                className="glance-lead-threat"
                style={{ color: threatColors[leadStory.threat_level] || "var(--color-text)" }}
              >
                {leadStory.threat_label}
              </span>
            </div>

            <div className="glance-briefing-controls">
              <div className="glance-lead-country-row">
                <span className="glance-lead-country">{leadStory.country}</span>
                <span className={`change-pill ${getChangeMeta(leadStory.change_status).className}`}>
                  {getChangeMeta(leadStory.change_status).label}
                </span>
              </div>

              <div className="glance-carousel-buttons">
                <button type="button" className="glance-carousel-btn" onClick={() => stepStory(-1)} aria-label="Previous story">
                  {"\u2039"}
                </button>
                <button
                  type="button"
                  className="glance-carousel-btn"
                  onClick={() => setAutoplay((current) => !current)}
                  aria-label={autoplay ? "Pause briefing" : "Play briefing"}
                >
                  {autoplay ? "Pause" : "Play"}
                </button>
                <button type="button" className="glance-carousel-btn" onClick={() => stepStory(1)} aria-label="Next story">
                  {"\u203A"}
                </button>
              </div>
            </div>

            <h3 className="glance-lead-headline">{leadStory.headline}</h3>

            <div className="glance-lead-snapshot">
              <div className="glance-lead-point">
                <span className="glance-lead-point-label">Now</span>
                <span className="glance-lead-point-text">{truncateText(leadStory.tldr, 140)}</span>
              </div>
              <div className="glance-lead-point">
                <span className="glance-lead-point-label">Why it matters</span>
                <span className="glance-lead-point-text">
                  {truncateText(leadStory.briefing_note || leadStory.alliances_short || "", 120)}
                </span>
              </div>
              <div className="glance-lead-point">
                <span className="glance-lead-point-label">Watch next</span>
                <span className="glance-lead-point-text">
                  {truncateText(leadStory.forecast || leadStory.next_actions || "", 130)}
                </span>
              </div>
            </div>

            <div className="glance-carousel-dots" role="tablist" aria-label="Briefing stories">
              {topDevelopments.map((conflict, index) => (
                <button
                  key={`story-dot-${conflict.iso_code}`}
                  type="button"
                  className={`glance-carousel-dot ${index === activeStoryIndex ? "active" : ""}`}
                  onClick={() => showStory(index)}
                  aria-label={`Show story ${index + 1}: ${conflict.country}`}
                />
              ))}
            </div>

            <div className="glance-lead-footer">
              <span>{timestamp.text}</span>
              <button
                type="button"
                className="glance-open-briefing"
                onClick={() => onOpenDetail(leadStory.iso_code)}
              >
                Open full briefing
              </button>
            </div>
          </section>
        ) : null}
      </section>

      <div className="glance-grid">
        <section className="glance-panel">
          <div className="glance-panel-header">
            <span className="glance-panel-title">Watch First</span>
            <span className="glance-panel-caption">Fast story stack</span>
          </div>

          <div className="glance-story-list">
            {watchList.map((conflict, index) => (
              <button
                key={conflict.iso_code}
                type="button"
                className="glance-story-card"
                onClick={() => onOpenDetail(conflict.iso_code)}
              >
                <span className="glance-story-rank">{index + 2}</span>
                <div className="glance-story-copy">
                  <div className="glance-story-top">
                    <span className="glance-story-country">{conflict.country}</span>
                    <span className={`change-pill ${getChangeMeta(conflict.change_status).className}`}>
                      {getChangeMeta(conflict.change_status).label}
                    </span>
                  </div>
                  <div className="glance-story-headline">{truncateText(conflict.headline, 90)}</div>
                  <div className="glance-story-note">{truncateText(conflict.briefing_note || conflict.tldr, 110)}</div>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="glance-panel">
          <div className="glance-panel-header">
            <span className="glance-panel-title">What Changed</span>
            <span className="glance-panel-caption">Since the latest refresh</span>
          </div>

          <div className="glance-change-list">
            {changeItems.map((item) => (
              <button
                key={`${item.iso}-${item.summary}`}
                type="button"
                className="glance-change-card"
                onClick={() => onOpenDetail(item.iso)}
              >
                <div className="glance-change-top">
                  <span className="glance-change-country">{item.country}</span>
                  <span className={`change-pill ${getChangeMeta(item.status).className}`}>
                    {getChangeMeta(item.status).label}
                  </span>
                </div>
                <div className="glance-change-text">{truncateText(item.summary, 115)}</div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
