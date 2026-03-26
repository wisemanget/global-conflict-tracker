import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import DashboardOverview from "./components/DashboardOverview";
import DetailPanel from "./components/DetailPanel";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import { theaterColors, theaterOrder, threatColors } from "./constants";
import { fetchJson, formatRefreshStatus } from "./utils";

const BriefingView = lazy(() => import("./components/BriefingView"));
const WorldMap = lazy(() => import("./components/WorldMap"));

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

const mapFocusModes = {
  standard: {
    label: "Standard",
    description: "See the full theater picture without extra weighting.",
  },
  urgent: {
    label: "Most urgent",
    description: "Surface the conflicts with the highest immediate escalation risk.",
  },
  changed: {
    label: "Most changed",
    description: "Highlight the places where the picture is moving fastest.",
  },
  markets: {
    label: "Markets",
    description: "Bring energy, shipping, and market-sensitive conflicts to the front.",
  },
  humanitarian: {
    label: "Humanitarian",
    description: "Center conflicts with the biggest civilian and displacement impact.",
  },
};

const mapOverlayModes = {
  pressure: {
    label: "Pressure lanes",
    description: "Show directional threat, proxy, and support relationships between active conflict nodes.",
  },
  escalation: {
    label: "Escalation",
    description: "Pulse the places where the conflict picture is worsening or still unstable.",
  },
  shipping: {
    label: "Shipping risk",
    description: "Highlight energy and shipping-linked pressure corridors across the map.",
  },
  theaters: {
    label: "Theaters only",
    description: "Keep the map clean and color-coded by theater without extra overlays.",
  },
};

const overlayLegendItems = {
  pressure: [
    { label: "Threat / strike pressure", tone: "threat" },
    { label: "Proxy / partner lanes", tone: "proxy" },
    { label: "Alliance / support lanes", tone: "support" },
  ],
  escalation: [
    { label: "Escalating flashpoint", tone: "threat" },
    { label: "Watch closely", tone: "watch" },
    { label: "Labels appear in theater zoom", tone: "neutral" },
  ],
  shipping: [
    { label: "Energy and shipping corridor", tone: "shipping" },
    { label: "Market-sensitive node", tone: "shipping-node" },
    { label: "Regional detail appears when filtered", tone: "neutral" },
  ],
  theaters: [
    { label: "Country color = theater", tone: "theater" },
    { label: "Hotspot size = threat level", tone: "neutral" },
    { label: "Use lens controls to reprioritize", tone: "support" },
  ],
};

function getLatestTimestampFromConflicts(conflicts) {
  if (!conflicts.length) {
    return null;
  }

  const latest = conflicts.reduce((currentLatest, conflict) => {
    const value = Date.parse(conflict.last_updated || "");
    if (Number.isNaN(value)) {
      return currentLatest;
    }

    return currentLatest === null || value > currentLatest ? value : currentLatest;
  }, null);

  return latest ? new Date(latest).toISOString() : null;
}

function sleep(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export default function App() {
  const [conflictData, setConflictData] = useState([]);
  const [historySnapshots, setHistorySnapshots] = useState([]);
  const [leadersData, setLeadersData] = useState({});
  const [timelinesData, setTimelinesData] = useState({});
  const [impactData, setImpactData] = useState({});
  const [connectionsData, setConnectionsData] = useState([]);
  const [dataRefreshedAt, setDataRefreshedAt] = useState(null);
  const [viewMode, setViewMode] = useState("map");
  const [activeSnapshotIndex, setActiveSnapshotIndex] = useState(0);
  const [currentFilter, setCurrentFilter] = useState("all");
  const [impactFilter, setImpactFilter] = useState("all");
  const [currentSort, setCurrentSort] = useState("threat");
  const [currentSidebarTab, setCurrentSidebarTab] = useState("intel");
  const [mapFocusMode, setMapFocusMode] = useState("urgent");
  const [mapOverlayMode, setMapOverlayMode] = useState("pressure");
  const [selectedIso, setSelectedIso] = useState(null);
  const [highlightedIsos, setHighlightedIsos] = useState([]);
  const [expandedLeaderIndexes, setExpandedLeaderIndexes] = useState([]);
  const [expandedTimelineIndexes, setExpandedTimelineIndexes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshFeedback, setRefreshFeedback] = useState("");
  const [error, setError] = useState("");
  const detailInnerRef = useRef(null);
  const activeRef = useRef(true);
  const refreshEndpoint = import.meta.env.VITE_REFRESH_ENDPOINT?.trim() || "/api/refresh";

  async function loadData(isRefresh = false) {
    const setter = isRefresh ? setRefreshing : setLoading;
    try {
      setter(true);
      const [conflicts, history, leaders, timelines, impacts, connections, metadata] = await Promise.all([
        fetchJson("/conflict_data.json"),
        fetchJson("/history_snapshots.json"),
        fetchJson("/leaders_data.json"),
        fetchJson("/timelines_data.json"),
        fetchJson("/impact_data.json"),
        fetchJson("/connections_data.json"),
        fetchJson("/metadata.json").catch(() => null),
      ]);

      if (!activeRef.current) {
        return;
      }

      setConflictData(conflicts);
      setHistorySnapshots(history);
      setLeadersData(leaders);
      setTimelinesData(timelines);
      setImpactData(impacts);
      setConnectionsData(connections);
      setDataRefreshedAt(metadata?.data_refreshed_at || null);
      setError("");
      return {
        conflicts,
        history,
        leaders,
        timelines,
        impacts,
        connections,
      };
    } catch (loadError) {
      if (!activeRef.current) {
        return;
      }

      setError(loadError.message || "Failed to load application data.");
      return null;
    } finally {
      if (activeRef.current) {
        setter(false);
      }
    }
  }

  useEffect(() => {
    activeRef.current = true;
    loadData();

    return () => {
      activeRef.current = false;
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

  const mapFocusItems = useMemo(() => {
    const scored = conflictData.map((conflict) => {
      const hasTag = (tag) => (conflict.impact_tags || []).includes(tag);
      const rankWeight = Math.max(0, 6 - (conflict.story_rank || 6));
      const changeWeight =
        conflict.change_status === "escalated"
          ? 4
          : conflict.change_status === "watch"
            ? 3
            : conflict.change_status === "improving"
              ? 2
              : 1;

      let score = (conflict.threat_level || 0) * 2 + rankWeight;

      if (mapFocusMode === "changed") {
        score = changeWeight * 4 + rankWeight + (conflict.change_summary?.length || 0);
      } else if (mapFocusMode === "markets") {
        score =
          (hasTag("Energy") ? 5 : 0) +
          (hasTag("Shipping") ? 5 : 0) +
          (hasTag("Markets") ? 4 : 0) +
          (conflict.threat_level || 0);
      } else if (mapFocusMode === "humanitarian") {
        score =
          (hasTag("Humanitarian") ? 6 : 0) +
          (hasTag("Security") ? 3 : 0) +
          (hasTag("Elections") ? 2 : 0) +
          changeWeight +
          (conflict.threat_level || 0);
      } else if (mapFocusMode === "urgent") {
        score = (conflict.threat_level || 0) * 4 + changeWeight * 2 + rankWeight;
      }

      return { ...conflict, focusScore: score };
    });

    const sorted =
      mapFocusMode === "standard"
        ? [...topDevelopments]
        : scored.sort((left, right) => right.focusScore - left.focusScore).slice(0, 5);

    return sorted;
  }, [conflictData, mapFocusMode, topDevelopments]);

  const focusedIsos = useMemo(() => {
    if (mapFocusMode === "standard") {
      return [];
    }

    return mapFocusItems.map((conflict) => conflict.iso_code);
  }, [mapFocusItems, mapFocusMode]);

  const latestDatasetTimestamp = useMemo(
    () => getLatestTimestampFromConflicts(conflictData),
    [conflictData],
  );

  const timestamp = useMemo(() => {
    return formatRefreshStatus(latestDatasetTimestamp);
  }, [latestDatasetTimestamp]);

  const activeCount = conflictData.length;
  const criticalCount = conflictData.filter((conflict) => conflict.threat_level >= 5).length;
  const leadStory = topDevelopments[0] || null;
  const leaders = selectedCountry ? leadersData[selectedCountry.iso_code] || [] : [];
  const timelineEvents = selectedCountry ? timelinesData[selectedCountry.theater] || [] : [];
  const impact = selectedCountry ? impactData[selectedCountry.iso_code] : null;
  const currentRegionLabel = currentFilter === "all" ? "Global view" : currentFilter;
  const activeOverlayLegend = overlayLegendItems[mapOverlayMode];

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

  function openMapFromReplay(theater) {
    setCurrentFilter(theater || "all");
    setViewMode("map");
  }

  function openFocusedCountry(conflict) {
    setCurrentFilter(conflict.theater || "all");
    openDetail(conflict.iso_code);
  }

  async function waitForUpdatedDataset(previousTimestamp) {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      if (attempt > 0) {
        await sleep(8000);
      }

      const payload = await loadData(true);
      const nextTimestamp = getLatestTimestampFromConflicts(payload?.conflicts || []);
      if (nextTimestamp && nextTimestamp !== previousTimestamp) {
        return nextTimestamp;
      }
    }

    return null;
  }

  async function handleRefresh() {
    const previousTimestamp = latestDatasetTimestamp;

    if (!refreshEndpoint) {
      setRefreshFeedback("Reloaded the latest published dataset. Live refresh endpoint is not configured.");
      await loadData(true);
      return;
    }

    try {
      setRefreshing(true);
      setRefreshFeedback("Requesting a live refresh...");

      const response = await fetch(refreshEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requested_at: new Date().toISOString(),
          source: "app",
        }),
      });

      const payload = await response.json().catch(() => null);
      const message = payload?.message || "";

      if (!response.ok) {
        throw new Error(message || `Refresh request failed (${response.status})`);
      }

      setRefreshFeedback(message || "Live refresh requested. Waiting for the new dataset to publish...");
      const nextTimestamp = await waitForUpdatedDataset(previousTimestamp);

      if (nextTimestamp) {
        setRefreshFeedback("Live data updated.");
      } else {
        setRefreshFeedback("Refresh requested, but the new dataset is still publishing.");
      }
    } catch (refreshError) {
      setRefreshFeedback(refreshError.message || "Unable to request a live refresh.");
      await loadData(true);
    } finally {
      if (activeRef.current) {
        setRefreshing(false);
      }
    }
  }

  return (
    <>
      <div className="dashboard">
        <Header
          globalThreat={globalThreat}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          activeCount={activeCount}
          criticalCount={criticalCount}
          timestamp={timestamp}
          refreshing={refreshing}
          refreshFeedback={refreshFeedback}
          liveRefreshEnabled={Boolean(refreshEndpoint)}
          onRefresh={handleRefresh}
        />

        <main className={`map-workspace ${viewMode === "map" ? "" : "hidden"}`}>
          <section className="map-stage">
            <section className="map-shell">
              <div className="map-shell-header">
                <div className="map-shell-summary">
                  <span className="map-shell-kicker">Live Map</span>
                  <h3 className="map-shell-title">
                    {leadStory
                      ? `${leadStory.country}: ${leadStory.briefing_note || leadStory.tldr}`
                      : "Track the most important active conflict signals on the map."}
                  </h3>
                </div>
                <div className="map-shell-actions">
                  <button
                    type="button"
                    className="map-shell-brief-btn"
                    onClick={() => setViewMode("briefing")}
                  >
                    Open briefing
                  </button>
                  {leadStory ? (
                    <button
                      type="button"
                      className="map-shell-brief-btn"
                      onClick={() => openDetail(leadStory.iso_code)}
                    >
                      Open lead report
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="map-container">
                <Suspense fallback={<div className="map-fallback">Loading interactive map...</div>}>
                  <WorldMap
                    conflictData={conflictData}
                    connectionsData={connectionsData}
                    currentFilter={currentFilter}
                    focusMode={mapFocusMode}
                    overlayMode={mapOverlayMode}
                    focusedIsos={focusedIsos}
                    onCountrySelect={openDetail}
                  />
                </Suspense>

                <div className="map-legend">
                  <span className="legend-title">Theaters of Operation</span>
                  <div className="legend-items">
                    <button
                      type="button"
                      className={`legend-item ${currentFilter === "all" ? "active" : ""}`}
                      onClick={() => setCurrentFilter("all")}
                    >
                      <span className="legend-dot legend-dot-global" />
                      <span>Global view</span>
                    </button>
                    {Object.entries(theaterColors).map(([theater, color]) => (
                      <button
                        key={theater}
                        type="button"
                        className={`legend-item ${currentFilter === theater ? "active" : ""}`}
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

                <div className="map-overlay-legend">
                  <div className="map-overlay-legend-header">
                    <span className="legend-title">Overlay key</span>
                    <span className="map-overlay-context">{currentRegionLabel}</span>
                  </div>
                  <div className="map-overlay-legend-items">
                    {activeOverlayLegend.map((item) => (
                      <div key={`${mapOverlayMode}-${item.label}`} className="map-overlay-legend-item">
                        <span className={`map-overlay-swatch ${item.tone}`} />
                        <span>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="map-toolbar-stack">
                <div className="map-focus-toolbar">
                  <span className="map-toolbar-label">Lens</span>
                  {Object.entries(mapFocusModes).map(([modeKey, mode]) => (
                    <button
                      key={modeKey}
                      type="button"
                      className={`map-focus-chip ${mapFocusMode === modeKey ? "active" : ""}`}
                      onClick={() => setMapFocusMode(modeKey)}
                    >
                      {mode.label}
                    </button>
                  ))}
                  <span className="map-shell-copy">{mapFocusModes[mapFocusMode].description}</span>
                </div>

                <div className="map-focus-toolbar map-overlay-toolbar">
                  <span className="map-toolbar-label">Overlay</span>
                  {Object.entries(mapOverlayModes).map(([modeKey, mode]) => (
                    <button
                      key={modeKey}
                      type="button"
                      className={`map-focus-chip ${mapOverlayMode === modeKey ? "active" : ""}`}
                      onClick={() => setMapOverlayMode(modeKey)}
                    >
                      {mode.label}
                    </button>
                  ))}
                  <span className="map-shell-copy">{mapOverlayModes[mapOverlayMode].description}</span>
                </div>
              </div>

              <div className="map-focus-rail">
                {mapFocusItems.map((conflict, index) => (
                  <button
                    key={`${mapFocusMode}-${conflict.iso_code}`}
                    type="button"
                    className="map-focus-card"
                    onClick={() => openFocusedCountry(conflict)}
                  >
                    <span className="map-focus-rank">{index + 1}</span>
                    <div className="map-focus-copy">
                      <div className="map-focus-top">
                        <span className="map-focus-country">{conflict.country}</span>
                        <span className="map-focus-theater">{conflict.theater}</span>
                      </div>
                      <div className="map-focus-note">
                        {conflict.briefing_note || conflict.tldr || conflict.headline}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          </section>
        </main>

        <main className={`main briefing-workspace ${viewMode === "briefing" ? "" : "hidden"}`}>
          <div className="primary-stage briefing-stage">
            <DashboardOverview
              topDevelopments={topDevelopments}
              conflictData={conflictData}
              onOpenDetail={openDetail}
              timestamp={timestamp}
            />
          </div>

          <Sidebar
            currentSidebarTab={currentSidebarTab}
            onSidebarTabChange={setCurrentSidebarTab}
            currentFilter={currentFilter}
            onFilterChange={setCurrentFilter}
            impactFilter={impactFilter}
            onImpactFilterChange={setImpactFilter}
            impactOptions={impactOptions}
            currentSort={currentSort}
            onSortChange={setCurrentSort}
            loading={loading}
            error={error}
            filteredConflicts={filteredConflicts}
            connectionsData={connectionsData}
            selectedIso={selectedIso}
            highlightedIsos={highlightedIsos}
            onOpenDetail={openDetail}
            onHighlightConnection={highlightConnection}
            getCountryName={getCountryName}
          />
        </main>

        {viewMode === "replay" && historySnapshots.length ? (
          <Suspense
            fallback={
              <section className="briefing-view">
                <div className="map-fallback">Loading replay briefing...</div>
              </section>
            }
          >
            <BriefingView
              snapshots={historySnapshots}
              activeSnapshotIndex={activeSnapshotIndex}
              onSnapshotChange={setActiveSnapshotIndex}
              timelinesData={timelinesData}
              onOpenDetail={openDetail}
              onOpenMap={openMapFromReplay}
            />
          </Suspense>
        ) : null}

        {viewMode === "replay" && !historySnapshots.length && !loading ? (
          <section className="briefing-view">
            <div className="empty-state">No historical snapshot archive is available yet.</div>
          </section>
        ) : null}
      </div>

      <DetailPanel
        selectedCountry={selectedCountry}
        leaders={leaders}
        timelineEvents={timelineEvents}
        impact={impact}
        expandedLeaderIndexes={expandedLeaderIndexes}
        expandedTimelineIndexes={expandedTimelineIndexes}
        onClose={() => setSelectedIso(null)}
        onToggleLeader={toggleLeader}
        onToggleTimeline={toggleTimeline}
        detailInnerRef={detailInnerRef}
        dataRefreshedAt={dataRefreshedAt}
      />
    </>
  );
}
