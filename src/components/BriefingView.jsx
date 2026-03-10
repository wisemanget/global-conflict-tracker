import { theaterColors, theaterOrder, threatColors } from "../constants";
import { getChangeMeta } from "../utils";

export default function BriefingView({
  snapshots,
  activeSnapshotIndex,
  onSnapshotChange,
  timelinesData,
  onOpenDetail,
  onOpenMap,
}) {
  const snapshot = snapshots[activeSnapshotIndex];

  return (
    <section className="briefing-view">
      <div className="briefing-hero">
        <div className="briefing-hero-copy">
          <span className="briefing-kicker">Replay Mode</span>
          <h2 className="briefing-title">{snapshot.headline}</h2>
          <p className="briefing-summary">{snapshot.summary}</p>
          <div className="briefing-summary-list">
            {snapshot.top_items.map((item) => (
              <div key={item} className="briefing-summary-item">
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="briefing-hero-meta">
          <div className="briefing-threat-card">
            <span className="briefing-meta-label">Global Threat</span>
            <span
              className="briefing-threat-value"
              style={{ color: threatColors[snapshot.global_threat_value] || threatColors[3] }}
            >
              {snapshot.global_threat_label}
            </span>
            <div className="briefing-threat-bar">
              <div
                className="briefing-threat-bar-fill"
                style={{
                  width: `${(snapshot.global_threat_value / 5) * 100}%`,
                  background: threatColors[snapshot.global_threat_value] || threatColors[3],
                }}
              />
            </div>
          </div>

          <div className="briefing-meta-card">
            <span className="briefing-meta-label">Focus Theater</span>
            <span
              className="briefing-theater-chip"
              style={{ background: theaterColors[snapshot.dominant_theater] || "#888" }}
            >
              {snapshot.dominant_theater}
            </span>
          </div>

          <button
            type="button"
            className="briefing-map-btn"
            onClick={() => onOpenMap(snapshot.dominant_theater)}
          >
            Open This On The Map
          </button>
        </div>
      </div>

      <div className="replay-controls">
        <div className="section-header">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 8h12M8 2v12" />
          </svg>
          <span>Timeline Replay</span>
        </div>
        <input
          className="replay-slider"
          type="range"
          min="0"
          max={snapshots.length - 1}
          step="1"
          value={activeSnapshotIndex}
          onChange={(event) => onSnapshotChange(Number(event.target.value))}
        />
        <div className="replay-stops">
          {snapshots.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={`replay-stop ${index === activeSnapshotIndex ? "active" : ""}`}
              onClick={() => onSnapshotChange(index)}
            >
              <span className="replay-stop-label">{item.label}</span>
              <span className="replay-stop-date">{item.date_range}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="replay-grid">
        <section className="replay-panel">
          <div className="section-header">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 4.5h12M2 8h12M2 11.5h8" />
            </svg>
            <span>Story Threads</span>
          </div>
          <div className="replay-thread-list">
            {snapshot.story_threads.map((thread) => {
              const changeMeta = getChangeMeta(thread.change_status);

              return (
                <button
                  key={`replay-thread-${thread.iso}`}
                  type="button"
                  className="replay-thread-card"
                  onClick={() => onOpenDetail(thread.iso)}
                >
                  <div className="replay-thread-top">
                    <span className="replay-thread-country">{thread.country}</span>
                    <span className={`change-pill ${changeMeta.className}`}>{changeMeta.label}</span>
                  </div>
                  <div className="replay-thread-headline">{thread.headline}</div>
                  <div className="replay-thread-note">{thread.note}</div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="replay-panel">
          <div className="section-header">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 8h10M8 3v10" />
            </svg>
            <span>Why This Moment Matters</span>
          </div>
          <div className="replay-insight-stack">
            <div className="replay-insight-card">
              <span className="replay-insight-label">Primary Shift</span>
              <p>{snapshot.top_items[0]}</p>
            </div>
            <div className="replay-insight-card">
              <span className="replay-insight-label">Secondary Effect</span>
              <p>{snapshot.top_items[1]}</p>
            </div>
            <div className="replay-insight-card">
              <span className="replay-insight-label">What To Watch</span>
              <p>{snapshot.top_items[2]}</p>
            </div>
          </div>
        </section>
      </div>

      <section className="replay-theaters">
        <div className="section-header">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M8 1v14" />
            <circle cx="8" cy="4" r="1.5" fill="currentColor" />
            <circle cx="8" cy="8" r="1.5" fill="currentColor" />
            <circle cx="8" cy="12" r="1.5" fill="currentColor" />
          </svg>
          <span>Theaters In Motion</span>
        </div>

        <div className="theater-track-grid">
          {theaterOrder.map((theater) => {
            const visibleEvents = (timelinesData[theater] || []).slice(
              0,
              snapshot.timeline_counts[theater] ?? 0,
            );

            return (
              <article key={`track-${theater}`} className="theater-track-card">
                <div className="theater-track-header">
                  <span
                    className="theater-track-dot"
                    style={{ background: theaterColors[theater] || "#888" }}
                  />
                  <span className="theater-track-title">{theater}</span>
                </div>
                <div className="theater-track-events">
                  {visibleEvents.length ? (
                    visibleEvents.map((event, index) => (
                      <div
                        key={`${theater}-${event.date}-${event.event}`}
                        className={`theater-track-event ${index === visibleEvents.length - 1 ? "latest" : ""}`}
                      >
                        <span className="theater-track-date">{event.date}</span>
                        <div className="theater-track-event-title">{event.event}</div>
                        <div className="theater-track-event-detail">{event.detail}</div>
                      </div>
                    ))
                  ) : (
                    <div className="theater-track-empty">No major shift surfaced in this theater yet.</div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </section>
  );
}
