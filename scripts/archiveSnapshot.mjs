import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const conflictPath = resolve(root, "public/conflict_data.json");
const timelinesPath = resolve(root, "public/timelines_data.json");
const historyPath = resolve(root, "public/history_snapshots.json");

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const readJsonArray = (path) => {
  if (!existsSync(path)) {
    return [];
  }

  const value = readJson(path);
  return Array.isArray(value) ? value : [];
};

const conflictData = readJson(conflictPath);
const timelinesData = readJson(timelinesPath);
const historySnapshots = readJsonArray(historyPath);

if (!Array.isArray(conflictData) || conflictData.length === 0) {
  throw new Error("public/conflict_data.json is empty or invalid.");
}

const capturedAt = conflictData[0]?.last_updated;

if (!capturedAt) {
  throw new Error("Current conflict data is missing last_updated.");
}

if (historySnapshots.some((snapshot) => snapshot.captured_at === capturedAt)) {
  console.log(`Archive already contains snapshot for ${capturedAt}`);
  process.exit(0);
}

const monthLabel = new Date(capturedAt).toLocaleString("en-US", {
  month: "short",
  year: "numeric",
});
const dayLabel = new Date(capturedAt).toLocaleString("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const storyThreads = [...conflictData]
  .sort((left, right) => (left.story_rank ?? Number.MAX_SAFE_INTEGER) - (right.story_rank ?? Number.MAX_SAFE_INTEGER))
  .slice(0, 3)
  .map((conflict) => ({
    iso: conflict.iso_code,
    country: conflict.country,
    headline: conflict.headline,
    note: conflict.briefing_note || conflict.tldr,
    change_status: conflict.change_status || "holding",
  }));

const topItems = [
  ...storyThreads.map((thread) => thread.note).filter(Boolean),
  ...conflictData.flatMap((conflict) => conflict.change_summary || []),
].slice(0, 3);

const theaterThreat = new Map();
for (const conflict of conflictData) {
  const current = theaterThreat.get(conflict.theater) || { score: 0, count: 0 };
  current.score += conflict.threat_level || 0;
  current.count += 1;
  theaterThreat.set(conflict.theater, current);
}

const dominantTheater =
  [...theaterThreat.entries()]
    .sort((left, right) => right[1].score / right[1].count - left[1].score / left[1].count)[0]?.[0] ||
  "Middle East";

const averageThreat =
  conflictData.reduce((sum, conflict) => sum + (conflict.threat_level || 3), 0) / conflictData.length;
const maxThreat = Math.max(...conflictData.map((conflict) => conflict.threat_level || 3));
const globalThreatValue = maxThreat >= 5 ? 5 : maxThreat >= 4 ? 4 : Math.max(1, Math.round(averageThreat));
const globalThreatLabel =
  globalThreatValue >= 5 ? "CRITICAL" : globalThreatValue >= 4 ? "HIGH" : globalThreatValue >= 3 ? "ELEVATED" : "GUARDED";

const currentLead = storyThreads[0];

const timelineCounts = Object.fromEntries(
  Object.entries(timelinesData).map(([theater, events]) => [theater, Array.isArray(events) ? events.length : 0]),
);

const snapshot = {
  id: new Date(capturedAt).toISOString().slice(0, 10),
  label: monthLabel,
  date_range: dayLabel,
  captured_at: capturedAt,
  headline: currentLead?.headline || "Current world briefing snapshot",
  summary:
    currentLead?.note ||
    "A new archived briefing snapshot was generated from the latest live conflict data.",
  global_threat_label: globalThreatLabel,
  global_threat_value: globalThreatValue,
  dominant_theater: dominantTheater,
  top_items:
    topItems.length === 3
      ? topItems
      : [
          currentLead?.note || "The latest refresh has been archived.",
          "This snapshot was generated automatically from the current live data.",
          "Open replay mode to compare this archive point with earlier briefing states.",
        ],
  story_threads: storyThreads,
  timeline_counts: timelineCounts,
};

historySnapshots.push(snapshot);
historySnapshots.sort((left, right) => new Date(left.captured_at).getTime() - new Date(right.captured_at).getTime());

writeFileSync(historyPath, `${JSON.stringify(historySnapshots, null, 2)}\n`);

console.log(`Archived snapshot for ${capturedAt}`);
