import { getChangeMeta, truncateText } from "../utils";
import { theaterColors, threatColors } from "../constants";

export default function CountryCard({ conflict, isActive, animationDelay, onClick }) {
  const threatColor = threatColors[conflict.threat_level] || "#888";
  const theaterColor = theaterColors[conflict.theater] || "#888";
  const changeMeta = getChangeMeta(conflict.change_status);

  return (
    <button
      type="button"
      className={`country-card ${isActive ? "active" : ""}`}
      style={{ animationDelay: `${animationDelay}ms` }}
      onClick={onClick}
    >
      <div className="card-top-row">
        <span className="card-country-name">{conflict.country}</span>
        <span className="card-threat-badge" data-level={conflict.threat_level}>
          <span className="card-threat-dots">
            {Array.from({ length: 5 }, (_, dotIndex) => (
              <span
                key={dotIndex}
                style={{
                  background:
                    dotIndex + 1 <= (conflict.threat_level || 0)
                      ? threatColor
                      : "var(--color-surface-3)",
                }}
              />
            ))}
          </span>
          {conflict.threat_label || "N/A"}
        </span>
      </div>
      <div className="card-meta-row">
        <span className={`change-pill ${changeMeta.className}`}>{changeMeta.label}</span>
        <div className="impact-tag-row">
          {(conflict.impact_tags || []).slice(0, 2).map((tag) => (
            <span key={tag} className="impact-tag">
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="card-signal-list">
        <div className="card-signal-row">
          <span className="card-signal-label">Now</span>
          <span className="card-signal-text">{truncateText(conflict.headline || "", 88)}</span>
        </div>
        <div className="card-signal-row">
          <span className="card-signal-label">Why</span>
          <span className="card-signal-text">{truncateText(conflict.briefing_note || conflict.tldr || "", 106)}</span>
        </div>
        <div className="card-signal-row">
          <span className="card-signal-label">Watch</span>
          <span className="card-signal-text">{truncateText(conflict.next_actions || conflict.forecast || "", 110)}</span>
        </div>
      </div>

      {conflict.change_summary?.[0] ? (
        <div className="card-change-callout">{truncateText(conflict.change_summary[0], 110)}</div>
      ) : null}

      <div className="card-footer">
        <span className="card-theater-tag" style={{ background: theaterColor }}>
          {conflict.theater}
        </span>
        <div className="card-footer-right">
          <span className="card-source-count">
            {conflict.sources?.length || 0} sources
          </span>
          <span className="card-expand-hint">
            Tap for full report
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 4l4 4-4 4" />
            </svg>
          </span>
        </div>
      </div>
    </button>
  );
}
