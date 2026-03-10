import { getChangeMeta } from "../utils";
import { theaterColors } from "../constants";
import CountryCard from "./CountryCard";

export default function Sidebar({
  currentSidebarTab,
  onSidebarTabChange,
  currentFilter,
  onFilterChange,
  impactFilter,
  onImpactFilterChange,
  impactOptions,
  currentSort,
  onSortChange,
  loading,
  error,
  totalCount,
  topDevelopments,
  filteredConflicts,
  connectionsData,
  selectedIso,
  highlightedIsos,
  onOpenDetail,
  onHighlightConnection,
  getCountryName,
}) {
  function isCardActive(iso) {
    return selectedIso === iso || highlightedIsos.includes(iso);
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-tabs">
          <button
            type="button"
            className={`sidebar-tab ${currentSidebarTab === "intel" ? "active" : ""}`}
            onClick={() => onSidebarTabChange("intel")}
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
            onClick={() => onSidebarTabChange("connections")}
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
          <span className="feed-badge">{totalCount} reports</span>
        </div>

        <div className={`theater-filters ${currentSidebarTab === "intel" ? "" : "hidden"}`}>
          <button
            type="button"
            className={`filter-chip ${currentFilter === "all" ? "active" : ""}`}
            onClick={() => onFilterChange("all")}
          >
            All
          </button>
          {Object.entries(theaterColors).map(([theater, color]) => (
            <button
              key={theater}
              type="button"
              className={`filter-chip ${currentFilter === theater ? "active" : ""}`}
              onClick={() => onFilterChange(theater)}
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
              onClick={() => onImpactFilterChange("all")}
            >
              All impacts
            </button>
            {impactOptions.map((tag) => (
              <button
                key={tag}
                type="button"
                className={`filter-chip ${impactFilter === tag ? "active" : ""}`}
                onClick={() => onImpactFilterChange(tag)}
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
              onClick={() => onSortChange(sortKey)}
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
                    onClick={() => onOpenDetail(conflict.iso_code)}
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
          ? filteredConflicts.map((conflict, index) => (
              <CountryCard
                key={conflict.iso_code}
                conflict={conflict}
                isActive={isCardActive(conflict.iso_code)}
                animationDelay={index * 40}
                onClick={() => onOpenDetail(conflict.iso_code)}
              />
            ))
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
              onClick={() => onHighlightConnection(connection.from, connection.to)}
            >
              <div className="connection-route">
                <span>{getCountryName(connection.from)}</span>
                <span className="connection-arrow">{"\u2192"}</span>
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
  );
}
