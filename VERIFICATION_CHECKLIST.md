# RideFlow Frontend Verification Checklist

## Core Validation
- [x] `index.html` loads the correct scripts in the right order
- [x] `js/app.js` handles landing, auth, and dashboard routes cleanly
- [x] `js/utils/helpers.js` parses both normal URL search and hash-based query parameters
- [x] Old duplicate admin script import removed from `index.html`

## Dashboard Shells
- [x] `AdminLayout` renders admin sidebar, shell, and content placeholder
- [x] `RiderLayout` renders rider sidebar, shell, and content placeholder
- [x] `DriverLayout` renders driver sidebar, shell, and content placeholder
- [x] Dashboard section navigation uses `navigateTo('page', section)` and preserves the shell
- [x] Hash-based route changes update section state without reloading the shell

## Page Coverage
- [x] Landing page renders hero and CTA links
- [x] Login and register pages render forms correctly
- [x] Forgot password page renders and submits
- [x] Admin dashboard overview, users, drivers, vehicles, complaints, and reports sections render
- [x] Rider dashboard overview, request ride, ride history, payments, ratings, complaints, profile, and support sections render
- [x] Driver dashboard overview, current ride, ride requests, earnings, ratings, vehicles, profile, and support sections render

## UI & Components
- [x] Shared components (`navbar`, `sidebar`, `card`, `table`, `modal`, `toast`, `form`) are loaded before pages
- [x] Tables render with search/filter controls and actions
- [x] Modals and toast notifications work with current mock data flows
- [x] Forms validate and submit using mock API objects

## Notes
- The frontend is currently wired to mock data and simulated API flows.
- Real backend/MySQL integration is still required for actual authentication, persistence, and live ride data.
- `API_BASE_URL` in `js/utils/api.js` is placeholder and should be updated once the backend is available.
