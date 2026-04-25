import { useEffect, useRef, useState } from "react";

export default function Header({
  globalThreat,
  viewMode,
  onViewModeChange,
  activeCount,
  criticalCount,
  timestamp,
  refreshing,
  refreshFeedback,
  liveRefreshEnabled,
  onRefresh,
}) {
  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRef = useRef(null);

  useEffect(() => {
    if (!overflowOpen) {
      return undefined;
    }

    function onDocumentClick(event) {
      if (overflowRef.current && !overflowRef.current.contains(event.target)) {
        setOverflowOpen(false);
      }
    }

    function onKeyDown(event) {
      if (event.key === "Escape") {
        setOverflowOpen(false);
      }
    }

    document.addEventListener("mousedown", onDocumentClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocumentClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [overflowOpen]);

  function selectSecondaryView(mode) {
    onViewModeChange(mode);
    setOverflowOpen(false);
  }

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
            </div>
            <div className="threat-status-pill" style={{ color: globalThreat.labelColor }}>
              <span
                className="threat-status-dot"
                style={{ background: globalThreat.labelColor }}
                aria-hidden="true"
              />
              <span className="threat-status-label">{globalThreat.label}</span>
              <span className="threat-status-sep" aria-hidden="true">·</span>
              <span className="threat-status-stat">
                <span className="threat-status-num">{activeCount}</span> active
              </span>
              <span className="threat-status-sep" aria-hidden="true">·</span>
              <span
                className="threat-status-stat"
                style={{ color: criticalCount > 0 ? "#ff3b3b" : "#3dd98a" }}
              >
                <span className="threat-status-num">{criticalCount}</span> critical
              </span>
            </div>
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
            <div className="view-switch-overflow" ref={overflowRef}>
              <button
                type="button"
                className={`view-switch-btn view-switch-overflow-btn ${viewMode === "replay" ? "active" : ""}`}
                aria-haspopup="menu"
                aria-expanded={overflowOpen}
                aria-label="More views"
                onClick={() => setOverflowOpen((open) => !open)}
              >
                ···
              </button>
              {overflowOpen ? (
                <div className="view-switch-menu" role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    className={`view-switch-menu-item ${viewMode === "replay" ? "active" : ""}`}
                    onClick={() => selectSecondaryView("replay")}
                  >
                    Replay
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="header-right">
        <div className={`last-updated-pill ${timestamp.stale ? "stale" : ""}`}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="8" cy="8" r="6" />
            <path d="M8 4.5v4l2.5 1.5" />
          </svg>
          <span>{timestamp.text}</span>
        </div>
        <div className="refresh-stack">
          <button
            type="button"
            className={`refresh-btn ${refreshing ? "refreshing" : ""}`}
            onClick={onRefresh}
            disabled={refreshing}
            aria-label={liveRefreshEnabled ? "Request live refresh" : "Reload current dataset"}
            title={
              liveRefreshEnabled
                ? "Requests a live source refresh, then waits for the newly published dataset."
                : "Reloads the current published dataset. Configure VITE_REFRESH_ENDPOINT to request a live refresh."
            }
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M13.5 8A5.5 5.5 0 1 1 8 2.5c1.8 0 3.4.87 4.4 2.2" />
              <path d="M13.5 2.5v2.5H11" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="refresh-btn-label">
              {refreshing ? "Refreshing..." : liveRefreshEnabled ? "Refresh live" : "Reload data"}
            </span>
          </button>
          {refreshFeedback ? <div className="refresh-feedback">{refreshFeedback}</div> : null}
        </div>
      </div>
    </header>
  );
}
