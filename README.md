# Global Conflict Tracker

This app is a static Vite dashboard backed by JSON files in `public/`.

## Recent changes

- **UI simplification pass.** Pared back the busiest surfaces of the app. The
  header now collapses the active/critical stats and threat label into a
  single inline pill, with Replay tucked behind a "···" overflow menu. The
  map drops its floating "Theaters of Operation" and "Overlay Key" panels;
  theater filtering lives in the sidebar, and the overlay legend renders
  inline below the (now merged) Lens / Overlay control bar. The default
  "Most urgent" lens shows only the top 5 markers with a "+N more" hint
  near the bottom of the map. The sidebar replaced its impact-chip row and
  three sort buttons with a collapsible Filter disclosure and a single Sort
  dropdown. The lead-report button moved off the map shell into a
  prominent CTA at the top of the briefing view, and the numbered
  conflict-card rail beneath the map was removed in favor of the existing
  sidebar list.

## Live data refresh

The repository now includes a live-source refresh script:

- `npm run refresh:sources`

That script updates `public/conflict_data.json` by pulling the latest source links and timestamps from:

- GDELT DOC 2.0 for recent global reporting

### Refresh cadence

The GitHub Action in `.github/workflows/refresh-data.yml` runs every 6 hours and can also be launched manually from the Actions tab.

### Notes

- The in-app button reloads the latest published dataset; it does not call external APIs directly from the browser.
- Source-backed refresh currently updates `headline`, `tldr`, `current_events`, `sources`, `change_status`, and `last_updated` in `public/conflict_data.json`.
- The live refresh path is now approval-free and does not require any repository secrets.

### Optional in-app live refresh trigger

On Vercel, the repo now includes `api/refresh.js`, so the app can use `/api/refresh` by default.

Configure these Vercel environment variables:

- `GITHUB_ACTIONS_TOKEN`
- `ALLOWED_ORIGIN`

Optional:

- `GITHUB_REPO_OWNER`
- `GITHUB_REPO_NAME`
- `GITHUB_REFRESH_WORKFLOW`
- `GITHUB_REFRESH_COOLDOWN_MS`
- `VITE_REFRESH_ENDPOINT`

The app will `POST` to that endpoint, then poll the published dataset for a newer `last_updated` value. This backend is required because a static browser app cannot safely trigger GitHub or other refresh jobs on its own.
