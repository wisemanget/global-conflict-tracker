import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const conflictPath = resolve(root, "public/conflict_data.json");

const GDELT_ENDPOINT = "https://api.gdeltproject.org/api/v2/doc/doc";
const REQUEST_TIMEOUT_MS = 20000;
const REQUEST_GAP_MS = 2500;
const MAX_RETRIES = 4;

const countryConfigs = {
  USA: {
    gdeltQuery: '("United States" OR Washington OR Pentagon) AND (Iran OR Israel OR "Persian Gulf" OR Hormuz OR "Red Sea")',
  },
  ISR: {
    gdeltQuery: '(Israel OR Israeli) AND (Iran OR Hezbollah OR Lebanon OR Gaza)',
  },
  IRN: {
    gdeltQuery: '(Iran OR Iranian) AND (Israel OR Hormuz OR sanctions OR drone OR missile)',
  },
  SAU: {
    gdeltQuery: '("Saudi Arabia" OR Riyadh) AND (Iran OR Yemen OR Houthis OR oil OR missile)',
  },
  LBN: {
    gdeltQuery: '(Lebanon OR Lebanese) AND (Israel OR Hezbollah OR displacement OR strike)',
  },
  YEM: {
    gdeltQuery: '(Yemen OR Houthi OR Houthis) AND ("Red Sea" OR shipping OR missile OR strike)',
  },
  RUS: {
    gdeltQuery: '(Russia OR Russian OR Kremlin) AND (Ukraine OR ceasefire OR missile OR drone)',
  },
  UKR: {
    gdeltQuery: '(Ukraine OR Ukrainian OR Kyiv) AND (Russia OR ceasefire OR missile OR drone)',
  },
  CHN: {
    gdeltQuery: '(China OR Chinese OR Beijing) AND (Taiwan OR PLA OR "South China Sea")',
  },
  TWN: {
    gdeltQuery: '(Taiwan OR Taipei) AND (China OR PLA OR incursion OR drills)',
  },
  PRK: {
    gdeltQuery: '("North Korea" OR Pyongyang OR DPRK) AND (missile OR naval OR test OR South Korea)',
  },
  SDN: {
    gdeltQuery: '(Sudan OR Darfur OR RSF OR "Rapid Support Forces") AND (displacement OR attack OR famine)',
  },
  COD: {
    gdeltQuery: '("Democratic Republic of the Congo" OR Congo OR M23 OR Goma) AND (clash OR displacement OR ceasefire)',
  },
  VEN: {
    gdeltQuery: '(Venezuela OR Caracas) AND (election OR transition OR sanctions OR opposition)',
  },
  HTI: {
    gdeltQuery: '(Haiti OR Haitian OR "Port-au-Prince") AND (gang OR election OR violence OR displacement)',
  },
};

const escalationKeywords = [
  "attack",
  "bomb",
  "barrage",
  "clash",
  "crisis",
  "deadly",
  "drone",
  "escalat",
  "fire",
  "incursion",
  "missile",
  "offensive",
  "sanction",
  "strike",
  "threat",
  "violence",
  "war",
];

const improvementKeywords = [
  "aid",
  "ceasefire",
  "deal",
  "election",
  "negotiat",
  "pause",
  "release",
  "relief",
  "resume",
  "talk",
  "transition",
  "truce",
];

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fetchWithTimeout(url, options = {}) {
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          Accept: "application/json",
          "User-Agent": "global-conflict-tracker/1.0",
          ...(options.headers || {}),
        },
        signal: controller.signal,
      });

      if (response.status === 429) {
        const retryAfterHeader = response.headers.get("retry-after");
        const retryAfterSeconds = Number.parseInt(retryAfterHeader || "", 10);
        const delayMs = Number.isFinite(retryAfterSeconds)
          ? retryAfterSeconds * 1000
          : REQUEST_GAP_MS * (attempt + 2);

        attempt += 1;
        if (attempt >= MAX_RETRIES) {
          throw new Error(`${response.status} ${response.statusText}`);
        }

        await sleep(delayMs);
        continue;
      }

      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }

      return response.json();
    } finally {
      clearTimeout(timer);
    }
  }

  throw new Error("Request failed after retries");
}

function titleCaseProvider(value) {
  if (!value) {
    return "Unknown source";
  }

  return value
    .split(/[.\s-]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function formatSourceDate(value) {
  if (!value) {
    return "Recent";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function sentenceCase(value) {
  if (!value) {
    return "";
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function truncate(value, maxLength) {
  if (!value || value.length <= maxLength) {
    return value || "";
  }

  return `${value.slice(0, maxLength - 3).trimEnd()}...`;
}

function parseTimestamp(value) {
  if (!value || typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  const nativeTimestamp = Date.parse(trimmed);
  if (!Number.isNaN(nativeTimestamp)) {
    return nativeTimestamp;
  }

  const gdeltMatch = trimmed.match(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?$/,
  );

  if (gdeltMatch) {
    const [, year, month, day, hour, minute, second] = gdeltMatch;
    return Date.UTC(
      Number.parseInt(year, 10),
      Number.parseInt(month, 10) - 1,
      Number.parseInt(day, 10),
      Number.parseInt(hour, 10),
      Number.parseInt(minute, 10),
      Number.parseInt(second, 10),
    );
  }

  return null;
}

function cleanHeadline(value) {
  return truncate((value || "").replace(/\s+/g, " ").trim(), 140);
}

function describeSource(source) {
  return `${source.providerLabel} on ${formatSourceDate(source.publishedAt)}: ${source.title}`;
}

function computeKeywordBalance(sources) {
  return sources.reduce(
    (score, source) => {
      const haystack = `${source.title} ${source.summary}`.toLowerCase();

      for (const keyword of escalationKeywords) {
        if (haystack.includes(keyword)) {
          score.escalation += 1;
        }
      }

      for (const keyword of improvementKeywords) {
        if (haystack.includes(keyword)) {
          score.improvement += 1;
        }
      }

      return score;
    },
    { escalation: 0, improvement: 0 },
  );
}

function deriveChangeStatus(conflict, sources) {
  const balance = computeKeywordBalance(sources);

  if (balance.escalation >= balance.improvement + 2) {
    return "escalated";
  }

  if (balance.improvement >= balance.escalation + 2) {
    return "improving";
  }

  if (sources.length >= 3) {
    return "watch";
  }

  return conflict.change_status || "holding";
}

function buildTldr(conflict, sources) {
  const [first, second] = sources;
  if (!first) {
    return conflict.tldr;
  }

  const lead = `Latest reporting on ${conflict.country} is centered on "${truncate(first.title, 110)}."`;
  if (!second) {
    return truncate(lead, 200);
  }

  return truncate(`${lead} A second fresh signal highlights "${truncate(second.title, 90)}."`, 220);
}

function buildCurrentEvents(conflict, sources) {
  if (!sources.length) {
    return conflict.current_events;
  }

  const fragments = sources.slice(0, 3).map((source) => describeSource(source));
  return truncate(
    `Fresh source monitoring for ${conflict.country} points to ${fragments.join("; ")}.`,
    650,
  );
}

function buildChangeSummary(conflict, sources, changeStatus) {
  if (!sources.length) {
    return conflict.change_summary || [];
  }

  const [first, second] = sources;
  const summary = [
    `${sentenceCase(changeStatus)} signal: ${truncate(first.title, 115)}.`,
  ];

  if (second) {
    summary.push(`Also worth watching: ${truncate(second.title, 115)}.`);
  }

  return summary;
}

function normalizeGdeltArticle(article) {
  const title = cleanHeadline(article?.title);
  const url = article?.url;
  if (!title || !url) {
    return null;
  }

  const provider = article?.domain || article?.sourcecountry || "GDELT";
  const publishedAt = article?.seendate || article?.published || null;
  const parsedTimestamp = parseTimestamp(publishedAt);

  return {
    provider: "gdelt",
    providerLabel: titleCaseProvider(provider),
    publishedAt: parsedTimestamp ? new Date(parsedTimestamp).toISOString() : null,
    title,
    summary: article?.snippet || "",
    url,
    label: `${titleCaseProvider(provider)}, ${formatSourceDate(parsedTimestamp ? new Date(parsedTimestamp).toISOString() : null)}: ${title}`,
  };
}

function dedupeSources(sources) {
  const seen = new Set();
  return sources.filter((source) => {
    if (!source?.url || seen.has(source.url)) {
      return false;
    }

    seen.add(source.url);
    return true;
  });
}

function sortSourcesByDate(sources) {
  return [...sources].sort((left, right) => {
    const leftTime = parseTimestamp(left.publishedAt) || 0;
    const rightTime = parseTimestamp(right.publishedAt) || 0;
    return rightTime - leftTime;
  });
}

async function fetchGdeltSources(query) {
  const params = new URLSearchParams({
    query,
    mode: "artlist",
    format: "json",
    maxrecords: "6",
    sort: "datedesc",
    timespan: "7d",
  });

  const data = await fetchWithTimeout(`${GDELT_ENDPOINT}?${params.toString()}`);
  const articles = Array.isArray(data?.articles) ? data.articles : [];
  return articles.map(normalizeGdeltArticle).filter(Boolean);
}

function determineLatestTimestamp(conflict, sources) {
  const timestamps = sources
    .map((source) => parseTimestamp(source.publishedAt))
    .filter((value) => value !== null);

  if (!timestamps.length) {
    return conflict.last_updated;
  }

  return new Date(Math.max(...timestamps)).toISOString();
}

function createFallbackConfig(conflict) {
  return {
    gdeltQuery: `("${conflict.country}" OR ${conflict.iso_code}) AND (conflict OR security OR humanitarian OR military)`,
  };
}

async function refreshConflict(conflict) {
  const config = countryConfigs[conflict.iso_code] || createFallbackConfig(conflict);

  const gdeltSources = await Promise.allSettled([fetchGdeltSources(config.gdeltQuery)]);
  const gdeltResult = gdeltSources[0];

  const providerResults = {
    gdelt: {
      ok: gdeltResult.status === "fulfilled",
      error: gdeltResult.status === "rejected" ? gdeltResult.reason?.message || String(gdeltResult.reason) : "",
    },
  };

  const combinedSources = dedupeSources(
    gdeltResult.status === "fulfilled" ? gdeltResult.value : [],
  );

  const liveSources = sortSourcesByDate(combinedSources).slice(0, 4);
  if (!liveSources.length) {
    return {
      conflict,
      updated: false,
      providerResults,
      sourceCount: 0,
    };
  }

  const nextChangeStatus = deriveChangeStatus(conflict, liveSources);

  return {
    conflict: {
      ...conflict,
      headline: liveSources[0]?.title || conflict.headline,
      tldr: buildTldr(conflict, liveSources),
      current_events: buildCurrentEvents(conflict, liveSources),
      change_status: nextChangeStatus,
      change_summary: buildChangeSummary(conflict, liveSources, nextChangeStatus),
      last_updated: determineLatestTimestamp(conflict, liveSources),
      sources: liveSources.map((source) => ({
        label: source.label,
        url: source.url,
      })),
    },
    updated: true,
    providerResults,
    sourceCount: liveSources.length,
  };
}

async function main() {
  const conflictData = readJson(conflictPath);

  if (!Array.isArray(conflictData) || !conflictData.length) {
    throw new Error("public/conflict_data.json is empty or invalid.");
  }

  const refreshed = [];
  const stats = {
    conflictsUpdated: 0,
    totalSourcesCollected: 0,
    gdeltSuccesses: 0,
    gdeltFailures: 0,
  };

  const errors = [];
  for (const conflict of conflictData) {
    if (refreshed.length > 0) {
      await sleep(REQUEST_GAP_MS);
    }

    const result = await refreshConflict(conflict);
    refreshed.push(result.conflict);
    stats.conflictsUpdated += result.updated ? 1 : 0;
    stats.totalSourcesCollected += result.sourceCount;

    if (result.providerResults.gdelt.ok) {
      stats.gdeltSuccesses += 1;
    } else if (result.providerResults.gdelt.error) {
      stats.gdeltFailures += 1;
      errors.push(`[${conflict.iso_code}] GDELT: ${result.providerResults.gdelt.error}`);
    }

  }

  if (stats.gdeltSuccesses === 0) {
    throw new Error(`No live source providers succeeded.\n${errors.join("\n")}`);
  }

  if (stats.totalSourcesCollected === 0) {
    throw new Error("Live refresh completed but returned zero source entries.");
  }

  const currentSerialized = JSON.stringify(conflictData);
  const refreshedSerialized = JSON.stringify(refreshed);

  if (currentSerialized !== refreshedSerialized) {
    writeJson(conflictPath, refreshed);
  }

  const refreshedAt = refreshed
    .map((conflict) => conflict.last_updated)
    .filter(Boolean)
    .sort()
    .at(-1);

  console.log(
    `Refreshed ${refreshed.length} conflicts using GDELT live source pulls. Updated ${stats.conflictsUpdated} conflicts with ${stats.totalSourcesCollected} live source entries. Latest source timestamp: ${refreshedAt || "unknown"}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
