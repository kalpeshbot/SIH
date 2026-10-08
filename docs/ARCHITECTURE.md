# Architecture

## Current Backend Architecture
The backend is built with FastAPI and SQLModel, using SQLite for data storage.

```text
Frontend (Future)
   ↓
FastAPI (Routers -> Services)
   ↓
SQLModel (ORM Models)
   ↓
SQLite (sih.db)
```

## Future Hardware Integration Architecture
When physical hardware (ESP32) is introduced, it will communicate with the backend.

```text
ESP32 (Hardware)
   ↓
API (HTTP/MQTT)
   ↓
FastAPI (Backend)
   ↓
SQLite (Database)
   ↓
Dashboard (Frontend)
```

**Note:** The Simulator, MQTT, Frontend, and other components are future extensions and not part of the current backend foundation.
