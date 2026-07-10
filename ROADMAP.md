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
- **Bcrypt password hashing** — the two demo users' passwords are now
  bcrypt hashes (precomputed once, not rehashed at every server boot),
  verified via `bcrypt.compare` in the login route. Also closed a minor
  timing side-channel: an unknown username now runs `bcrypt.compare`
  against a dummy hash too, so response time can't distinguish "no such
  user" from "wrong password" (the error message already didn't).
  Verified live: both demo logins still succeed, a wrong password and an
  unknown username both correctly return 401, and the full browser login
  flow (including the form's error-message path) still works.
- **Rate limiting on the unauthenticated push endpoints** — `express-rate-
  limit` (`server/src/middleware/rateLimit.ts`), 10 requests/minute per IP,
  shared across `POST /api/messages` and `POST /api/weather/poll-now`
  (same "unauthenticated by design" reasoning for both, and poll-now also
  spends a real Open-Meteo request each call). Verified live: sent 13 rapid
  requests to `/api/messages` — the first 10 returned 200, the next 3
  returned 429 with the app's own JSON error shape, correct `RateLimit-*`
  and `Retry-After` headers; confirmed `poll-now` was already rate-limited
  immediately after via the shared budget, proving the two endpoints
  really do share one limiter instance rather than each getting their own.
- **AbortController fix for the city-switch race condition** — `selectCity`
  now creates one `AbortController` per selection, aborts the previous
  one, and passes the signal into `fetchWeather`/`fetchForecast`/
  `fetchHistory`. Abort alone isn't quite enough — a stale request can
  still resolve successfully in the brief window before it's aborted — so
  every state update is also gated on an `isCurrent()` check
  (`activeRequestRef.current === controller`) before applying. Verified
  live with Playwright request interception: delayed Melbourne's
  `/api/weather` response by 2s, selected Melbourne then Tokyo 150ms
  later, and confirmed the display still showed Tokyo a full 2.2s later
  when Melbourne's stale response landed — without the fix it would have
  silently overwritten Tokyo's data.
- **Zod validation of Open-Meteo responses** — `openMeteoSchemas.ts` adds
  schemas for the current-conditions, batched-current-conditions, and
  daily-block response shapes (the daily one also `.refine()`s that all
  four parallel arrays share the same length as `time`, which plain field-
  level validation wouldn't catch). Each of the three call sites
  (`fetchBatchedConditions`, `fetchDailyBlock`, the inline `/api/weather`
  route) now validates before touching the response instead of trusting
  the shape implicitly. 9 new unit tests cover valid shapes, a renamed
  field, a wrong-typed field, and mismatched array lengths. Verified live
  against real Open-Meteo data afterward — current weather, a forced
  poll cycle (batched schema, 27 cities), and `/forecast` all still work.
- **Supertest coverage for HTTP routes** — added `auth.test.ts`,
  `weather.test.ts`, `messages.test.ts`, `middleware/rateLimit.test.ts`.
  `messagesRouter`'s tests use a duck-typed mock `io` and automate the
  exact subscribed/unsubscribed recipients matrix the README's manual
  testing notes already documented. `weatherRouter`'s tests stub
  `getSnapshot`/`pollNow` at the existing factory boundary. The three
  routes that hit live Open-Meteo stay out of the automated suite,
  same reasoning as the poller itself. Hit a real TypeScript/NodeNext
  quirk along the way — a dynamic `import()` of a default export
  resolved to the wrong type in a way that made no sense from the
  error message — and the correct fix turned out to be a `vitest.setup.ts`
  (new `vitest.config.ts`) that sets `JWT_SECRET` before any test file's
  imports run, letting `auth.test.ts` go back to a plain static import
  and avoid depending on a real `.env` file existing for `npm test`.
  39 tests total, all passing; confirmed no test files leak into `dist/`
  and the real dev server's login still works afterward.
- **User registration flow** — new `POST /api/auth/register` (username
  3-30 chars alphanumeric/underscore/hyphen, password 6+ chars), hashes
  with the same `bcrypt` helper as login, auto-logs-in on success, and
  gets its own `registerRateLimit` (5/10min per IP — a different abuse
  vector than the ops-push endpoints, so it doesn't share `pushRateLimit`'s
  budget). No email verification — same reasoning as the fetch-mocking
  gaps above, real SMTP infrastructure would be needed to test it
  properly. New `Register.tsx` page mirrors `Login.tsx`, with links
  between the two. 5 new supertest cases plus a registration-then-login
  round trip. Verified live in a real browser: register → auto-login →
  logout → re-login with the same account → duplicate username correctly
  shows a form error rather than navigating away. Along the way, hit the
  registration rate limit myself via earlier curl testing mid-session —
  restarted the dev server for a clean slate rather than waiting out the
  10-minute window, which incidentally re-confirmed the limiter works.
- **Code-split the Three.js globe** — every build this whole session
  warned about a >500kB chunk; fixed it for real. Lazy-loading just the
  `Globe` component (`React.lazy` + `Suspense`) first only trimmed ~25KB
  — barely moved the needle — because `weatherVisuals.ts` imported
  `THREE.Color` and was also imported eagerly by `Watchlist`/
  `ForecastStrip` (rendered directly on the Home page), so `three` was
  still reachable from the main bundle's eager import graph regardless of
  the Suspense boundary. Fixed by having `weatherCodeToColor` return a
  plain hex string instead of a `Color` instance — `globeScene.ts` (only
  reachable through the lazy chunk) constructs a real `Color` locally
  from that string when it needs one. Result: the main bundle dropped
  from ~775KB to ~227KB; `/login` and `/register` no longer pay for
  Three.js at all. The `Globe` chunk itself is still >500KB (that's
  inherent to the library), so the build warning doesn't disappear, but
  it's no longer on the critical path for pages that don't need it.
  Verified live: login loads fine, the Suspense fallback shows briefly
  after signing in, the globe renders correctly once its chunk loads, and
  the watchlist/forecast color dots resolved to the exact expected hex
  values (spot-checked via computed style) after the refactor.
- **Socket.IO multi-client integration tests** — `socket/integration.test.ts`:
  a real Socket.IO server on an ephemeral port with real `socket.io-client`
  connections (not mocks), testing handshake auth (no token / invalid
  token / valid token) and genuine room targeting — a message pushed to
  one city reaches only the client watching it, one client watching two
  cities gets alerts for either, and `unwatchCity` actually stops
  delivery. Caught two sequencing bugs while writing it: a test that
  awaited a "no message arrives" promise *before* firing the emit that
  would have satisfied it (making the assertion pass for the wrong
  reason — nothing had happened yet, not because the behavior was
  correct), and a dead `expect(...).toBeNull` missing its call
  parentheses (a no-op, not an assertion). Fixed both, then ran the suite
  3 times back to back to rule out flakiness from the real timing/async
  socket events. 50 tests total; confirmed no leakage into `dist/` and
  the real dev server unaffected.
- **Structured logging with pino** — replaced every `console.log`/
  `console.error` with `logger.ts` (pino, pretty-printed in dev via
  `pino-pretty`, raw JSON in production). `pino-http` logs every HTTP
  request; new log points cover socket connect/disconnect, `watchCity`/
  `unwatchCity` (per-user, per-city — the "what rooms are active"
  gap), message pushes (city + recipient count — the "how many messages
  are flowing" gap), and poll-cycle summaries (cities polled, alerts
  triggered). Silenced during tests via `LOG_LEVEL=silent` in
  `vitest.setup.ts` so it doesn't interleave with test output — noticed
  this the first run, when the socket integration test's real
  connect/disconnect events produced a wall of pretty-printed log lines
  alongside the test results. Verified live: restarted the dev server
  and confirmed startup, poll-cycle, socket-connection, and
  request-completion logs all render correctly with real data.
- **HttpOnly cookie auth migration** — the big one this session had been
  deliberately deferring batch after batch. Moved the JWT from
  `localStorage` to an httpOnly `Set-Cookie`, so an XSS payload genuinely
  cannot read it anymore — the token no longer appears in any JSON
  response body either, since that would defeat the point just as much.
  New `GET /api/auth/me` (the client can't read an httpOnly cookie, so
  this is how it asks "am I logged in") and `POST /api/auth/logout`
  (client JS can't clear an httpOnly cookie either). The Socket.IO
  handshake now reads the cookie (`socket.handshake.headers.cookie`,
  parsed with the `cookie` package) instead of an explicit `auth.token`
  payload; the client connects with `withCredentials: true`. CORS on
  both the Express app and the Socket.IO server needed `credentials:
  true` alongside the already-explicit origin. No CSRF token scheme
  added: `sameSite: 'lax'` covers the classic case, and this app has no
  authenticated state-changing REST endpoint to forge in the first place.

  `AuthContext` was rewritten around `isAuthenticated`/`isLoading`
  instead of a `token` string — `isLoading` covers the async `/me` round
  trip on mount, which `ProtectedRoute` waits on rather than flashing a
  redirect to `/login` for an already-authenticated user. All 6
  consumers of `useAuth()` updated (`ProtectedRoute`, `useSocket`,
  `Login`, `Register`, `Home`, `AuthContext` itself).

  Hit two real snags: the `cookie` package's v2 API turned out to export
  `parseCookie`/`stringifyCookie`, not the classic `parse`/`serialize`
  names I expected — caught immediately by the typecheck. And both
  `auth.test.ts` and the Socket.IO integration test needed rewrites since
  they exercised the old token-in-body / `auth.token` mechanics —
  supertest doesn't manage a cookie jar across requests, so a helper
  extracts the raw `Set-Cookie` value for later requests to `.set()`
  explicitly; the Node socket.io-client test uses `extraHeaders: {
  Cookie: ... }` since it has no browser cookie jar either.

  Verified with a battery of live browser checks (not just the test
  suite): unauthenticated `/` redirects to `/login`; after login,
  `document.cookie` genuinely doesn't contain the token (proving
  `httpOnly`, not just trusting the flag); a full page reload while
  authenticated stays on the home page; logout redirects to `/login` and
  a subsequent visit stays logged out (cookie actually cleared
  server-side); registration's auto-login still works; and the
  subscribed/unsubscribed toast regression test still passes after the
  handshake rewrite. 54 server tests passing, both builds clean.
- **Today's full details — wind, humidity, feels-like, sunrise/sunset, UV
  index** — the first of a batch of weather-app-focused features (a
  deliberate shift back from infrastructure hardening, per request).
  `GET /api/weather?city=` now requests `current=` (temp, weather code,
  wind speed/direction, humidity, apparent temperature) and `daily=`
  (sunrise, sunset, UV index max, `forecast_days=1`) in one combined
  Open-Meteo call rather than a second request — sunrise/sunset/UV only
  exist as daily-block fields even though they describe "today."
  `CurrentConditionsSchema` extended to match, with a new test covering
  the daily sub-block. New `WeatherDetails.tsx` renders a 2-column grid:
  wind speed converted to a 16-point compass direction, UV index paired
  with its standard Low/Moderate/High/Very High/Extreme band, and
  sunrise/sunset formatted directly from Open-Meteo's local-time string
  rather than through `Date` — parsing a timezone-less ISO string with
  `Date` reinterprets it against the *viewer's* timezone instead of just
  displaying the city's actual local wall-clock time. Verified live: all
  six values for Tokyo matched a direct curl check (wind direction 182°
  correctly shown as "S", UV 8.25 correctly banded as "Very High").
- **°C/°F unit toggle** — new `UnitContext`/`UnitProvider` (mirrors the
  `AuthContext` pattern, mounted at the `App.tsx` level) rather than
  prop-drilling, since five different components display a temperature
  (`Home`, `WeatherDetails`, `ForecastStrip`, `TrendSparkline`,
  `Watchlist`). Server data stays Celsius always — conversion happens
  only at the display layer via `formatTemp`/`convertTemp`, keyed off a
  `localStorage`-persisted preference. `TrendSparkline` converts the
  values array itself, not just the min/max range label, so the chart's
  own scaling operates in the displayed unit. Verified live: toggled to
  Fahrenheit and confirmed the main temp, feels-like, forecast strip,
  sparkline range, and watchlist temps all converted correctly (small
  ~1° differences between independently-rounded C/F displays are
  expected — each unit rounds its own precise value rather than
  converting an already-rounded one); confirmed the preference survives
  a full page reload.
- **Comfort score, activity tip, moon phase, golden hour** — a bigger
  weather-feature batch this time (6 items, per request). These four are
  the "cheap" quarter: pure client-side derived insights needing only
  `cloud_cover` and `current.time` added to the already-combined
  Open-Meteo call (`weatherInsights.ts` for the first three, deliberately
  kept out of `three/geoMath.ts` despite the similar "coarse astronomical
  calc" shape as `getSubsolarPoint` — that file imports `THREE.Vector3`,
  and pulling it into an eagerly-rendered component would undo the
  Globe lazy-load bundle split). Comfort score layers a humidity/wind
  penalty on top of Open-Meteo's own feels-like (which already folds in
  wind-chill/heat-index math). Golden hour compares `current.time`
  against sunrise/sunset as wall-clock minutes — same city, same local
  reference frame, no timezone math needed — gated on cloud cover under
  60%. Verified live: Melbourne was 31 minutes from sunset with 16%
  cloud cover at test time, correctly triggering the golden-hour badge;
  comfort score (72 · Good) matched hand-calculating the formula against
  the live feels-like/humidity values; wind direction 12° correctly
  shown as "NNE". Confirmed the main bundle only grew ~2KB (232.94KB vs.
  230.70KB) and the Globe chunk was untouched, proving the split held.

## Future ideas (not yet scheduled)

- Persistent database (Postgres) replacing the in-memory user store and
  the append-to-disk alert history
- Refresh tokens with rotation — layers naturally on top of the cookie
  now that it exists: a short-lived access token cookie plus a longer-
  lived refresh cookie
- Distributed tracing (OpenTelemetry) — correlating a request across
  HTTP → Socket.IO → the poller would need real spans, on top of the
  structured logging that now exists
- Deployment (not attempted without explicit user go-ahead — out of scope
  until asked)
