// app.js — SITREP Global Conflict Tracker v2

// ════════════════════════════════════════════
// STATE
// ════════════════════════════════════════════

let conflictData = [];
let leadersData = {};
let timelinesData = {};
let impactData = {};
let connectionsData = [];
let currentFilter = 'all';
let currentSort = 'threat';
let currentSidebarTab = 'intel';

const theaterColors = {
  'Middle East':       '#ff5c5c',
  'Eastern Europe':    '#4da6ff',
  'Indo-Pacific':      '#ffb340',
  'Africa & Americas': '#3dd98a'
};

const threatColors = {
  5: '#ff3b3b',
  4: '#ff8c42',
  3: '#ffd23f',
  2: '#3dd98a',
  1: '#4da6ff'
};

const threatLabels = {
  5: 'CRITICAL',
  4: 'HIGH',
  3: 'ELEVATED',
  2: 'GUARDED',
  1: 'LOW'
};

const roleDefinitions = {
  hawk:      'Favors aggressive or military-first approaches to conflict and national security.',
  diplomat:  'Prioritizes negotiation, alliances, and multilateral solutions over force.',
  wildcard:  'Unpredictable decision-maker whose actions often defy conventional expectations.',
  strongman: 'Consolidates personal power through authoritarian control and suppression of dissent.',
  reformer:  'Pushes for systemic change, modernization, or liberalization within their country.'
};

const countryCoords = {
  'USA': { lat: 39.8, lon: -98.5 },
  'ISR': { lat: 31.0, lon: 34.8 },
  'IRN': { lat: 32.4, lon: 53.7 },
  'SAU': { lat: 23.9, lon: 45.1 },
  'LBN': { lat: 33.9, lon: 35.9 },
  'YEM': { lat: 15.6, lon: 48.5 },
  'RUS': { lat: 61.5, lon: 105.3 },
  'UKR': { lat: 48.4, lon: 31.2 },
  'CHN': { lat: 35.9, lon: 104.2 },
  'TWN': { lat: 23.7, lon: 121.0 },
  'PRK': { lat: 40.3, lon: 127.5 },
  'SDN': { lat: 12.9, lon: 30.2 },
  'COD': { lat: -4.0, lon: 21.8 },
  'VEN': { lat: 6.4, lon: -66.6 },
  'HTI': { lat: 19.1, lon: -72.3 }
};

const theaterISO = {
  'Middle East':       ['USA', 'ISR', 'IRN', 'SAU', 'LBN', 'YEM'],
  'Eastern Europe':    ['RUS', 'UKR'],
  'Indo-Pacific':      ['CHN', 'TWN', 'PRK'],
  'Africa & Americas': ['SDN', 'COD', 'VEN', 'HTI']
};


// ════════════════════════════════════════════
// INIT
// ════════════════════════════════════════════

async function init() {
  try {
    const conflictResp = await fetch('./conflict_data.json');
    conflictData = await conflictResp.json();
  } catch (e) {
    console.error('Failed to load conflict data:', e);
    conflictData = [];
  }

  try {
    const [leadersResp, timelinesResp, impactResp, connectionsResp] = await Promise.all([
      fetch('./leaders_data.json'),
      fetch('./timelines_data.json'),
      fetch('./impact_data.json'),
      fetch('./connections_data.json')
    ]);
    leadersData = await leadersResp.json();
    timelinesData = await timelinesResp.json();
    impactData = await impactResp.json();
    connectionsData = await connectionsResp.json();
  } catch (e) {
    console.error('Failed to load supplementary data:', e);
  }

  updateTimestamp();
  updateGlobalThreat();
  updateStats();
  renderMap();
  renderCards();
  renderConnections();
}

function updateTimestamp() {
  // Try to detect the data's last modification from conflict_data.json
  // Since we can't get file mod time from static hosting, we store a 
  // "last_updated" field in the data or use the current deploy time
  const pill = document.getElementById('header-last-updated');
  const textEl = document.getElementById('header-updated-text');
  
  // Check if any conflict data has a last_updated field
  const lastUpdated = conflictData[0]?.last_updated;
  let displayDate;
  let hoursAgo;
  
  if (lastUpdated) {
    const d = new Date(lastUpdated);
    displayDate = d;
    hoursAgo = (Date.now() - d.getTime()) / (1000 * 60 * 60);
  } else {
    // Fallback: use a rough estimate from the deploy
    displayDate = new Date();
    hoursAgo = 0;
  }
  
  const opts = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  const timeStr = displayDate.toLocaleDateString('en-US', opts);
  
  if (hoursAgo > 48) {
    textEl.textContent = 'Data from ' + timeStr + ' — may be outdated';
    pill.classList.add('stale');
  } else {
    textEl.textContent = 'Updated ' + timeStr;
    pill.classList.remove('stale');
  }
}

function updateGlobalThreat() {
  if (!conflictData.length) return;
  const avg = conflictData.reduce((sum, c) => sum + (c.threat_level || 3), 0) / conflictData.length;
  const maxThreat = Math.max(...conflictData.map(c => c.threat_level || 3));
  const pct = (avg / 5) * 100;

  const fill = document.getElementById('global-threat-fill');
  fill.style.width = pct + '%';
  fill.style.background = `linear-gradient(90deg, ${threatColors[2]}, ${threatColors[Math.round(avg)]}, ${threatColors[maxThreat]})`;

  const label = document.getElementById('global-threat-label');
  const globalLevel = maxThreat >= 5 ? 'CRITICAL' : maxThreat >= 4 ? 'HIGH' : 'ELEVATED';
  label.textContent = globalLevel;
  label.style.color = threatColors[maxThreat];
}

function updateStats() {
  document.getElementById('active-count').textContent = conflictData.length;
  const critical = conflictData.filter(c => c.threat_level >= 5).length;
  document.getElementById('critical-count').textContent = critical;
  const el = document.getElementById('critical-count');
  el.style.color = critical > 0 ? '#ff3b3b' : '#3dd98a';
  document.getElementById('feed-count').textContent = conflictData.length + ' reports';
}


// ════════════════════════════════════════════
// MAP
// ════════════════════════════════════════════

function renderMap() {
  const traces = [];

  // Choropleth fills
  Object.entries(theaterISO).forEach(([theater, isos]) => {
    const color = theaterColors[theater];

    traces.push({
      type: 'choropleth',
      locationmode: 'ISO-3',
      locations: isos,
      z: isos.map(() => 1),
      text: isos.map(iso => {
        const d = conflictData.find(c => c.iso_code === iso);
        if (!d) return '';
        const shortTldr = (d.tldr || '').length > 100 ? (d.tldr || '').substring(0, 100) + '...' : (d.tldr || '');
        return `<b>${d.country}</b>  [${d.threat_label || ''}]<br>` +
               `${d.headline || ''}<br>` +
               `<span style="color:#7d829a">${shortTldr}</span>`;
      }),
      hoverinfo: 'text',
      hoverlabel: {
        bgcolor: '#171b2a',
        bordercolor: color,
        font: { family: 'Inter, sans-serif', size: 12, color: '#e4e6ed' },
        align: 'left'
      },
      colorscale: [[0, color + '25'], [1, color + '25']],
      showscale: false,
      marker: { line: { color: color + '60', width: 1 } },
      showlegend: false
    });
  });

  // Pulsing marker dots (we'll simulate pulsing via larger translucent outer ring + solid inner)
  conflictData.forEach(c => {
    const coord = countryCoords[c.iso_code];
    if (!coord) return;
    const color = theaterColors[c.theater];
    const threatSize = 6 + (c.threat_level || 3) * 3; // 9 to 21

    // Outer pulse ring (larger, translucent)
    traces.push({
      type: 'scattergeo',
      lat: [coord.lat],
      lon: [coord.lon],
      hoverinfo: 'skip',
      marker: {
        size: threatSize + 12,
        color: color,
        opacity: 0.15,
        line: { width: 0 }
      },
      showlegend: false
    });

    // Mid ring
    traces.push({
      type: 'scattergeo',
      lat: [coord.lat],
      lon: [coord.lon],
      hoverinfo: 'skip',
      marker: {
        size: threatSize + 6,
        color: color,
        opacity: 0.25,
        line: { width: 0 }
      },
      showlegend: false
    });

    // Core dot
    traces.push({
      type: 'scattergeo',
      lat: [coord.lat],
      lon: [coord.lon],
      text: [(() => {
        const shortTldr = (c.tldr || '').length > 100 ? (c.tldr || '').substring(0, 100) + '...' : (c.tldr || '');
        return `<b>${c.country}</b>  [${c.threat_label || ''}]<br>` +
               `${c.headline || ''}<br>` +
               `<span style="color:#7d829a">${shortTldr}</span><br>` +
               `<span style="color:#464c66">Click for full report</span>`;
      })()],
      customdata: [c.iso_code],
      hoverinfo: 'text',
      hoverlabel: {
        bgcolor: '#171b2a',
        bordercolor: color,
        font: { family: 'Inter, sans-serif', size: 12, color: '#e4e6ed' },
        align: 'left',
        namelength: -1
      },
      marker: {
        size: threatSize,
        color: c.threat_level >= 5 ? threatColors[5] : color,
        opacity: 0.9,
        line: { color: '#fff', width: 1.5 },
        symbol: 'circle'
      },
      showlegend: false
    });
  });

  const layout = {
    geo: {
      showframe: false,
      showcoastlines: true,
      coastlinecolor: '#252a3d',
      showland: true,
      landcolor: '#111420',
      showocean: true,
      oceancolor: '#0a0c12',
      showlakes: true,
      lakecolor: '#0a0c12',
      showcountries: true,
      countrycolor: '#1a1f30',
      countrywidth: 0.5,
      projection: { type: 'natural earth' },
      bgcolor: '#0a0c12',
      lonaxis: { range: [-130, 160] },
      lataxis: { range: [-40, 72] }
    },
    paper_bgcolor: '#0a0c12',
    plot_bgcolor: '#0a0c12',
    margin: { t: 0, b: 0, l: 20, r: 0 },
    dragmode: 'pan',
    hovermode: 'closest',
    hoverlabel: {
      font: { family: 'Inter, sans-serif', size: 12 }
    }
  };

  const config = {
    displayModeBar: true,
    modeBarButtonsToRemove: ['toImage', 'lasso2d', 'select2d'],
    displaylogo: false,
    scrollZoom: true,
    responsive: true
  };

  Plotly.newPlot('plotly-map', traces, layout, config).then(() => {
    // Remove clip-path from hover layer to prevent tooltip clipping
    const svgs = document.querySelectorAll('#plotly-map .main-svg');
    svgs.forEach(svg => {
      svg.style.overflow = 'visible';
      // Remove clip-path from geo container elements
      const geos = svg.querySelectorAll('.geo, .geolayer, .layer');
      geos.forEach(g => {
        g.style.overflow = 'visible';
        g.removeAttribute('clip-path');
      });
    });
    // Ensure the hover layer itself is never clipped
    const hoverLayers = document.querySelectorAll('#plotly-map .hoverlayer');
    hoverLayers.forEach(hl => {
      hl.style.overflow = 'visible';
      hl.removeAttribute('clip-path');
      let parent = hl.parentElement;
      while (parent && parent.id !== 'plotly-map') {
        parent.style.overflow = 'visible';
        parent.removeAttribute('clip-path');
        parent = parent.parentElement;
      }
    });
  });

  document.getElementById('plotly-map').on('plotly_click', function(data) {
    if (data.points && data.points[0] && data.points[0].customdata) {
      const iso = data.points[0].customdata;
      const country = conflictData.find(c => c.iso_code === iso);
      if (country) openDetail(country);
    }
  });
}


// ════════════════════════════════════════════
// CARDS
// ════════════════════════════════════════════

function getFilteredSorted() {
  let arr = currentFilter === 'all'
    ? [...conflictData]
    : conflictData.filter(c => c.theater === currentFilter);

  if (currentSort === 'threat') {
    arr.sort((a, b) => (b.threat_level || 0) - (a.threat_level || 0));
  } else if (currentSort === 'alpha') {
    arr.sort((a, b) => a.country.localeCompare(b.country));
  } else if (currentSort === 'theater') {
    const order = ['Middle East', 'Eastern Europe', 'Indo-Pacific', 'Africa & Americas'];
    arr.sort((a, b) => order.indexOf(a.theater) - order.indexOf(b.theater));
  }

  return arr;
}

function renderCards() {
  const container = document.getElementById('sidebar-content');
  const items = getFilteredSorted();

  container.innerHTML = items.map((c, i) => {
    const threatColor = threatColors[c.threat_level] || '#888';
    const theaterColor = theaterColors[c.theater] || '#888';

    // Threat dots
    let dots = '';
    for (let j = 1; j <= 5; j++) {
      const active = j <= (c.threat_level || 0);
      const col = active ? threatColor : 'var(--color-surface-3)';
      dots += `<span style="background:${col}"></span>`;
    }

    return `
      <div class="country-card" data-iso="${c.iso_code}" onclick="openDetail(conflictData.find(d => d.iso_code === '${c.iso_code}'))" style="animation-delay:${i * 40}ms">
        <div class="card-top-row">
          <span class="card-country-name">${c.country}</span>
          <span class="card-threat-badge" data-level="${c.threat_level}">
            <span class="card-threat-dots">${dots}</span>
            ${c.threat_label || 'N/A'}
          </span>
        </div>
        <div class="card-headline">${c.headline || ''}</div>
        <div class="card-tldr">${c.tldr || ''}</div>
        <div class="card-footer">
          <span class="card-theater-tag" style="background:${theaterColor}">${c.theater}</span>
          <span class="card-expand-hint">
            Tap for full report
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 4l4 4-4 4"/></svg>
          </span>
        </div>
      </div>
    `;
  }).join('');
}


// ════════════════════════════════════════════
// FILTERING & SORTING
// ════════════════════════════════════════════

function filterTheater(theater) {
  currentFilter = theater;

  document.querySelectorAll('.filter-chip').forEach(chip => {
    const t = chip.dataset.theater;
    chip.classList.toggle('active', t === theater || (theater === 'all' && t === 'all'));
  });

  renderCards();

  const regions = {
    'Middle East':       { lon: [20, 70], lat: [10, 45] },
    'Eastern Europe':    { lon: [20, 60], lat: [40, 65] },
    'Indo-Pacific':      { lon: [90, 145], lat: [15, 50] },
    'Africa & Americas': { lon: [-85, 50], lat: [-15, 25] },
    'all':               { lon: [-130, 160], lat: [-40, 72] }
  };

  const r = regions[theater] || regions['all'];
  Plotly.relayout('plotly-map', {
    'geo.lonaxis.range': r.lon,
    'geo.lataxis.range': r.lat
  });
}

function sortCards(by) {
  currentSort = by;
  document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.sort === by);
  });
  renderCards();
}


// ════════════════════════════════════════════
// DETAIL PANEL (fixed overflow)
// ════════════════════════════════════════════

function openDetail(country) {
  if (!country) return;

  const threatColor = threatColors[country.threat_level] || '#888';
  const theaterColor = theaterColors[country.theater] || '#888';

  document.getElementById('detail-country').textContent = country.country;

  const badge = document.getElementById('detail-theater-badge');
  badge.textContent = country.theater;
  badge.style.background = theaterColor;

  // Threat bar
  const pct = ((country.threat_level || 3) / 5) * 100;
  const fill = document.getElementById('detail-threat-fill');
  fill.style.width = pct + '%';
  fill.style.background = threatColor;

  const threatLabel = document.getElementById('detail-threat-label');
  threatLabel.textContent = country.threat_label || threatLabels[country.threat_level] || '';
  threatLabel.style.color = threatColor;

  // Content
  document.getElementById('detail-headline').textContent = country.headline || '';
  document.getElementById('detail-tldr').textContent = country.tldr || '';
  document.getElementById('detail-alliances').textContent = country.alliances_short || '';
  document.getElementById('detail-forecast').textContent = country.forecast || country.next_actions || '';

  // Deep dive
  document.getElementById('detail-full-events').textContent = country.current_events || '';
  document.getElementById('detail-full-alliances').textContent = country.alliances || '';
  document.getElementById('detail-full-next').textContent = country.next_actions || '';

  // Render new sections
  renderLeaders(country.iso_code);
  renderTimeline(country.theater);
  renderImpact(country.iso_code);

  // Open
  document.getElementById('detail-panel').classList.add('open');
  document.getElementById('backdrop').classList.add('open');

  // Close any open deep-dive
  const dd = document.querySelector('.deep-dive');
  if (dd) dd.removeAttribute('open');

  // Highlight card
  document.querySelectorAll('.country-card').forEach(card => {
    card.classList.toggle('active', card.dataset.iso === country.iso_code);
  });

  // Scroll detail body to top
  const detailInner = document.querySelector('.detail-inner');
  if (detailInner) detailInner.scrollTop = 0;
}

function closeDetail() {
  document.getElementById('detail-panel').classList.remove('open');
  document.getElementById('backdrop').classList.remove('open');
  document.querySelectorAll('.country-card').forEach(card => card.classList.remove('active'));
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeDetail();
});


// ════════════════════════════════════════════
// REFRESH
// ════════════════════════════════════════════

// No client-side refresh — data is updated externally and site redeployed


// Pulse animation is handled via CSS on the map overlay layer (no JS restyle needed)


// ════════════════════════════════════════════
// LEADERS
// ════════════════════════════════════════════

function getInitials(name) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

function getDomesticEmoji(level) {
  if (level === 'Popular') return '\uD83D\uDC4D';
  if (level === 'Unpopular') return '\uD83D\uDC4E';
  return '\uD83D\uDC4D\uD83D\uDC4E'; // Divisive
}

function renderLeaders(iso) {
  const container = document.getElementById('detail-leaders');
  const section = document.getElementById('detail-leaders-section');
  const leaders = leadersData[iso];

  if (!leaders || leaders.length === 0) {
    section.classList.add('hidden');
    return;
  }

  section.classList.remove('hidden');

  container.innerHTML = leaders.map((l, i) => {
    const initials = getInitials(l.name);
    const domesticEmoji = getDomesticEmoji(l.domestic);
    const roleLabel = l.role.charAt(0).toUpperCase() + l.role.slice(1);
    const shortTagline = l.tagline.length > 100 ? l.tagline.substring(0, 100) + '...' : l.tagline;

    return `
      <div class="leader-card" data-leader-index="${i}" onclick="toggleLeaderDossier(this)">
        <div class="leader-compact">
          <div class="leader-avatar" data-role="${l.role}">${initials}</div>
          <div class="leader-info">
            <div class="leader-name-row">
              <span class="leader-name">${l.name}</span>
            </div>
            <div class="leader-title">${l.title}</div>
            <div class="leader-tagline">${shortTagline}</div>
          </div>
        </div>
        <div class="leader-badges">
          <span class="leader-badge">${domesticEmoji} ${l.domestic}</span>
          <span class="leader-badge">${l.global}</span>
          <span class="leader-role-badge" data-role="${l.role}" onclick="event.stopPropagation()">${roleLabel}<span class="role-tooltip">${roleDefinitions[l.role] || ''}</span></span>
        </div>
        <div class="leader-dossier">
          <div class="dossier-bio">${l.bio}</div>
          <div class="dossier-detail-label">Domestic Standing</div>
          <div class="dossier-detail-text">${l.domestic_detail}</div>
          <div class="dossier-detail-label">Global Perception</div>
          <div class="dossier-detail-text">${l.global_detail}</div>
        </div>
      </div>
    `;
  }).join('');
}

function toggleLeaderDossier(el) {
  el.classList.toggle('expanded');
}

function toggleTimeline(el) {
  el.classList.toggle('expanded');
}


// ════════════════════════════════════════════
// TIMELINE
// ════════════════════════════════════════════

function renderTimeline(theater) {
  const container = document.getElementById('detail-timeline');
  const section = document.getElementById('detail-timeline-section');
  const events = timelinesData[theater];

  if (!events || events.length === 0) {
    section.classList.add('hidden');
    return;
  }

  section.classList.remove('hidden');

  // Events are already in chronological order (oldest first), most recent at bottom
  container.innerHTML = events.map(ev => `
    <div class="timeline-event" onclick="toggleTimeline(this)">
      <span class="timeline-date">${ev.date}</span>
      <div class="timeline-title">${ev.event}</div>
      <div class="timeline-detail">${ev.detail}</div>
      <div class="timeline-expand-hint">Tap to read more</div>
    </div>
  `).join('');
}


// ════════════════════════════════════════════
// IMPACT
// ════════════════════════════════════════════

const impactIcons = {
  gas: '\u26FD',
  travel: '\u2708\uFE0F',
  shipping: '\uD83D\uDEA2',
  food: '\uD83C\uDF3E',
  trade: '\uD83D\uDCC8',
  security: '\uD83D\uDEE1\uFE0F',
  humanitarian: '\u2764\uFE0F'
};

function renderImpact(iso) {
  const section = document.getElementById('detail-impact-section');
  const iconEl = document.getElementById('impact-icon');
  const listEl = document.getElementById('detail-impacts');
  const data = impactData[iso];

  if (!data) {
    section.classList.add('hidden');
    return;
  }

  section.classList.remove('hidden');
  iconEl.textContent = impactIcons[data.icon] || '\u26A0\uFE0F';
  listEl.innerHTML = data.impacts.map(text => `<li>${text}</li>`).join('');
}


// ════════════════════════════════════════════
// CONNECTIONS
// ════════════════════════════════════════════

function getCountryName(iso) {
  const c = conflictData.find(d => d.iso_code === iso);
  return c ? c.country : iso;
}

function renderConnections() {
  const container = document.getElementById('connections-content');
  if (!connectionsData || connectionsData.length === 0) {
    container.innerHTML = '<div style="padding:var(--space-4);color:var(--color-text-faint);font-size:var(--text-xs);text-align:center;">No connections data available.</div>';
    return;
  }

  container.innerHTML = connectionsData.map((conn, i) => {
    const fromName = getCountryName(conn.from);
    const toName = getCountryName(conn.to);
    const typeLabel = conn.type.charAt(0).toUpperCase() + conn.type.slice(1);

    return `
      <div class="connection-card" data-from="${conn.from}" data-to="${conn.to}" onclick="highlightConnection('${conn.from}','${conn.to}')">
        <div class="connection-route">
          <span>${fromName}</span>
          <span class="connection-arrow">\u2192</span>
          <span>${toName}</span>
          <span class="connection-type-badge" data-type="${conn.type}">${typeLabel}</span>
        </div>
        <div class="connection-label">${conn.label}</div>
      </div>
    `;
  }).join('');
}

function highlightConnection(fromIso, toIso) {
  // Highlight both country cards in the intel feed
  document.querySelectorAll('.country-card').forEach(card => {
    const iso = card.dataset.iso;
    card.classList.toggle('active', iso === fromIso || iso === toIso);
  });
}


// ════════════════════════════════════════════
// SIDEBAR TAB SWITCHING
// ════════════════════════════════════════════

function switchSidebarTab(tab) {
  currentSidebarTab = tab;

  // Update tab buttons
  document.querySelectorAll('.sidebar-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });

  // Toggle content areas
  const intelContent = document.getElementById('sidebar-content');
  const connectionsContent = document.getElementById('connections-content');
  const intelTitle = document.getElementById('intel-title-row');
  const intelFilters = document.getElementById('intel-filters');
  const intelSort = document.getElementById('intel-sort');

  if (tab === 'intel') {
    intelContent.classList.remove('hidden');
    connectionsContent.classList.add('hidden');
    intelTitle.classList.remove('hidden');
    intelFilters.classList.remove('hidden');
    intelSort.classList.remove('hidden');
  } else {
    intelContent.classList.add('hidden');
    connectionsContent.classList.remove('hidden');
    intelTitle.classList.add('hidden');
    intelFilters.classList.add('hidden');
    intelSort.classList.add('hidden');
  }
}


// ════════════════════════════════════════════
// BOOT
// ════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  init();
});
