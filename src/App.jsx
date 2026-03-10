import { useEffect, useMemo, useRef, useState } from "react";
import BriefingView from "./components/BriefingView";
import DetailPanel from "./components/DetailPanel";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import WorldMap from "./components/WorldMap";
import { theaterColors, theaterOrder, threatColors } from "./constants";
import { fetchJson } from "./utils";

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

  function openMapFromReplay(theater) {
    setCurrentFilter(theater || "all");
    setViewMode("dashboard");
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
        />

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
            totalCount={conflictData.length}
            topDevelopments={topDevelopments}
            filteredConflicts={filteredConflicts}
            connectionsData={connectionsData}
            selectedIso={selectedIso}
            highlightedIsos={highlightedIsos}
            onOpenDetail={openDetail}
            onHighlightConnection={highlightConnection}
            getCountryName={getCountryName}
          />
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
      />
    </>
  );
}
