# SIH 2.0 Demonstration & Presentation Guide

## Overview
This document outlines the step-by-step procedure for presenting and demonstrating the SIH 2.0 Industrial Training Safety Monitor prototype during SIH evaluation.

---

## Safety & Prototype Disclaimer
> **IMPORTANT SAFETY DISCLAIMER**: This software system is a training and diagnostic prototype intended for demonstration purposes only. Sensor telemetry and alerts are designed for training support and educational feedback. This system is **not a certified safety device** and must **not replace established industrial safety procedures** or certified workplace PPE.

---

## SIH Presentation Concept & Value Proposition

### 1. The Problem
Workshop trainees in industrial or vocational settings face hazardous conditions (gas leaks, high vibration, overheating) and need real-time, clear feedback while trainers require central visibility over active training runs.

### 2. The Solution
A low-cost, resilient handheld/wearable sensing architecture connected over local Wi-Fi/HTTP to an authoritative trainer dashboard that monitors active sessions, deduplicates alerts, and generates report analytics.

### 3. Current Prototype Status
Software-complete prototype featuring ESP32 Wi-Fi/HTTP communication resilience, FastAPI backend, SQLite persistence, active session monitoring, deduplicated alert engine, per-sensor statistics, report generation, and CSV/JSON exports.

*Note: Physical sensors (e.g. MQ-4, MQ-6, accelerometer) will be integrated in subsequent physical hardware integration phases.*

---

## Step-by-Step Demonstration Flow

### Step 1: System Launch & Health Inspection
1. Start Backend: `cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000`
2. Start Frontend: `cd frontend && npm run dev`
3. Open `http://localhost:5173` in the web browser.
4. Verify backend health on `http://localhost:8000/health`.

### Step 2: Registered Devices & Hardware Connectivity
1. Navigate to **Devices** page (`/devices`).
2. Show registered devices (`HANDHELD`, `WEARABLE`), firmware versions, and status indicators.
3. Demonstrate live heartbeat updating `last_seen` timestamp.

### Step 3: Trainee & Zone Management
1. Navigate to **Trainees** (`/trainees`) and show registered trainees.
2. Navigate to **Zones** (`/zones`) and inspect configured workshop bays.

### Step 4: Initiate Training Session
1. Navigate to **Sessions** (`/sessions`) and click **Start Session**.
2. Select Trainee (e.g. `TRN-001`), Device (e.g. `ESP32-HANDHELD-01`), Module Type, and Zone (`BAY-A`).
3. Click **Initiate Session**.

### Step 5: Live Session Monitoring & Telemetry
1. Open the active session detail view (`/sessions/:id`).
2. Inspect Session Summary card (Trainee ID, Device ID, Zone, Duration, Status).
3. Demonstrate real-time polling updates while session is `ACTIVE`.

### Step 6: Session Completion & Trainer Analytics
1. Click **Complete Session** to record evaluation outcome (`PASS`).
2. Observe final session duration calculation (e.g., `15 min`).
3. Inspect **Session Analytics Summary Card** (Telemetry sensor statistics & Hazard alert breakdown).

### Step 7: Trainer Report & Data Export
1. Click **View Session Report** to launch the printable trainer report modal.
2. Click **Export CSV** to download raw session summary and telemetry.
3. Click **Export JSON** to download structured session JSON data.

---

## Pre-Demo Preparation Checklist
- [x] Backend starts without errors (`python -m uvicorn app.main:app --host 0.0.0.0 --port 8000`)
- [x] Frontend starts cleanly (`npm run dev`)
- [x] Pytest suite passes (`python -m pytest` -> 164 passed)
- [x] Dashboard loads at `http://localhost:5173`
- [x] Devices, Trainees, Zones pages populate cleanly
- [x] Session initiation, detail inspection, completion workflow verified
- [x] Analytics and CSV/JSON export download verified
- [ ] *(Optional)* ESP32 board connected over local Wi-Fi and sending heartbeats
- [ ] *(Pending)* Physical sensors connected (marked pending for physical sensor phase)
