# Global Conflict Tracker

This app is a static Vite dashboard backed by JSON files in `public/`.

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
