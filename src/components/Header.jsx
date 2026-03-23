export default function Header({
  globalThreat,
  viewMode,
  onViewModeChange,
  activeCount,
  criticalCount,
  timestamp,
  refreshing,
  onRefresh,
}) {
  return (
    <header className="header">
      <div className="header-left">
        <div className="logo">
          <svg className="logo-icon" viewBox="0 0 36 36" fill="none">
            <circle cx="18" cy="18" r="16" stroke="#2a3044" strokeWidth="1.5" />
            <circle
              cx="18"
              cy="18"
              r="10"
              stroke="var(--color-primary)"
              strokeWidth="2"
              strokeDasharray="4 3"
            />
            <circle cx="18" cy="18" r="4" fill="var(--color-critical)" opacity="0.8" />
            <circle cx="18" cy="18" r="4" fill="var(--color-critical)" opacity="0.3">
              <animate attributeName="r" values="4;10;4" dur="2s" repeatCount="indefinite" />
              <animate
                attributeName="opacity"
                values="0.3;0;0.3"
                dur="2s"
                repeatCount="indefinite"
              />
            </circle>
          </svg>
          <div>
            <h1 className="header-title">SITREP</h1>
            <p className="header-tagline">Global Conflict Tracker</p>
          </div>
        </div>
      </div>

      <div className="header-center">
        <div className="header-view-stack">
          <div className="global-threat-meter">
            <span className="threat-meter-label">Global Threat Level</span>
            <div className="threat-bar">
              <div
                className="threat-bar-fill"
                style={{
                  width: globalThreat.fillWidth,
                  background: globalThreat.fillBackground,
                }}
              />
              <div className="threat-bar-segments">
                <span />
                <span />
                <span />
                <span />
              </div>
            </div>
            <span className="threat-meter-value" style={{ color: globalThreat.labelColor }}>
              {globalThreat.label}
            </span>
          </div>

          <div className="view-switcher" role="tablist" aria-label="View mode">
            <button
              type="button"
              className={`view-switch-btn ${viewMode === "map" ? "active" : ""}`}
              onClick={() => onViewModeChange("map")}
            >
              Map
            </button>
            <button
              type="button"
              className={`view-switch-btn ${viewMode === "briefing" ? "active" : ""}`}
              onClick={() => onViewModeChange("briefing")}
            >
              Briefing
            </button>
            <button
              type="button"
              className={`view-switch-btn ${viewMode === "replay" ? "active" : ""}`}
              onClick={() => onViewModeChange("replay")}
            >
              Replay
            </button>
          </div>
        </div>
      </div>

      <div className="header-right">
        <div className="stat-pill">
          <span className="stat-number">{activeCount}</span>
          <span className="stat-label">Active</span>
        </div>
        <div className="stat-pill">
          <span
            className="stat-number"
            style={{ color: criticalCount > 0 ? "#ff3b3b" : "#3dd98a" }}
          >
            {criticalCount}
          </span>
          <span className="stat-label">Critical</span>
        </div>
        <div className={`last-updated-pill ${timestamp.stale ? "stale" : ""}`}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="8" cy="8" r="6" />
            <path d="M8 4.5v4l2.5 1.5" />
          </svg>
          <span>{timestamp.text}</span>
        </div>
        <button
          type="button"
          className={`refresh-btn ${refreshing ? "refreshing" : ""}`}
          onClick={onRefresh}
          disabled={refreshing}
          aria-label="Reload current dataset"
          title="Reloads the current published dataset from this app. It does not fetch new source data by itself."
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M13.5 8A5.5 5.5 0 1 1 8 2.5c1.8 0 3.4.87 4.4 2.2" />
            <path d="M13.5 2.5v2.5H11" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="refresh-btn-label">{refreshing ? "Reloading..." : "Reload data"}</span>
        </button>
      </div>
    </header>
  );
}
