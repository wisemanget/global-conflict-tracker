import { useEffect, useMemo, useRef, useState } from "react";
import BriefingView from "./components/BriefingView";
import WorldMap from "./components/WorldMap";
import {
  impactIcons,
  roleDefinitions,
  theaterColors,
  theaterOrder,
  threatColors,
  threatLabels,
} from "./constants";

function fetchJson(path) {
  return fetch(path).then((response) => {
    if (!response.ok) {
      throw new Error(`Failed to load ${path}`);
    }

    return response.json();
  });
}

function getInitials(name) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  return name.substring(0, 2).toUpperCase();
}

function getDomesticEmoji(level) {
  if (level === "Popular") return "\uD83D\uDC4D";
  if (level === "Unpopular") return "\uD83D\uDC4E";
  return "\uD83D\uDC4D\uD83D\uDC4E";
}

const changeStatusMeta = {
  escalated: { label: "Escalated", className: "escalated" },
  holding: { label: "Holding", className: "holding" },
  watch: { label: "Watchlist", className: "watch" },
  improving: { label: "Improving", className: "improving" },
};

const impactOrder = [
  "Military",
  "U.S. Policy",
  "Energy",
  "Shipping",
  "Markets",
  "Humanitarian",
  "Elections",
  "Security",
];

function getChangeMeta(status) {
  return changeStatusMeta[status] || { label: "Updated", className: "holding" };
}

function formatTimestamp(value) {
  if (!value) {
    return "--";
  }

  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function App() {
  const [conflictData, setConflictData] = useState([]);
  const [historySnapshots, setHistorySnapshots] = useState([]);
  const [leadersData, setLeadersData] = useState({});
  const [timelinesData, setTimelinesData] = useState({});
  const [impactData, setImpactData] = useState({});
  const [connectionsData, setConnectionsData] = useState([]);
  const [viewMode, setViewMode] = useState("dashboard");
  const [activeSnapshotIndex, setActiveSnapshotIndex] = useState(0);
  const [currentFilter, setCurrentFilter] = useState("all");
  const [impactFilter, setImpactFilter] = useState("all");
  const [currentSort, setCurrentSort] = useState("threat");
  const [currentSidebarTab, setCurrentSidebarTab] = useState("intel");
  const [selectedIso, setSelectedIso] = useState(null);
  const [highlightedIsos, setHighlightedIsos] = useState([]);
  const [expandedLeaderIndexes, setExpandedLeaderIndexes] = useState([]);
  const [expandedTimelineIndexes, setExpandedTimelineIndexes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const detailInnerRef = useRef(null);

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        setLoading(true);
        const [conflicts, history, leaders, timelines, impacts, connections] = await Promise.all([
          fetchJson("/conflict_data.json"),
          fetchJson("/history_snapshots.json"),
          fetchJson("/leaders_data.json"),
          fetchJson("/timelines_data.json"),
          fetchJson("/impact_data.json"),
          fetchJson("/connections_data.json"),
        ]);

        if (!active) {
          return;
        }

        setConflictData(conflicts);
        setHistorySnapshots(history);
        setLeadersData(leaders);
        setTimelinesData(timelines);
        setImpactData(impacts);
        setConnectionsData(connections);
        setError("");
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(loadError.message || "Failed to load application data.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!historySnapshots.length) {
      return;
    }

    setActiveSnapshotIndex(historySnapshots.length - 1);
  }, [historySnapshots]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setSelectedIso(null);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!selectedIso || !detailInnerRef.current) {
      return;
    }

    detailInnerRef.current.scrollTo({ top: 0, behavior: "auto" });
  }, [selectedIso]);

  useEffect(() => {
    if (!selectedIso) {
      return;
    }

    const exists = conflictData.some((conflict) => conflict.iso_code === selectedIso);
    if (!exists) {
      setSelectedIso(null);
    }
  }, [conflictData, selectedIso]);

  const selectedCountry = useMemo(
    () => conflictData.find((conflict) => conflict.iso_code === selectedIso) || null,
    [conflictData, selectedIso],
  );

  const filteredConflicts = useMemo(() => {
    const filtered =
      currentFilter === "all"
        ? [...conflictData]
        : conflictData.filter((conflict) => conflict.theater === currentFilter);

    const impactFiltered =
      impactFilter === "all"
        ? filtered
        : filtered.filter((conflict) => (conflict.impact_tags || []).includes(impactFilter));

    if (currentSort === "threat") {
      impactFiltered.sort((left, right) => (right.threat_level || 0) - (left.threat_level || 0));
    } else if (currentSort === "alpha") {
      impactFiltered.sort((left, right) => left.country.localeCompare(right.country));
    } else if (currentSort === "theater") {
      impactFiltered.sort(
        (left, right) => theaterOrder.indexOf(left.theater) - theaterOrder.indexOf(right.theater),
      );
    }

    return impactFiltered;
  }, [conflictData, currentFilter, currentSort, impactFilter]);

  const impactOptions = useMemo(() => {
    const availableTags = new Set();

    conflictData.forEach((conflict) => {
      (conflict.impact_tags || []).forEach((tag) => availableTags.add(tag));
    });

    return impactOrder.filter((tag) => availableTags.has(tag));
  }, [conflictData]);

  const topDevelopments = useMemo(() => {
    return [...conflictData]
      .sort((left, right) => {
        const leftRank = left.story_rank ?? Number.MAX_SAFE_INTEGER;
        const rightRank = right.story_rank ?? Number.MAX_SAFE_INTEGER;
        return leftRank - rightRank;
      })
      .slice(0, 5);
  }, [conflictData]);

  const globalThreat = useMemo(() => {
    if (!conflictData.length) {
      return {
        fillWidth: "0%",
        fillBackground: threatColors[3],
        label: "--",
        labelColor: "var(--color-text-muted)",
      };
    }

    const averageThreat =
      conflictData.reduce((sum, conflict) => sum + (conflict.threat_level || 3), 0) / conflictData.length;
    const maxThreat = Math.max(...conflictData.map((conflict) => conflict.threat_level || 3));

    return {
      fillWidth: `${(averageThreat / 5) * 100}%`,
      fillBackground: `linear-gradient(90deg, ${threatColors[2]}, ${threatColors[Math.round(averageThreat)]}, ${threatColors[maxThreat]})`,
      label: maxThreat >= 5 ? "CRITICAL" : maxThreat >= 4 ? "HIGH" : "ELEVATED",
      labelColor: threatColors[maxThreat],
    };
  }, [conflictData]);

  const timestamp = useMemo(() => {
    const lastUpdated = conflictData[0]?.last_updated;
    let displayDate = new Date();
    let hoursAgo = 0;

    if (lastUpdated) {
      displayDate = new Date(lastUpdated);
      hoursAgo = (Date.now() - displayDate.getTime()) / (1000 * 60 * 60);
    }

    const timeText = displayDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    return {
      stale: hoursAgo > 48,
      text: hoursAgo > 48 ? `Data from ${timeText} - may be outdated` : `Updated ${timeText}`,
    };
  }, [conflictData]);

  const activeCount = conflictData.length;
  const criticalCount = conflictData.filter((conflict) => conflict.threat_level >= 5).length;
  const leaders = selectedCountry ? leadersData[selectedCountry.iso_code] || [] : [];
  const timelineEvents = selectedCountry ? timelinesData[selectedCountry.theater] || [] : [];
  const impact = selectedCountry ? impactData[selectedCountry.iso_code] : null;

  function openDetail(iso) {
    setSelectedIso(iso);
    setExpandedLeaderIndexes([]);
    setExpandedTimelineIndexes([]);
  }

  function toggleLeader(index) {
    setExpandedLeaderIndexes((current) =>
      current.includes(index) ? current.filter((item) => item !== index) : [...current, index],
    );
  }

  function toggleTimeline(index) {
    setExpandedTimelineIndexes((current) =>
      current.includes(index) ? current.filter((item) => item !== index) : [...current, index],
    );
  }

  function highlightConnection(fromIso, toIso) {
    setHighlightedIsos([fromIso, toIso]);
  }

  function getCountryName(iso) {
    return conflictData.find((conflict) => conflict.iso_code === iso)?.country || iso;
  }

  function isCardActive(iso) {
    return selectedIso === iso || highlightedIsos.includes(iso);
  }

  function openMapFromReplay(theater) {
    setCurrentFilter(theater || "all");
    setViewMode("dashboard");
  }

  return (
    <>
      <div className="dashboard">
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
                  className={`view-switch-btn ${viewMode === "dashboard" ? "active" : ""}`}
                  onClick={() => setViewMode("dashboard")}
                >
                  Map
                </button>
                <button
                  type="button"
                  className={`view-switch-btn ${viewMode === "briefing" ? "active" : ""}`}
                  onClick={() => setViewMode("briefing")}
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
          </div>
        </header>

        <main className={`main ${viewMode === "briefing" ? "hidden" : ""}`}>
          <div className="map-container">
            <WorldMap
              conflictData={conflictData}
              currentFilter={currentFilter}
              onCountrySelect={openDetail}
            />

            <div className="map-legend">
              <span className="legend-title">Theaters of Operation</span>
              <div className="legend-items">
                {Object.entries(theaterColors).map(([theater, color]) => (
                  <button
                    key={theater}
                    type="button"
                    className="legend-item"
                    onClick={() => setCurrentFilter(theater)}
                  >
                    <span className="legend-dot" style={{ background: color }} />
                    <span>
                      {theater === "Eastern Europe"
                        ? "E. Europe"
                        : theater === "Africa & Americas"
                          ? "Africa/Americas"
                          : theater}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <aside className="sidebar">
            <div className="sidebar-header">
              <div className="sidebar-tabs">
                <button
                  type="button"
                  className={`sidebar-tab ${currentSidebarTab === "intel" ? "active" : ""}`}
                  onClick={() => setCurrentSidebarTab("intel")}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="8" cy="8" r="6" />
                    <path d="M8 5v3l2 2" />
                  </svg>
                  Intel Feed
                </button>
                <button
                  type="button"
                  className={`sidebar-tab ${currentSidebarTab === "connections" ? "active" : ""}`}
                  onClick={() => setCurrentSidebarTab("connections")}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M2 8h3m6 0h3M8 2v3m0 6v3" />
                    <circle cx="8" cy="8" r="3" />
                  </svg>
                  Connections
                </button>
              </div>

              <div className={`sidebar-title-row ${currentSidebarTab === "intel" ? "" : "hidden"}`}>
                <h2 className="sidebar-title">Intel Feed</h2>
                <span className="feed-badge">{conflictData.length} reports</span>
              </div>

              <div className={`theater-filters ${currentSidebarTab === "intel" ? "" : "hidden"}`}>
                <button
                  type="button"
                  className={`filter-chip ${currentFilter === "all" ? "active" : ""}`}
                  onClick={() => setCurrentFilter("all")}
                >
                  All
                </button>
                {Object.entries(theaterColors).map(([theater, color]) => (
                  <button
                    key={theater}
                    type="button"
                    className={`filter-chip ${currentFilter === theater ? "active" : ""}`}
                    onClick={() => setCurrentFilter(theater)}
                  >
                    <span className="chip-dot" style={{ background: color }} />
                    {theater === "Eastern Europe"
                      ? "E. Europe"
                      : theater === "Africa & Americas"
                        ? "Africa/Am."
                        : theater}
                  </button>
                ))}
              </div>

              <div className={`impact-filters ${currentSidebarTab === "intel" ? "" : "hidden"}`}>
                <span className="filter-label">View by impact</span>
                <div className="impact-chip-row">
                  <button
                    type="button"
                    className={`filter-chip ${impactFilter === "all" ? "active" : ""}`}
                    onClick={() => setImpactFilter("all")}
                  >
                    All impacts
                  </button>
                  {impactOptions.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className={`filter-chip ${impactFilter === tag ? "active" : ""}`}
                      onClick={() => setImpactFilter(tag)}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className={`sort-controls ${currentSidebarTab === "intel" ? "" : "hidden"}`}>
                {[
                  ["threat", "By Threat"],
                  ["theater", "By Theater"],
                  ["alpha", "A-Z"],
                ].map(([sortKey, label]) => (
                  <button
                    key={sortKey}
                    type="button"
                    className={`sort-btn ${currentSort === sortKey ? "active" : ""}`}
                    onClick={() => setCurrentSort(sortKey)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className={`sidebar-content ${currentSidebarTab === "intel" ? "" : "hidden"}`}>
              {loading ? <div className="loading-state">Loading conflict data...</div> : null}
              {error ? <div className="error-state">{error}</div> : null}
              {!loading && !error && topDevelopments.length ? (
                <section className="briefing-panel">
                  <div className="section-header">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M2 12.5h12M4 9l2-2 2 1 4-4" />
                    </svg>
                    <span>Top Developments</span>
                  </div>
                  <div className="briefing-list">
                    {topDevelopments.map((conflict, index) => {
                      const changeMeta = getChangeMeta(conflict.change_status);

                      return (
                        <button
                          key={`briefing-${conflict.iso_code}`}
                          type="button"
                          className="briefing-card"
                          onClick={() => openDetail(conflict.iso_code)}
                        >
                          <div className="briefing-rank">{index + 1}</div>
                          <div className="briefing-copy">
                            <div className="briefing-topline">
                              <span className="briefing-country">{conflict.country}</span>
                              <span className={`change-pill ${changeMeta.className}`}>
                                {changeMeta.label}
                              </span>
                            </div>
                            <div className="briefing-headline">{conflict.headline}</div>
                            <div className="briefing-note">{conflict.briefing_note}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ) : null}
              {!loading && !error && !filteredConflicts.length ? (
                <div className="empty-state">No conflicts match the current filter.</div>
              ) : null}

              {!loading && !error
                ? filteredConflicts.map((conflict, index) => {
                    const threatColor = threatColors[conflict.threat_level] || "#888";
                    const theaterColor = theaterColors[conflict.theater] || "#888";
                    const changeMeta = getChangeMeta(conflict.change_status);

                    return (
                      <button
                        key={conflict.iso_code}
                        type="button"
                        className={`country-card ${isCardActive(conflict.iso_code) ? "active" : ""}`}
                        style={{ animationDelay: `${index * 40}ms` }}
                        onClick={() => openDetail(conflict.iso_code)}
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
                        <div className="card-headline">{conflict.headline || ""}</div>
                        <div className="card-tldr">{conflict.tldr || ""}</div>
                        {conflict.change_summary?.length ? (
                          <ul className="card-update-list">
                            {conflict.change_summary.slice(0, 2).map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
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
                  })
                : null}
            </div>

            <div className={`sidebar-content ${currentSidebarTab === "connections" ? "" : "hidden"}`}>
              {!connectionsData.length && !loading ? (
                <div className="empty-state">No connections data available.</div>
              ) : null}
              {connectionsData.map((connection) => {
                const typeLabel =
                  connection.type.charAt(0).toUpperCase() + connection.type.slice(1);

                return (
                  <button
                    key={`${connection.from}-${connection.to}-${connection.label}`}
                    type="button"
                    className="connection-card"
                    onClick={() => highlightConnection(connection.from, connection.to)}
                  >
                    <div className="connection-route">
                      <span>{getCountryName(connection.from)}</span>
                      <span className="connection-arrow">\u2192</span>
                      <span>{getCountryName(connection.to)}</span>
                      <span className="connection-type-badge" data-type={connection.type}>
                        {typeLabel}
                      </span>
                    </div>
                    <div className="connection-label">{connection.label}</div>
                  </button>
                );
              })}
            </div>
          </aside>
        </main>

        {viewMode === "briefing" && historySnapshots.length ? (
          <BriefingView
            snapshots={historySnapshots}
            activeSnapshotIndex={activeSnapshotIndex}
            onSnapshotChange={setActiveSnapshotIndex}
            timelinesData={timelinesData}
            onOpenDetail={openDetail}
            onOpenMap={openMapFromReplay}
          />
        ) : null}

        {viewMode === "briefing" && !historySnapshots.length && !loading ? (
          <section className="briefing-view">
            <div className="empty-state">No historical snapshot archive is available yet.</div>
          </section>
        ) : null}
      </div>

      <button
        type="button"
        className={`backdrop ${selectedCountry ? "open" : ""}`}
        onClick={() => setSelectedIso(null)}
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
                  onClick={() => setSelectedIso(null)}
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
                        Refreshed {formatTimestamp(selectedCountry.last_updated)}
                      </span>
                    </div>
                    <ul className="detail-change-list">
                      {selectedCountry.change_summary.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="detail-section">
                  <div className="section-header">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <circle cx="8" cy="8" r="6" />
                      <path d="M8 5v3l2 2" />
                    </svg>
                    <span>What's Happening</span>
                  </div>
                  <p>{selectedCountry.tldr || ""}</p>
                </div>

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
                            onClick={() => toggleLeader(index)}
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
                          onClick={() => toggleTimeline(index)}
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
                      {impact.impacts.map((item) => (
                        <li key={item}>{item}</li>
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
