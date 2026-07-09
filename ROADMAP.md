# Roadmap

Running log of what's shipped and what's queued for Weather Live, kept so
enhancement work has continuity across sessions.

## Shipped

- **Live Global Weather Pulse** — interactive Three.js globe, server-side
  severe-weather poller (batched Open-Meteo, edge-triggered alerts), room-
  targeted + global broadcast channels, alert ticker, weather-driven canvas
  particles. See README's "Live Global Weather Pulse" section.
- **7-day forecast strip** — `GET /api/weather/forecast?city=` (Open-Meteo
  `daily=` params, `timezone=auto` so each city buckets by its own local
  date), rendered as a horizontal strip under the current-conditions card.
- **Searchable city list + animated camera fly-to** — `CitySearch.tsx`
  filters the 27 cities by name; picking one (via search or the `<select>`
  fallback) animates the globe's camera around to face that city, using an
  nlerp between unit direction vectors (not a true slerp — visually
  indistinguishable at this angular scale, much simpler to get right). A
  direct marker click skips the flight since the user is already looking
  at it. Verified live: flying from an Americas-facing view to Tokyo
  correctly rotates across the whole globe and centers the right marker.
- **Procedural ambient soundscape** — `audio/soundscapeEngine.ts`: a shared
  white-noise buffer routed through per-condition filters (rain hiss, snow
  hush, storm rumble with randomized thunder bursts) plus a quiet two-
  oscillator drone underneath, gated behind an explicit mute/unmute toggle
  in the header (`SoundToggle.tsx`) since the AudioContext can only start
  unsuspended from a real user-gesture handler. Verified live: toggling on/
  off and switching cities with sound enabled both work with zero console
  errors (headless Chromium can build and run the audio graph even though
  there's no real output device to hear it through).
- **Multi-city watchlist** — replaced the single-exclusive-room model
  (`joinCity`/`leaveCity`, which force-left every other room on switch)
  with `watchCity`/`unwatchCity`: a socket can watch any number of rooms at
  once. `useWatchlist` persists the list to `localStorage`, diffs on
  add/remove, and fully re-joins on connect/reconnect. Viewing a city adds
  it to the watchlist; removing a city from the watchlist stops its alerts
  without affecting what's currently displayed. Verified live: viewing
  Melbourne then Tokyo leaves both watched, a push to Melbourne still
  toasts while Tokyo is the active view (`recipients: 1`), and after
  removing Melbourne from the watchlist the same push returns
  `recipients: 0` with no toast.
- **Persisted alert history** — `server/src/weather/alertHistory.ts` appends
  every triggered alert to `server/.data/alert-history.json` (capped at
  100), loaded back on server startup. New `GET /api/weather/alerts/history`
  endpoint; `useGlobalAlerts` seeds the ticker from it on mount and
  deduplicates against live socket events by `cityId`+`timestamp` (the
  poller persists before broadcasting, so the two can overlap). Verified
  live: temporarily lowered the heat-severe threshold, confirmed a real
  Dubai alert (38°C) got persisted, restarted the server process, confirmed
  the entry survived the restart, then loaded the app in a brand-new
  browser context that had never connected to the socket and confirmed the
  ticker showed both historical entries immediately. Reverted the
  threshold afterward.
- **Historical trend sparkline** — `GET /api/weather/history?city=` reuses
  the same daily-block parsing as `/forecast` (extracted into
  `fetchDailyBlock` to remove the duplication) with `past_days=7,
  forecast_days=1` instead of `forecast_days=7`. Rendered as a small inline
  SVG line chart (`Sparkline.tsx`, no charting library) of the past week's
  daily highs, between the current-conditions text and the forecast strip.
  Verified live: 8 data points render (7 past days + today), correct
  min/max range label, zero console errors.
- **Dark mode** — `--bg`/`--surface`/`--text`/etc. tokens in `global.css` now
  have a `:root[data-theme="dark"]` override; an inline script in
  `index.html` sets `data-theme` synchronously from `localStorage` (or
  `prefers-color-scheme` on first visit) before first paint, avoiding a
  flash of the wrong theme. `useTheme` + `ThemeToggle.tsx` (🌙/☀️, next to
  the sound toggle) let the user override and persist their choice. Bonus:
  the globe's WebGL canvas is transparent, so its surrounding panel now
  matches the dark surface instead of stark white — the night side of the
  globe reads much more naturally against a dark page. Verified live: OS
  dark preference respected with no prior localStorage, toggle flips
  `data-theme` immediately, and the choice survives a full page reload
  with no flash (checked login page too, not just the authenticated view).
- **Watched-city rings on the globe** — every watched city now gets a
  persistent static ring around its marker (distinct from the animated
  ripple and from the brighter/larger "currently selected" state), so the
  whole watchlist is visible on the globe at a glance. Caught and fixed a
  real race condition along the way: the watchlist hydrates synchronously
  from `localStorage` at mount, often before the city list (and therefore
  the markers) finishes loading async, so the first `setWatchedCities`
  call would silently find no markers to attach rings to. Fixed by keying
  the effect on `[cities, watchedCityIds]` instead of just the latter.
  Verified live: watched Melbourne, London, and Tokyo, confirmed all three
  rings render, then did a full page reload (the exact scenario the race
  condition would hit) and confirmed all three rings still appear
  correctly, zero console errors.
- **Mobile/touch verification + header fix** — OrbitControls already
  handles single-finger drag-to-rotate and pinch-to-zoom by default (mouse
  and single-touch share the same rotate code path), so there was no globe
  interaction code to write — the actual finding was a real layout bug:
  the header wrapped to two lines and broke its fixed height below ~480px
  wide, because "⛅ Weather Live" plus the connection status plus three
  header buttons don't fit on one line at phone width. Fixed with a
  `max-width: 480px` media query that shrinks the title, hides the
  connection-status text label (the color dot alone still conveys state),
  and lets the header size itself with `min-height` instead of a fixed
  `height`. Verified live on an emulated iPhone 13 viewport: no horizontal
  overflow, header back to a single 56px row, single-pointer drag actually
  rotates the globe (confirmed by comparing before/after screenshots —
  an Americas-facing view rotated to show Europe/Africa/the Middle East),
  and tap-to-select still resolves correctly alongside the drag gesture.
  Caveat: pinch-to-zoom (genuine two-finger multi-touch) wasn't
  independently verified — Playwright's mouse API only drives one pointer,
  so this relies on OrbitControls' built-in multi-touch handling rather
  than a from-scratch verification.

## Future ideas (not yet scheduled)
- Mobile layout pass dedicated to the globe (currently responsive but not
  touch-gesture-tuned)
- Deployment (not attempted without explicit user go-ahead — out of scope
  until asked)
