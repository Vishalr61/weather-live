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

## Future ideas (not yet scheduled)

- Visually distinguish watched-but-not-currently-viewed cities on the
  globe (e.g. a subtle ring around their markers)
- Historical trend sparkline per city (temp over the last N days)
- Mobile layout pass dedicated to the globe (currently responsive but not
  touch-gesture-tuned)
- Deployment (not attempted without explicit user go-ahead — out of scope
  until asked)
