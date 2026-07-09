# Weather Live

**Live Global Weather Pulse** — an interactive 3D globe showing live conditions for 27 cities, with a server-side poller that detects severe weather in real time and pushes alerts over WebSocket rooms keyed by city. Started as a coding-challenge submission; grown into a portfolio piece.

![Weather Live](docs/screenshot.png)

## Stack

- **Client**: React 18, Vite, TypeScript, Three.js (globe)
- **Server**: Node.js, Express, Socket.IO, TypeScript, Vitest + Supertest
- **Auth**: JWT (jsonwebtoken), in-memory user store
- **Weather**: Open-Meteo API — no API key required, batched into one call per poll cycle for all 27 cities
- **Validation**: Zod on all server request bodies and query params

## Live Global Weather Pulse

There is no free, keyless, global severe-weather-alerts feed (Open-Meteo has none; NOAA is US-only; MeteoAlarm is Europe-only; OpenWeather/Xweather alerts are paid). So "real alerts" here means genuine automated detection over live data: a server-side poller (`server/src/weather/poller.ts`) fetches current conditions for all 27 cities in a single batched Open-Meteo request every `WEATHER_POLL_INTERVAL_MS` (default 5 minutes), evaluates each city against defined thresholds (`server/src/weather/alertRules.ts` — severe WMO codes, wind speed, precipitation rate, temperature extremes), and on an edge-triggered transition into `severe` fires two things:

- A room-targeted `message` event to that city's Socket.IO room — the same mechanic `POST /api/messages` always used, just triggered automatically instead of by curl.
- A global `globalAlert` broadcast to every connected client regardless of subscription, driving a ripple animation on the globe and a live ticker.

A third event, `weatherSnapshot`, broadcasts every poll cycle (not just on alerts) so the globe's city markers stay colored by current condition.

The globe (`client/src/three/globeScene.ts`) is Three.js: a textured sphere with a real-time day/night terminator computed from the actual subsolar point, camera-facing sprite markers per city, drag-to-rotate via `OrbitControls`, and click-to-select wired into the same `selectCity` flow the `<select>` dropdown uses (kept alongside the globe as the accessible/keyboard fallback — a globe click has no keyboard equivalent).

## Setup

```bash
# Terminal 1 — server
cd server && npm install && cp .env.example .env && npm run dev

# Terminal 2 — client
cd client && npm install && npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Demo credentials

`demo / demo` or `alice / alice123` — or register a new account from the login page. Registered users are in-memory like everything else here: gone on server restart.

## Try it

Log in, select **Melbourne**. In a terminal:

```bash
# Push a message to Melbourne — toast appears within ~100ms
curl -X POST http://localhost:3001/api/messages \
  -H 'Content-Type: application/json' \
  -d '{"message": "Severe storm approaching", "city": "melbourne"}'

# The exclusion test — push to a city you're not subscribed to.
# The toast should NOT appear. recipients: 0 in the response confirms
# the message went to a room with no subscribers, not broadcast-with-filter.
curl -X POST http://localhost:3001/api/messages \
  -H 'Content-Type: application/json' \
  -d '{"message": "Air quality alert", "city": "sydney"}'
```

Both responses include a `recipients` field showing how many sockets received the message.

Both `POST /api/messages` and `POST /api/weather/poll-now` share a combined rate limit of 10 requests per minute per IP — they're the two unauthenticated-by-design endpoints, so this is the abuse-prevention floor for both together. Expect a `429` if you're scripting the curl examples in a loop.

To see the automated pipeline instead of a manual push, force a poll cycle against live Open-Meteo data:

```bash
curl -X POST http://localhost:3001/api/weather/poll-now
```

If nothing crosses a threshold (likely, on any given day), temporarily lower a value in `server/src/weather/alertRules.ts`'s `THRESHOLDS` and call it again — this exercises the real detection pipeline against real data, not a fabricated event. Lowering `WEATHER_POLL_INTERVAL_MS` in `.env` (e.g. to `20000`) is the same idea for the automatic cycle.

## Architecture

Rooms are a **watchlist**, not a single "current city." When a user views a city (via the globe, search, or the `<select>` fallback), the client emits `watchCity` and the server joins that socket to a Socket.IO room keyed by the city slug (e.g. `"melbourne"`) — without leaving any rooms it already occupies. The `POST /api/messages` endpoint targets a room directly — non-subscribers never see the event.

```mermaid
sequenceDiagram
    participant A as curl / admin
    participant B as Express
    participant C as Socket.IO room "melbourne"
    participant D as Browser (watching melbourne)

    A->>B: POST /api/messages {city:"melbourne", message:"..."}
    B->>C: io.to("melbourne").emit("message", payload)
    C->>D: 'message' event (only to subscribers)
    Note over D: setState → Toast renders
```

`useWatchlist` (`client/src/hooks/useWatchlist.ts`) owns room membership: it's persisted to `localStorage`, diffed on every add/remove to emit only `watchCity`/`unwatchCity` for the actual change, and fully re-joined on the socket's `connect`/`reconnect` events so a dropped connection doesn't silently lose alert coverage for cities watched before the bounce. Removing a city from the watchlist stops its alerts but doesn't affect what's currently shown in the detail panel — viewing and watching are related (viewing adds to the watchlist) but not the same state.

### The weather poller and its two broadcast channels

`server/src/weather/poller.ts` fetches all 27 cities in one batched Open-Meteo call, evaluates each against `alertRules.ts`, and tracks per-city severity in `alertState.ts` so a broadcast only fires on the *transition* into `severe` — not on every poll while conditions stay severe. Two distinct channels come out of this, deliberately kept separate:

```mermaid
sequenceDiagram
    participant P as Poller (every 5 min)
    participant O as Open-Meteo (batched)
    participant IO as Socket.IO
    participant Sub as Browser (subscribed to that city)
    participant Any as Any connected browser

    P->>O: 1 request, 27 lat/lng pairs
    O-->>P: current conditions per city
    P->>P: evaluateAlert() + edge-trigger check
    P->>IO: io.to(cityId).emit('message', ...)
    IO->>Sub: toast (room-targeted — same mechanic as POST /api/messages)
    P->>IO: io.emit('globalAlert', ...)
    IO->>Any: globe ripple + ticker (broadcast — regardless of subscription)
```

A third event, `weatherSnapshot`, broadcasts every poll cycle (not just on alerts) so the globe's markers stay colored by current condition for every connected client.

Every triggered alert is also appended to `server/.data/alert-history.json` (capped at 100 entries) before it's broadcast, and served back via `GET /api/weather/alerts/history`. A freshly-loaded client — one that was never connected when an alert fired — hydrates its alert ticker from this endpoint on mount, deduplicating against anything that arrives live afterward by `cityId` + `timestamp`.

## Project structure

```
weather-live/
├── server/
│   ├── src/
│   │   ├── auth/          — bcrypt + JWT helpers, in-memory user store
│   │   ├── routes/        — login, weather (cities/batch/poll-now/current/forecast/
│   │   │                    history/alerts), messages (+ supertest coverage for all)
│   │   ├── socket/        — JWT handshake middleware, watch/unwatch room handlers
│   │   │                    (+ real multi-client Socket.IO integration test)
│   │   ├── middleware/    — shared per-IP rate limiter (+ tests)
│   │   ├── data/          — curated city list
│   │   ├── weather/       — poller, batched Open-Meteo client + Zod response schemas,
│   │   │                    alert rules + state, disk-persisted alert history (+ tests)
│   │   ├── types.ts       — Socket.IO event maps
│   │   └── index.ts       — Express + Socket.IO bootstrap
│   ├── vitest.config.ts / vitest.setup.ts — sets JWT_SECRET before test imports run,
│   │                                        so npm test doesn't depend on a real .env
│   ├── vitest runs *.test.ts under src/; tsconfig.build.json excludes them from dist/
│   └── .env.example
└── client/
    ├── public/textures/   — Earth day/night/normal/specular maps (MIT, three.js examples)
    ├── src/
    │   ├── pages/         — Login, Home
    │   ├── components/    — Globe, AlertTicker, WeatherParticles, ForecastStrip,
    │   │                    TrendSparkline, Sparkline, CitySearch, Watchlist,
    │   │                    SoundToggle, Toast, ToastContainer, ProtectedRoute,
    │   │                    ConnectionStatus
    │   ├── three/         — geoMath (lat/lng↔sphere, subsolar point), weatherVisuals,
    │   │                    globeScene (imperative Three.js scene)
    │   ├── audio/         — soundscapeEngine (imperative Web Audio graph)
    │   ├── hooks/         — useSocket, useMessages, useWeatherSnapshot,
    │   │                    useGlobalAlerts, useWatchlist, useSoundscape
    │   ├── context/       — AuthContext
    │   ├── api/           — fetch wrappers (auth, weather)
    │   ├── styles/        — global, login, home, toast, globe, alertTicker,
    │   │                    citySearch, watchlist, forecastStrip, trendSparkline
    │   └── types.ts       — mirrored client/server types
    └── vite.config.ts
```

## Trade-offs I made

- **Express over NestJS** — NestJS adds structure that pays off at scale; for a three-route API it's overhead with no payoff.
- **Open-Meteo over OpenWeatherMap** — no API key means a reviewer can clone and run with zero extra setup. The trade-off is less control over rate limits and response schema stability.
- **Curated city list over free-text geocoding** — deterministic slugs make room names predictable and keep the curl examples clean. A geocoding call would add latency and a second external dependency.
- **localStorage JWT over HttpOnly cookies** — localStorage is vulnerable to XSS; HttpOnly cookies are the correct production approach. Pragmatic for a local demo with no third-party scripts.
- **Type duplication between client and server** — a shared package would require a workspace build step that adds reviewer setup friction. Duplication is the honest trade-off at this scope.
- **No Docker** — a reviewer can run the project with two `npm` commands. Docker adds nothing here except a longer setup section.
- **In-memory storage** — the brief explicitly permitted in-memory; adding persistence would have been over-engineering. State is lost on restart; persistent storage is item 3 under What I'd add.
- **Derived alert thresholds over a real alerts feed** — no free/keyless global severe-weather-alerts API exists (checked: Open-Meteo, NOAA, MeteoAlarm, OpenWeather/Xweather). Thresholds in `alertRules.ts` are the honest alternative — genuine detection over real data, still no API key required.
- **In-memory alert-severity tracking** — resets on restart, same trade-off as the existing in-memory user store; a city that was mid-alert before a restart won't re-fire until conditions clear and recur.
- **Canvas2D particles, not a second Three.js scene** — the weather-card's rain/snow effect is plain canvas, keeping WebGL scoped to the globe only.
- **Committed textures over a fetch script** — ~1.5MB of Earth textures are committed directly to `client/public/`, consistent with the "no Docker, two npm commands" zero-setup philosophy above.
- **`Globe` is lazy-loaded, not the whole app** — Three.js is the bulk of this app's JS weight, but it's confined to one component; `weatherVisuals.ts`'s color helpers return plain hex strings rather than `THREE.Color` instances specifically so the components that render eagerly on the Home page (`Watchlist`, `ForecastStrip`) don't drag `three` into the main bundle. The result: `/login` and `/register` load a ~227KB bundle instead of ~775KB, and Three.js only downloads once a user is actually authenticated and viewing the globe.

## What I'd add for production

- **Refresh tokens with rotation** — 8-hour JWTs require re-login; a refresh flow keeps sessions alive without compromising revocability
- **Persistent database** (Postgres + an ORM) — replaces the in-memory user store and message log
- **Structured logging and observability** — OpenTelemetry traces across HTTP and Socket.IO events; currently there's no visibility into what rooms are active or how many messages are flowing
- **Fetch-mocked tests for the poller and the live-Open-Meteo routes** (`/api/weather`, `/forecast`, `/history`) — same reasoning as the alert-threshold logic: mocking `fetch` is more effort than this portfolio-scale project needs when live curl checks already cover them each time they change
- **HttpOnly cookies** for token storage — eliminates the XSS surface of localStorage
- **Email verification on registration** — `POST /api/auth/register` exists now (see below) but doesn't verify email ownership, since that needs real SMTP/third-party infrastructure to actually test end to end
- **A real database for alert history** — currently an append-to-disk JSON file (`server/.data/alert-history.json`, capped at 100 entries), which survives restarts but isn't queryable/filterable the way a real deployment would want

## Testing notes

Room targeting was verified manually with a three-terminal setup (server, browser session, curl). The verification matrix:

- Push to current city while subscribed → `recipients: 1`, toast received
- Push to a city the user is not subscribed to → `recipients: 0`, no toast
- Switch cities, push to old city → `recipients: 0`, no toast
- Push to new city → `recipients: 1`, toast received

Reconnect handling (Manager-level `reconnect` event + explicit room rejoin) is present in code but not testable through Vite's dev proxy, which doesn't recover from a backend that disappears mid-session. Behind a real reverse proxy (nginx, Caddy, AWS ALB) the WebSocket connection re-establishes cleanly when the backend recovers, which is what the reconnect handlers in the code are designed for.

The alert-threshold logic (`evaluateAlert`, `recordAndCheckEdge`), the Open-Meteo response schemas, and the HTTP routes with no external network dependency are unit/integration-tested — `cd server && npm test` (50 tests as of writing). The route tests use `supertest` against the real Express routers with dependencies stubbed at their existing factory boundaries — a mocked `io` for `messagesRouter` (covering the same subscribed/unsubscribed recipients matrix above, now automated), stub `getSnapshot`/`pollNow` functions for `weatherRouter`. `POST /api/auth/login` runs against the real `bcrypt`/JWT code paths, with `JWT_SECRET` set in `vitest.setup.ts` so tests don't depend on a real `.env` file existing. Routes that call live Open-Meteo (`/api/weather`, `/forecast`, `/history`) are deliberately left out of the automated suite — same reasoning as the poller itself — and covered by live curl/browser checks instead whenever they change.

`server/src/socket/integration.test.ts` goes one step further than the mocked-`io` route tests: a real Socket.IO server on an ephemeral port, with real `socket.io-client` connections, verifying handshake auth (missing/invalid/valid token) and the actual room-targeting behavior — a message pushed to one city's room reaches only the client watching it, a client can watch multiple cities and receive alerts for either, and `unwatchCity` genuinely stops delivery. This is what the manual verification matrix above used to be the only coverage for.

The globe and poller were verified end-to-end with a headless-browser session: logged in, confirmed the globe renders 27 correctly-positioned markers (spot-checked against real geography — e.g. clicking the marker next to South America on the visible hemisphere selected Cape Town, consistent with Africa sitting just east of South America across the Atlantic at this rotation), clicked a marker and confirmed the weather card and `<select>` update in sync, confirmed zero console errors and zero failed asset/socket requests, and re-ran the original curl-based subscribed/unsubscribed toast test to confirm the poller changes didn't regress the existing room-targeting mechanic.
