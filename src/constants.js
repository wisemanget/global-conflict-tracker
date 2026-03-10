export const theaterColors = {
  "Middle East": "#ff5c5c",
  "Eastern Europe": "#4da6ff",
  "Indo-Pacific": "#ffb340",
  "Africa & Americas": "#3dd98a",
};

export const threatColors = {
  5: "#ff3b3b",
  4: "#ff8c42",
  3: "#ffd23f",
  2: "#3dd98a",
  1: "#4da6ff",
};

export const threatLabels = {
  5: "CRITICAL",
  4: "HIGH",
  3: "ELEVATED",
  2: "GUARDED",
  1: "LOW",
};

export const roleDefinitions = {
  hawk: "Favors aggressive or military-first approaches to conflict and national security.",
  diplomat: "Prioritizes negotiation, alliances, and multilateral solutions over force.",
  wildcard: "Unpredictable decision-maker whose actions often defy conventional expectations.",
  strongman: "Consolidates personal power through authoritarian control and suppression of dissent.",
  reformer: "Pushes for systemic change, modernization, or liberalization within their country.",
};

export const countryCoords = {
  USA: { lat: 39.8, lon: -98.5 },
  ISR: { lat: 31.0, lon: 34.8 },
  IRN: { lat: 32.4, lon: 53.7 },
  SAU: { lat: 23.9, lon: 45.1 },
  LBN: { lat: 33.9, lon: 35.9 },
  YEM: { lat: 15.6, lon: 48.5 },
  RUS: { lat: 61.5, lon: 105.3 },
  UKR: { lat: 48.4, lon: 31.2 },
  CHN: { lat: 35.9, lon: 104.2 },
  TWN: { lat: 23.7, lon: 121.0 },
  PRK: { lat: 40.3, lon: 127.5 },
  SDN: { lat: 12.9, lon: 30.2 },
  COD: { lat: -4.0, lon: 21.8 },
  VEN: { lat: 6.4, lon: -66.6 },
  HTI: { lat: 19.1, lon: -72.3 },
};

export const theaterISO = {
  "Middle East": ["USA", "ISR", "IRN", "SAU", "LBN", "YEM"],
  "Eastern Europe": ["RUS", "UKR"],
  "Indo-Pacific": ["CHN", "TWN", "PRK"],
  "Africa & Americas": ["SDN", "COD", "VEN", "HTI"],
};

export const theaterOrder = [
  "Middle East",
  "Eastern Europe",
  "Indo-Pacific",
  "Africa & Americas",
];

export const regions = {
  "Middle East": { lon: [20, 70], lat: [10, 45] },
  "Eastern Europe": { lon: [20, 60], lat: [40, 65] },
  "Indo-Pacific": { lon: [90, 145], lat: [15, 50] },
  "Africa & Americas": { lon: [-85, 50], lat: [-15, 25] },
  all: { lon: [-130, 160], lat: [-40, 72] },
};

export const impactIcons = {
  gas: "\u26FD",
  travel: "\u2708\uFE0F",
  shipping: "\uD83D\uDEA2",
  food: "\uD83C\uDF3E",
  trade: "\uD83D\uDCC8",
  security: "\uD83D\uDEE1\uFE0F",
  humanitarian: "\u2764\uFE0F",
};
