import { theaterColors } from "../constants";
import CountryCard from "./CountryCard";

const sortLabels = {
  threat: "By Threat",
  theater: "By Theater",
  alpha: "A-Z",
};

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

        <div className={`sidebar-tools ${currentSidebarTab === "intel" ? "" : "hidden"}`}>
          <details className="sidebar-disclosure">
            <summary className="sidebar-disclosure-summary">
              <span>Filter</span>
              {impactFilter !== "all" ? (
                <span className="sidebar-disclosure-pill">
                  Impact: {impactFilter}
                  <span
                    className="sidebar-disclosure-pill-clear"
                    role="button"
                    tabIndex={0}
                    aria-label="Clear impact filter"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onImpactFilterChange("all");
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        event.stopPropagation();
                        onImpactFilterChange("all");
                      }
                    }}
                  >
                    {"✕"}
                  </span>
                </span>
              ) : null}
              <span className="sidebar-disclosure-caret" aria-hidden="true">{"▾"}</span>
            </summary>
            <div className="sidebar-disclosure-content">
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
          </details>

          <label className="sidebar-sort">
            <span className="sidebar-sort-label">Sort:</span>
            <select
              className="sidebar-sort-select"
              value={currentSort}
              onChange={(event) => onSortChange(event.target.value)}
            >
              {Object.entries(sortLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className={`sidebar-content ${currentSidebarTab === "intel" ? "" : "hidden"}`}>
        {loading ? <div className="loading-state">Loading conflict data...</div> : null}
        {error ? <div className="error-state">{error}</div> : null}
        {!loading && !error && !filteredConflicts.length ? (
          <div className="empty-state">No conflicts match the current filter.</div>
        ) : null}

        {!loading && !error ? (
          <div className="sidebar-report-stack">
            <div className="sidebar-section-label">Signal cards</div>
            {filteredConflicts.map((conflict, index) => (
              <CountryCard
                key={conflict.iso_code}
                conflict={conflict}
                isActive={isCardActive(conflict.iso_code)}
                animationDelay={index * 40}
                onClick={() => onOpenDetail(conflict.iso_code)}
              />
            ))}
          </div>
        ) : null}
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
                <span className="connection-arrow">{"→"}</span>
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
