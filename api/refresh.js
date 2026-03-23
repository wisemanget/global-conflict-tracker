const GITHUB_API_BASE = "https://api.github.com";
const DEFAULT_REPO_OWNER = "wisemanget";
const DEFAULT_REPO_NAME = "global-conflict-tracker";
const DEFAULT_WORKFLOW_FILE = "refresh-data.yml";
const DEFAULT_COOLDOWN_MS = 15 * 60 * 1000;

function json(response, status, payload) {
  response.status(status).json(payload);
}

function getHeader(request, name) {
  const value = request.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

function getRepoConfig() {
  return {
    owner: process.env.GITHUB_REPO_OWNER || DEFAULT_REPO_OWNER,
    repo: process.env.GITHUB_REPO_NAME || DEFAULT_REPO_NAME,
    workflowFile: process.env.GITHUB_REFRESH_WORKFLOW || DEFAULT_WORKFLOW_FILE,
    token: process.env.GITHUB_ACTIONS_TOKEN || "",
    cooldownMs: Number.parseInt(process.env.GITHUB_REFRESH_COOLDOWN_MS || "", 10) || DEFAULT_COOLDOWN_MS,
    allowedOrigin: process.env.ALLOWED_ORIGIN || "",
  };
}

function isAllowedOrigin(request, allowedOrigin) {
  if (!allowedOrigin) {
    return true;
  }

  const origin = getHeader(request, "origin");
  const referer = getHeader(request, "referer");

  return origin === allowedOrigin || (referer && referer.startsWith(allowedOrigin));
}

async function githubRequest(path, token, options = {}) {
  const response = await fetch(`${GITHUB_API_BASE}${path}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "global-conflict-tracker-vercel",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(payload?.message || `${response.status} ${response.statusText}`);
  }

  return payload;
}

async function getLatestRun(config) {
  const payload = await githubRequest(
    `/repos/${config.owner}/${config.repo}/actions/workflows/${config.workflowFile}/runs?per_page=1`,
    config.token,
  );

  return Array.isArray(payload?.workflow_runs) ? payload.workflow_runs[0] || null : null;
}

async function dispatchWorkflow(config) {
  await githubRequest(
    `/repos/${config.owner}/${config.repo}/actions/workflows/${config.workflowFile}/dispatches`,
    config.token,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ref: "main",
      }),
    },
  );
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    json(response, 405, { message: "Method not allowed. Use POST." });
    return;
  }

  const config = getRepoConfig();

  if (!config.token) {
    json(response, 500, {
      message: "GITHUB_ACTIONS_TOKEN is not configured in Vercel.",
    });
    return;
  }

  if (!isAllowedOrigin(request, config.allowedOrigin)) {
    json(response, 403, {
      message: "Origin not allowed for refresh requests.",
    });
    return;
  }

  try {
    const latestRun = await getLatestRun(config);
    const latestRunCreatedAt = latestRun?.created_at ? Date.parse(latestRun.created_at) : 0;
    const latestRunAgeMs = latestRunCreatedAt ? Date.now() - latestRunCreatedAt : Number.MAX_SAFE_INTEGER;
    const latestRunActive =
      latestRun?.status === "in_progress" ||
      latestRun?.status === "queued" ||
      latestRun?.status === "waiting";

    if (latestRunActive) {
      json(response, 202, {
        message: "A refresh job is already running.",
        run_url: latestRun.html_url,
      });
      return;
    }

    if (latestRunAgeMs < config.cooldownMs) {
      json(response, 202, {
        message: "A refresh ran recently. Please give it a minute before requesting another one.",
        run_url: latestRun?.html_url || "",
      });
      return;
    }

    await dispatchWorkflow(config);

    json(response, 202, {
      message: "Live refresh requested successfully.",
      workflow: config.workflowFile,
    });
  } catch (error) {
    json(response, 500, {
      message: error.message || "Unable to trigger the refresh workflow.",
    });
  }
}
