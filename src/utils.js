export function fetchJson(path) {
  return fetch(path).then((response) => {
    if (!response.ok) {
      throw new Error(`Failed to load ${path}`);
    }

    return response.json();
  });
}

export function getInitials(name) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  return name.substring(0, 2).toUpperCase();
}

export function getDomesticEmoji(level) {
  if (level === "Popular") return "\uD83D\uDC4D";
  if (level === "Unpopular") return "\uD83D\uDC4E";
  return "\uD83D\uDC4D\uD83D\uDC4E";
}

export const changeStatusMeta = {
  escalated: { label: "Escalated", className: "escalated" },
  holding: { label: "Holding", className: "holding" },
  watch: { label: "Watchlist", className: "watch" },
  improving: { label: "Improving", className: "improving" },
};

export function getChangeMeta(status) {
  return changeStatusMeta[status] || { label: "Updated", className: "holding" };
}

export function formatTimestamp(value) {
  if (!value) {
    return "--";
  }

  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function truncateText(value, maxLength = 120) {
  if (!value) {
    return "";
  }

  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trimEnd()}...`;
}
