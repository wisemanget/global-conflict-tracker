import Plotly from "plotly.js-geo-dist";
import { useEffect, useRef, useState } from "react";
import {
  countryCoords,
  regions,
  theaterColors,
  theaterISO,
  threatColors,
} from "../constants";

function buildMapTraces(conflictData) {
  const traces = [];

  Object.entries(theaterISO).forEach(([theater, isos]) => {
    const color = theaterColors[theater];

    traces.push({
      type: "choropleth",
      locationmode: "ISO-3",
      locations: isos,
      z: isos.map(() => 1),
      text: isos.map((iso) => {
        const entry = conflictData.find((conflict) => conflict.iso_code === iso);

        if (!entry) {
          return "";
        }

        const shortTldr =
          (entry.tldr || "").length > 100 ? `${entry.tldr.substring(0, 100)}...` : entry.tldr || "";

        return `<b>${entry.country}</b> [${entry.threat_label || ""}]<br>${entry.headline || ""}<br><span style="color:#7d829a">${shortTldr}</span>`;
      }),
      hoverinfo: "text",
      hoverlabel: {
        bgcolor: "#171b2a",
        bordercolor: color,
        font: { family: "Inter, sans-serif", size: 12, color: "#e4e6ed" },
        align: "left",
      },
      colorscale: [
        [0, `${color}25`],
        [1, `${color}25`],
      ],
      showscale: false,
      marker: { line: { color: `${color}60`, width: 1 } },
      showlegend: false,
    });
  });

  conflictData.forEach((conflict) => {
    const coord = countryCoords[conflict.iso_code];

    if (!coord) {
      return;
    }

    const color = theaterColors[conflict.theater];
    const threatSize = 6 + (conflict.threat_level || 3) * 3;
    const shortTldr =
      (conflict.tldr || "").length > 100 ? `${conflict.tldr.substring(0, 100)}...` : conflict.tldr || "";

    traces.push({
      type: "scattergeo",
      lat: [coord.lat],
      lon: [coord.lon],
      hoverinfo: "skip",
      marker: {
        size: threatSize + 12,
        color,
        opacity: 0.15,
        line: { width: 0 },
      },
      showlegend: false,
    });

    traces.push({
      type: "scattergeo",
      lat: [coord.lat],
      lon: [coord.lon],
      hoverinfo: "skip",
      marker: {
        size: threatSize + 6,
        color,
        opacity: 0.25,
        line: { width: 0 },
      },
      showlegend: false,
    });

    traces.push({
      type: "scattergeo",
      lat: [coord.lat],
      lon: [coord.lon],
      text: [
        `<b>${conflict.country}</b> [${conflict.threat_label || ""}]<br>${conflict.headline || ""}<br><span style="color:#7d829a">${shortTldr}</span><br><span style="color:#464c66">Click for full report</span>`,
      ],
      customdata: [conflict.iso_code],
      hoverinfo: "text",
      hoverlabel: {
        bgcolor: "#171b2a",
        bordercolor: color,
        font: { family: "Inter, sans-serif", size: 12, color: "#e4e6ed" },
        align: "left",
        namelength: -1,
      },
      marker: {
        size: threatSize,
        color: conflict.threat_level >= 5 ? threatColors[5] : color,
        opacity: 0.9,
        line: { color: "#fff", width: 1.5 },
        symbol: "circle",
      },
      showlegend: false,
    });
  });

  return traces;
}

const layout = {
  geo: {
    showframe: false,
    showcoastlines: true,
    coastlinecolor: "#252a3d",
    showland: true,
    landcolor: "#111420",
    showocean: true,
    oceancolor: "#0a0c12",
    showlakes: true,
    lakecolor: "#0a0c12",
    showcountries: true,
    countrycolor: "#1a1f30",
    countrywidth: 0.5,
    projection: { type: "natural earth" },
    bgcolor: "#0a0c12",
    lonaxis: { range: regions.all.lon },
    lataxis: { range: regions.all.lat },
  },
  paper_bgcolor: "#0a0c12",
  plot_bgcolor: "#0a0c12",
  margin: { t: 0, b: 0, l: 20, r: 0 },
  dragmode: "pan",
  hovermode: "closest",
  hoverlabel: {
    font: { family: "Inter, sans-serif", size: 12 },
  },
};

const config = {
  displayModeBar: true,
  modeBarButtonsToRemove: ["toImage", "lasso2d", "select2d"],
  displaylogo: false,
  scrollZoom: true,
  responsive: true,
};

export default function WorldMap({ conflictData, currentFilter, onCountrySelect }) {
  const mapRef = useRef(null);
  const onCountrySelectRef = useRef(onCountrySelect);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    onCountrySelectRef.current = onCountrySelect;
  }, [onCountrySelect]);

  useEffect(() => {
    const mapNode = mapRef.current;

    if (!mapNode || !conflictData.length) {
      return undefined;
    }

    let isActive = true;

    Plotly.newPlot(mapNode, buildMapTraces(conflictData), layout, config).then(() => {
      if (!isActive || !mapRef.current) {
        return;
      }

      setMapReady(true);

      const svgNodes = mapRef.current.querySelectorAll(".main-svg");
      svgNodes.forEach((svg) => {
        svg.style.overflow = "visible";
        svg.querySelectorAll(".geo, .geolayer, .layer").forEach((layer) => {
          layer.style.overflow = "visible";
          layer.removeAttribute("clip-path");
        });
      });

      const hoverLayers = mapRef.current.querySelectorAll(".hoverlayer");
      hoverLayers.forEach((hoverLayer) => {
        hoverLayer.style.overflow = "visible";
        hoverLayer.removeAttribute("clip-path");

        let parent = hoverLayer.parentElement;
        while (parent && parent !== mapRef.current) {
          parent.style.overflow = "visible";
          parent.removeAttribute("clip-path");
          parent = parent.parentElement;
        }
      });

      mapNode.removeAllListeners?.("plotly_click");
      mapNode.on("plotly_click", (event) => {
        const iso = event?.points?.[0]?.customdata;
        if (iso) {
          onCountrySelectRef.current?.(iso);
        }
      });
    });

    return () => {
      isActive = false;
      mapNode.removeAllListeners?.("plotly_click");
      Plotly.purge(mapNode);
    };
  }, [conflictData]);

  useEffect(() => {
    const mapNode = mapRef.current;

    if (!mapNode || !conflictData.length) {
      return;
    }

    const region = regions[currentFilter] || regions.all;
    Plotly.relayout(mapNode, {
      "geo.lonaxis.range": region.lon,
      "geo.lataxis.range": region.lat,
    });
  }, [conflictData.length, currentFilter]);

  return (
    <>
      {!mapReady && (
        <div
          className="map-loading"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "absolute",
            inset: 0,
            zIndex: 1,
            background: "var(--color-bg, #0a0c12)",
            color: "var(--color-text-muted, #7d829a)",
            fontFamily: "var(--font-body, sans-serif)",
            fontSize: "var(--text-sm, 0.85rem)",
            gap: "0.5rem",
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{
              animation: "spin 1.2s linear infinite",
            }}
          >
            <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
          </svg>
          Loading map...
        </div>
      )}
      <div id="plotly-map" ref={mapRef} />
    </>
  );
}
