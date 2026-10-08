# Frontend Architecture & Design System Documentation

## 1. Overview
The SIH Training Safety Monitor frontend is an industrial-grade diagnostic dashboard built for vocational workshop training. It provides live telemetry visualization, hardware device tracking, session management, and emergency hazard alert auditing.

### Stack
- **Framework**: React 19 + TypeScript + Vite
- **Routing**: React Router DOM (v7)
- **Icons**: Lucide React
- **Charting**: Recharts (Industrial line charts with axes, units, and timestamps)
- **Styling**: Vanilla CSS with comprehensive CSS custom properties (Design Tokens)
- **Testing**: Vitest + Testing Library + JSDOM

---

## 2. Design System & Aesthetics

### Industrial Principles
1. **Zero Purple/Pink Gradients**: Strictly restrained palette utilizing neutral backgrounds with semantic state indicators.
2. **Rectangular Geometry**: Modest border radius (3px to 6px), high-contrast borders, and structured information hierarchy. No pill-shaped buttons or capsule elements.
3. **No Fabricated / Fake Metrics**: All metrics (active sessions, online devices, hazard alerts, trainee counts) derive directly from backend endpoints or local telemetry.
4. **Light & Dark Mode**: Native support with local storage persistence and WCAG-compliant contrast ratios.
5. **No Emojis or Custom Cursors**: Semantic SVG icons from Lucide React (`AlertTriangle`, `Radio`, `Activity`, `Shield`, `Clock`, `Database`).

### Semantic State Colors
- **NORMAL / SUCCESS / ONLINE**: Green (`#16a34a` / `#f0fdf4`)
- **WARNING / CAUTION**: Amber (`#d97706` / `#fffbeb`)
- **DANGER / FAULT / CRITICAL**: Red (`#dc2626` / `#fef2f2`)
- **INFO / PRIMARY**: Slate Blue (`#0284c7` / `#f0f9ff`)
- **NEUTRAL / OFFLINE**: Slate Gray (`#64748b` / `#f1f5f9`)

---

## 3. Pages & Routes

| Route | Page | Purpose |
| :--- | :--- | :--- |
| `/` | `DashboardPage` | Executive operational overview: live metrics, active hazards, ongoing sessions, device health. |
| `/sessions` | `SessionsPage` | Training session catalog with search, status filtering, and session initiation. |
| `/sessions/:id` | `SessionDetailPage` | In-depth session inspection: live telemetry charts, event timeline, CSV/JSON data export, lifecycle controls. |
| `/trainees` | `TraineesPage` | Trainee management roster with registration modal and safe deletion guards. |
| `/devices` | `DevicesPage` | Hardware diagnostic device inventory with battery status and zone assignments. |
| `/zones` | `ZonesPage` | 2D workshop bay visualization displaying assigned devices, sessions, and active alerts. |
| `/alerts` | `AlertsPage` | Complete hazard alert audit trail with filtering and single-click instructor acknowledgment. |
| `/settings` | `SettingsPage` | Theme selection, telemetry polling rate adjustment (2s/4s/8s), and technical build specifications. |
| `/privacy` | `PrivacyPage` | Transparent prototype data collection and local storage disclosure. |
| `/terms` | `TermsPage` | Operational terms and mandatory prototype life-safety disclaimer. |

---

## 4. API Client & Connectivity

- **Base URL Configuration**: Configured via `VITE_API_BASE_URL` in `.env` (defaults to empty string for Vite proxy to `http://127.0.0.1:8000`).
- **Centralized Error Mapping**: Automatically transforms HTTP 400, 404, 409, 422, and 500 status codes into user-friendly messages without exposing raw Python stack traces.
- **Offline Detection**: Live connectivity monitor displays `BACKEND: CONNECTED` or `BACKEND: OFFLINE` with last successful sync timestamps.

---

## 5. Development & Testing Commands

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Run Vite development server (port 5173 with backend proxy)
npm run dev

# Run TypeScript typecheck and production build
npm run build

# Run Vitest test suite
npm test
```
