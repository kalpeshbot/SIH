# API Documentation

## Health

### `GET /health`
- **PURPOSE:** Check the health status of the backend and database connection.
- **REQUEST:** None
- **RESPONSE:** `{"status": "ok", "service": "sih-backend", "database": "connected"}`

## Trainees

### `GET /api/trainees`
- **PURPOSE:** List all trainees.
- **REQUEST:** None
- **RESPONSE:** List of Trainee objects.

### `GET /api/trainees/{id}`
- **PURPOSE:** Get a specific trainee by internal ID.
- **REQUEST:** `id` (integer)
- **RESPONSE:** Trainee object.
- **ERRORS:** 404 Not Found.

### `POST /api/trainees`
- **PURPOSE:** Create a new trainee.
- **REQUEST:** `{"trainee_id": "...", "name": "..."}`
- **RESPONSE:** Created Trainee object.
- **ERRORS:** 400 Trainee ID already exists.

### `PATCH /api/trainees/{id}`
- **PURPOSE:** Update a trainee.
- **REQUEST:** `{"name": "..."}`
- **RESPONSE:** Updated Trainee object.
- **ERRORS:** 404 Not Found.

### `DELETE /api/trainees/{id}`
- **PURPOSE:** Delete a trainee.
- **REQUEST:** `id` (integer)
- **RESPONSE:** 204 No Content.
- **ERRORS:** 404 Not Found.

## Devices
Similar endpoints to Trainees.
### `GET /api/devices`
### `GET /api/devices/{id}`
### `POST /api/devices`
### `PATCH /api/devices/{id}`
### `DELETE /api/devices/{id}`

## Zones
Similar endpoints to Trainees.
### `GET /api/zones`
### `GET /api/zones/{id}`
### `POST /api/zones`
### `PATCH /api/zones/{id}`
### `DELETE /api/zones/{id}`

## Sessions
### `GET /api/sessions`
### `GET /api/sessions/{id}`
### `POST /api/sessions`
- **REQUEST:** `{"session_id": "...", "trainee_id": "...", "device_id": "...", "session_type": "..."}`
- **ERRORS:** 400 if trainee or device doesn't exist.
### `PATCH /api/sessions/{id}`
### `GET /api/sessions/{session_id}/readings`

## Sensor Readings
### `POST /api/readings`
- **PURPOSE:** Ingest a sensor reading.
- **REQUEST:** `{"session_id": "...", "device_id": "...", "sensor_type": "...", "value": 0.0, "unit": "...", "status": "..."}`

## Alerts
### `GET /api/alerts`
### `GET /api/alerts/{id}`
### `POST /api/alerts`
### `PATCH /api/alerts/{id}`
- **PURPOSE:** Acknowledge an alert.
- **REQUEST:** `{"acknowledged": true}`
