import Plotly from "plotly.js-geo-dist";
import { useEffect, useRef, useState } from "react";
import {
  countryCoords,
  regions,
  theaterColors,
  theaterISO,
  threatColors,
} from "../constants";

const connectionStyles = {
  alliance: { color: "#6c8aff", width: 1.8, dash: "dot", symbol: "diamond" },
  support: { color: "#3dd98a", width: 1.8, dash: "dash", symbol: "square" },
  proxy: { color: "#ffb340", width: 2.2, dash: "dot", symbol: "triangle-up" },
  threat: { color: "#ff5c5c", width: 2.8, dash: "solid", symbol: "triangle-down" },
  parallel: { color: "#7d829a", width: 1.4, dash: "dash", symbol: "circle-open" },
};

function hexToRgba(hex, alpha) {
  const clean = hex.replace("#", "");
  const value = Number.parseInt(clean, 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function buildArcPath(fromCoord, toCoord) {
  const midLon = (fromCoord.lon + toCoord.lon) / 2;
  const midLat = (fromCoord.lat + toCoord.lat) / 2;
  const distance = Math.hypot(toCoord.lon - fromCoord.lon, toCoord.lat - fromCoord.lat);
  const lift = Math.min(13, Math.max(4, distance * 0.09));

  return {
    lon: [fromCoord.lon, midLon, toCoord.lon],
    lat: [fromCoord.lat, midLat + lift, toCoord.lat],
    midLon,
    midLat: midLat + lift,
  };
}

function buildOverlayTraces(conflictData, connectionsData, overlayMode, focusedSet, hasFocus) {
  const traces = [];
  const conflictByIso = new Map(conflictData.map((conflict) => [conflict.iso_code, conflict]));

  if (overlayMode === "theaters") {
    return traces;
  }

  if (overlayMode === "escalation") {
    conflictData
      .filter(
        (conflict) =>
          conflict.change_status === "escalated" ||
          conflict.change_status === "watch" ||
          (conflict.threat_level || 0) >= 5,
      )
      .forEach((conflict) => {
        const coord = countryCoords[conflict.iso_code];

        if (!coord) {
          return;
        }

        const isFocused = !hasFocus || focusedSet.has(conflict.iso_code);
        const statusColor =
          conflict.change_status === "watch"
            ? threatColors[4]
            : conflict.change_status === "improving"
              ? threatColors[2]
              : threatColors[5];
        const outerSize = 34 + (conflict.threat_level || 3) * 3;
        const innerSize = 20 + (conflict.threat_level || 3) * 2;

        traces.push({
          type: "scattergeo",
          lat: [coord.lat],
          lon: [coord.lon],
          hoverinfo: "skip",
          marker: {
            size: outerSize,
            color: "rgba(0,0,0,0)",
            opacity: isFocused ? 0.75 : 0.25,
            line: { color: hexToRgba(statusColor, isFocused ? 0.55 : 0.24), width: 2 },
            symbol: "circle-open",
          },
          showlegend: false,
        });

        traces.push({
          type: "scattergeo",
          lat: [coord.lat],
          lon: [coord.lon],
          text: [
            `<b>${conflict.country}</b><br>Escalation signal: ${conflict.change_status}<br><span style="color:#7d829a">${conflict.headline || conflict.tldr || ""}</span>`,
          ],
          customdata: [conflict.iso_code],
          hoverinfo: "text",
          hoverlabel: {
            bgcolor: "#171b2a",
            bordercolor: statusColor,
            font: { family: "Inter, sans-serif", size: 12, color: "#e4e6ed" },
            align: "left",
          },
          marker: {
            size: innerSize,
            color: "rgba(0,0,0,0)",
            opacity: isFocused ? 0.95 : 0.42,
            line: { color: statusColor, width: 2.5 },
            symbol: "circle-open",
          },
          showlegend: false,
        });
      });

    return traces;
  }

  const visibleConnections = connectionsData.filter((connection) => {
    const fromConflict = conflictByIso.get(connection.from);
    const toConflict = conflictByIso.get(connection.to);

    if (!fromConflict || !toConflict) {
      return false;
    }

    if (overlayMode === "pressure") {
      return connection.type !== "parallel";
    }

    if (overlayMode === "shipping") {
      const impactTags = new Set([
        ...(fromConflict.impact_tags || []),
        ...(toConflict.impact_tags || []),
      ]);
      return impactTags.has("Shipping") || impactTags.has("Energy") || impactTags.has("Markets");
    }

    return true;
  });

  visibleConnections.forEach((connection) => {
    const fromCoord = countryCoords[connection.from];
    const toCoord = countryCoords[connection.to];
    const fromConflict = conflictByIso.get(connection.from);
    const toConflict = conflictByIso.get(connection.to);

    if (!fromCoord || !toCoord || !fromConflict || !toConflict) {
      return;
    }

    const style = connectionStyles[connection.type] || connectionStyles.parallel;
    const isFocused = !hasFocus || focusedSet.has(connection.from) || focusedSet.has(connection.to);
    const path = buildArcPath(fromCoord, toCoord);
    const opacity = overlayMode === "shipping" ? (isFocused ? 0.8 : 0.24) : isFocused ? 0.66 : 0.16;
    const markerSymbol = overlayMode === "shipping" ? "diamond" : style.symbol;

    traces.push({
      type: "scattergeo",
      mode: "lines",
      lon: path.lon,
      lat: path.lat,
      text: [connection.label, connection.label, connection.label],
      hoverinfo: "text",
      hoverlabel: {
        bgcolor: "#171b2a",
        bordercolor: style.color,
        font: { family: "Inter, sans-serif", size: 12, color: "#e4e6ed" },
        align: "left",
      },
      line: {
        color: hexToRgba(style.color, opacity),
        width: overlayMode === "shipping" ? style.width + 0.8 : style.width,
        dash: style.dash,
      },
      showlegend: false,
    });

    traces.push({
      type: "scattergeo",
      mode: "markers",
      lon: [path.midLon],
      lat: [path.midLat],
      text: [
        `<b>${fromConflict.country} → ${toConflict.country}</b><br>${connection.label}<br><span style="color:#7d829a">${connection.type}</span>`,
      ],
      customdata: [connection.to],
      hoverinfo: "text",
      hoverlabel: {
        bgcolor: "#171b2a",
        bordercolor: style.color,
        font: { family: "Inter, sans-serif", size: 12, color: "#e4e6ed" },
        align: "left",
      },
      marker: {
        size: overlayMode === "shipping" ? 10 : 9,
        color: hexToRgba(style.color, isFocused ? 0.95 : 0.45),
        line: { color: "#ffffff", width: 1 },
        symbol: markerSymbol,
      },
      showlegend: false,
    });
  });

  if (overlayMode === "shipping") {
    const shippingNodes = conflictData
      .filter((conflict) => {
        const tags = new Set(conflict.impact_tags || []);
        return tags.has("Shipping") || tags.has("Energy") || tags.has("Markets");
      })
      .map((conflict) => ({ conflict, coord: countryCoords[conflict.iso_code] }))
      .filter((item) => item.coord);

    traces.push({
      type: "scattergeo",
      mode: "markers",
      lat: shippingNodes.map(({ coord }) => coord.lat),
      lon: shippingNodes.map(({ coord }) => coord.lon),
      text: shippingNodes.map(
        ({ conflict }) =>
          `<b>${conflict.country}</b><br>Shipping and energy pressure node<br><span style="color:#7d829a">${conflict.headline || conflict.tldr || ""}</span>`,
      ),
      customdata: shippingNodes.map(({ conflict }) => conflict.iso_code),
      hoverinfo: "text",
      hoverlabel: {
        bgcolor: "#171b2a",
        bordercolor: "#ffb340",
        font: { family: "Inter, sans-serif", size: 12, color: "#e4e6ed" },
        align: "left",
      },
      marker: {
        size: shippingNodes.map(({ conflict }) => 9 + (conflict.threat_level || 3) * 2),
        color: "rgba(255,179,64,0.18)",
        line: { color: "#ffb340", width: 2 },
        symbol: "diamond-open",
      },
      showlegend: false,
    });
  }

  return traces;
}

function buildMapTraces(conflictData, connectionsData, focusMode, focusedIsos, overlayMode) {
  const traces = [];
  const focusedSet = new Set(focusedIsos);
  const hasFocus = focusMode !== "standard" && focusedSet.size > 0;

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
        [0, `${color}${hasFocus ? "16" : "25"}`],
        [1, `${color}${hasFocus ? "16" : "25"}`],
      ],
      showscale: false,
      marker: { line: { color: `${color}60`, width: 1 } },
      showlegend: false,
    });
  });

  traces.push(...buildOverlayTraces(conflictData, connectionsData, overlayMode, focusedSet, hasFocus));

  conflictData.forEach((conflict) => {
    const coord = countryCoords[conflict.iso_code];

    if (!coord) {
      return;
    }

    const color = theaterColors[conflict.theater];
    const threatSize = 6 + (conflict.threat_level || 3) * 3;
    const isFocused = !hasFocus || focusedSet.has(conflict.iso_code);
    const shortTldr =
      (conflict.tldr || "").length > 100 ? `${conflict.tldr.substring(0, 100)}...` : conflict.tldr || "";

    traces.push({
      type: "scattergeo",
      lat: [coord.lat],
      lon: [coord.lon],
      hoverinfo: "skip",
      marker: {
        size: threatSize + (isFocused ? 14 : 8),
        color,
        opacity: isFocused ? 0.18 : 0.05,
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
        size: threatSize + (isFocused ? 8 : 3),
        color,
        opacity: isFocused ? 0.28 : 0.08,
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
        size: threatSize + (isFocused ? 2 : -2),
        color: conflict.threat_level >= 5 ? threatColors[5] : color,
        opacity: isFocused ? 0.95 : 0.42,
        line: { color: "#fff", width: isFocused ? 2.4 : 1 },
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

export default function WorldMap({
  conflictData,
  connectionsData,
  currentFilter,
  focusMode,
  overlayMode,
  focusedIsos,
  onCountrySelect,
}) {
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

    Plotly.newPlot(
      mapNode,
      buildMapTraces(conflictData, connectionsData, focusMode, focusedIsos, overlayMode),
      layout,
      config,
    ).then(() => {
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
  }, [conflictData, connectionsData, focusMode, focusedIsos, overlayMode]);

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
