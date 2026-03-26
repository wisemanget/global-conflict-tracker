import {
  getChangeMeta,
  getInitials,
  getDomesticEmoji,
  formatTimestamp,
} from "../utils";
import {
  impactIcons,
  roleDefinitions,
  theaterColors,
  threatColors,
  threatLabels,
} from "../constants";

export default function DetailPanel({
  selectedCountry,
  leaders,
  timelineEvents,
  impact,
  expandedLeaderIndexes,
  expandedTimelineIndexes,
  onClose,
  onToggleLeader,
  onToggleTimeline,
  detailInnerRef,
  dataRefreshedAt,
}) {
  return (
    <>
      <button
        type="button"
        className={`backdrop ${selectedCountry ? "open" : ""}`}
        onClick={onClose}
        aria-label="Close detail panel"
      />

      <div className={`detail-panel ${selectedCountry ? "open" : ""}`}>
        <div className="detail-inner" ref={detailInnerRef}>
          {selectedCountry ? (
            <>
              <div className="detail-header">
                <div className="detail-header-left">
                  <span
                    className="detail-theater-badge"
                    style={{ background: theaterColors[selectedCountry.theater] || "#888" }}
                  >
                    {selectedCountry.theater}
                  </span>
                  <h2 className="detail-country">{selectedCountry.country}</h2>
                  <div className="detail-threat">
                    <div className="mini-threat-bar">
                      <div
                        className="mini-threat-fill"
                        style={{
                          width: `${((selectedCountry.threat_level || 3) / 5) * 100}%`,
                          background: threatColors[selectedCountry.threat_level] || "#888",
                        }}
                      />
                    </div>
                    <span
                      className="detail-threat-label"
                      style={{ color: threatColors[selectedCountry.threat_level] || "#888" }}
                    >
                      {selectedCountry.threat_label || threatLabels[selectedCountry.threat_level] || ""}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-close"
                  onClick={onClose}
                  aria-label="Close panel"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <div className="detail-body">
                <div className="detail-headline">{selectedCountry.headline || ""}</div>

                <section className="detail-snapshot-grid">
                  <div className="detail-snapshot-card">
                    <span className="detail-snapshot-label">Now</span>
                    <p className="detail-snapshot-text">{selectedCountry.tldr || ""}</p>
                  </div>

                  <div className="detail-snapshot-card">
                    <span className="detail-snapshot-label">Why It Matters</span>
                    <p className="detail-snapshot-text">
                      {selectedCountry.briefing_note || selectedCountry.alliances_short || ""}
                    </p>
                  </div>

                  <div className="detail-snapshot-card">
                    <span className="detail-snapshot-label">Watch Next</span>
                    <p className="detail-snapshot-text">
                      {selectedCountry.forecast || selectedCountry.next_actions || ""}
                    </p>
                  </div>
                </section>

                <div className="detail-quick-strip">
                  <div className="detail-quick-card">
                    <span className="detail-quick-label">Trend</span>
                    <span className={`change-pill ${getChangeMeta(selectedCountry.change_status).className}`}>
                      {getChangeMeta(selectedCountry.change_status).label}
                    </span>
                  </div>

                  <div className="detail-quick-card">
                    <span className="detail-quick-label">Last Reported</span>
                    <span className="detail-quick-value">{formatTimestamp(selectedCountry.last_updated)}</span>
                    {dataRefreshedAt && (
                      <span className="detail-quick-sublabel" title="When the data pipeline last ran">
                        Pipeline: {formatTimestamp(dataRefreshedAt)}
                      </span>
                    )}
                  </div>

                  <div className="detail-quick-card">
                    <span className="detail-quick-label">Impact</span>
                    <div className="detail-impact-chip-row">
                      {(selectedCountry.impact_tags || []).slice(0, 3).map((tag) => (
                        <span key={tag} className="impact-tag">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {selectedCountry.change_summary?.length ? (
                  <div className="detail-section detail-highlight">
                    <div className="section-header">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M2.5 8h11M8 2.5l5.5 5.5L8 13.5" />
                      </svg>
                      <span>What Changed</span>
                    </div>
                    <div className="detail-change-header">
                      <span className={`change-pill ${getChangeMeta(selectedCountry.change_status).className}`}>
                        {getChangeMeta(selectedCountry.change_status).label}
                      </span>
                      <span className="detail-updated-at">
                        Reported {formatTimestamp(selectedCountry.last_updated)}
                        {dataRefreshedAt && (
                          <> &middot; Pipeline {formatTimestamp(dataRefreshedAt)}</>
                        )}
                      </span>
                    </div>
                    <ul className="detail-change-list">
                      {selectedCountry.change_summary.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="detail-section">
                  <div className="section-header">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M8 1L1 5l7 4 7-4-7-4z" />
                      <path d="M1 11l7 4 7-4" />
                    </svg>
                    <span>Key Alliances</span>
                  </div>
                  <p>{selectedCountry.alliances_short || ""}</p>
                </div>

                <div className="detail-section forecast-section">
                  <div className="section-header">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M2 13h12" />
                      <path d="M4 9l4-6 4 6" />
                    </svg>
                    <span>Forecast</span>
                  </div>
                  <p>{selectedCountry.forecast || selectedCountry.next_actions || ""}</p>
                </div>

                <details key={selectedCountry.iso_code} className="deep-dive">
                  <summary>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 4l4 4-4 4" />
                    </svg>
                    Deep Dive - Full Intel Report
                  </summary>
                  <div className="deep-dive-content">
                    <h4>Full Situation Report</h4>
                    <p>{selectedCountry.current_events || ""}</p>
                    <h4>Alliance Details</h4>
                    <p>{selectedCountry.alliances || ""}</p>
                    <h4>Detailed Forecast</h4>
                    <p>{selectedCountry.next_actions || ""}</p>
                  </div>
                </details>

                {leaders.length ? (
                  <div className="detail-section">
                    <div className="section-header">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="8" cy="5" r="3" />
                        <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" />
                      </svg>
                      <span>Major Players</span>
                    </div>
                    <div className="leaders-list">
                      {leaders.map((leader, index) => {
                        const expanded = expandedLeaderIndexes.includes(index);
                        const roleLabel = leader.role.charAt(0).toUpperCase() + leader.role.slice(1);
                        const shortTagline =
                          leader.tagline.length > 100
                            ? `${leader.tagline.substring(0, 100)}...`
                            : leader.tagline;

                        return (
                          <button
                            key={`${leader.name}-${leader.title}`}
                            type="button"
                            className={`leader-card ${expanded ? "expanded" : ""}`}
                            onClick={() => onToggleLeader(index)}
                          >
                            <div className="leader-compact">
                              <div className="leader-avatar" data-role={leader.role}>
                                {getInitials(leader.name)}
                              </div>
                              <div className="leader-info">
                                <div className="leader-name-row">
                                  <span className="leader-name">{leader.name}</span>
                                </div>
                                <div className="leader-title">{leader.title}</div>
                                <div className="leader-tagline">{shortTagline}</div>
                              </div>
                            </div>
                            <div className="leader-badges">
                              <span className="leader-badge">
                                {getDomesticEmoji(leader.domestic)} {leader.domestic}
                              </span>
                              <span className="leader-badge">{leader.global}</span>
                              <span
                                className="leader-role-badge"
                                data-role={leader.role}
                                onClick={(event) => event.stopPropagation()}
                              >
                                {roleLabel}
                                <span className="role-tooltip">{roleDefinitions[leader.role] || ""}</span>
                              </span>
                            </div>
                            <div className="leader-dossier">
                              <div className="dossier-bio">{leader.bio}</div>
                              <div className="dossier-detail-label">Domestic Standing</div>
                              <div className="dossier-detail-text">{leader.domestic_detail}</div>
                              <div className="dossier-detail-label">Global Perception</div>
                              <div className="dossier-detail-text">{leader.global_detail}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {timelineEvents.length ? (
                  <div className="detail-section">
                    <div className="section-header">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M8 1v14" />
                        <circle cx="8" cy="4" r="1.5" fill="currentColor" />
                        <circle cx="8" cy="8" r="1.5" fill="currentColor" />
                        <circle cx="8" cy="12" r="1.5" fill="currentColor" />
                      </svg>
                      <span>How We Got Here</span>
                    </div>
                    <div className="timeline">
                      {timelineEvents.map((event, index) => (
                        <button
                          key={`${event.date}-${event.event}`}
                          type="button"
                          className={`timeline-event ${expandedTimelineIndexes.includes(index) ? "expanded" : ""}`}
                          onClick={() => onToggleTimeline(index)}
                        >
                          <span className="timeline-date">{event.date}</span>
                          <div className="timeline-title">{event.event}</div>
                          <div className="timeline-detail">{event.detail}</div>
                          <div className="timeline-expand-hint">Tap to read more</div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {impact ? (
                  <div className="impact-card">
                    <div className="impact-icon">{impactIcons[impact.icon] || "\u26A0\uFE0F"}</div>
                    <h3 className="impact-title">What This Means for You</h3>
                    <ul className="impact-list">
                      {impact.impacts.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {selectedCountry.sources?.length ? (
                  <div className="detail-section sources-section">
                    <div className="section-header">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M3 4.5h10M3 8h10M3 11.5h7" />
                      </svg>
                      <span>Sources</span>
                    </div>
                    <div className="source-list">
                      {selectedCountry.sources.map((source) => (
                        <a
                          key={source.url}
                          className="source-card"
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <span className="source-label">{source.label}</span>
                          <span className="source-link">Open source</span>
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}
