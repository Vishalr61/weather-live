# Roadmap

Running log of what's shipped and what's queued for Weather Live, kept so
enhancement work has continuity across sessions.

## Shipped

- **Live Global Weather Pulse** — interactive Three.js globe, server-side
  severe-weather poller (batched Open-Meteo, edge-triggered alerts), room-
  targeted + global broadcast channels, alert ticker, weather-driven canvas
  particles. See README's "Live Global Weather Pulse" section.

## In progress / queued (this batch)

- [ ] 7-day forecast strip in the detail panel (Open-Meteo `daily=` params)
- [ ] Searchable city list + animated camera fly-to on the globe
- [ ] Procedural ambient soundscape (Web Audio API) driven by current
      condition, gated behind an explicit mute/unmute toggle (autoplay policy)

## Future ideas (not yet scheduled)

- Multi-city watchlist — subscribe to several city rooms at once with an
  aggregated feed, instead of the current single-room model
- Persist alert history (currently in-memory per browser tab only)
- Historical trend sparkline per city (temp over the last N days)
- Mobile layout pass dedicated to the globe (currently responsive but not
  touch-gesture-tuned)
- Deployment (not attempted without explicit user go-ahead — out of scope
  until asked)
