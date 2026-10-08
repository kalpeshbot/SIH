export type DeviceType = 'HANDHELD' | 'WEARABLE' | 'BEACON';
export type DeviceStatus = 'ONLINE' | 'OFFLINE' | 'FAULT' | 'UNKNOWN';
export type SessionStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED' | 'FAULT';
export type AlertSeverity = 'INFO' | 'WARNING' | 'DANGER' | 'CRITICAL';
export type ReadingStatus = 'NORMAL' | 'WARNING' | 'DANGER';

export interface Trainee {
  id: number;
  trainee_id: string;
  name: string;
  created_at: string;
  updated_at?: string | null;
}

export interface TraineeCreate {
  trainee_id: string;
  name: string;
}

export interface TraineeUpdate {
  name?: string;
}

export interface Zone {
  id: number;
  zone_id: string;
  name: string;
  description?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface ZoneCreate {
  zone_id: string;
  name: string;
  description?: string;
}

export interface ZoneUpdate {
  name?: string;
  description?: string;
}

export interface Device {
  id: number;
  device_id: string;
  device_type: DeviceType;
  firmware_version?: string | null;
  status: DeviceStatus;
  battery: number;
  zone_id?: string | null;
  created_at: string;
  updated_at?: string | null;
  last_seen?: string | null;
}

export interface DeviceCreate {
  device_id: string;
  device_type: DeviceType;
  firmware_version?: string;
  status?: DeviceStatus;
  battery?: number;
  zone_id?: string | null;
}

export interface DeviceUpdate {
  status?: DeviceStatus;
  battery?: number;
  zone_id?: string | null;
}

export interface SessionRecord {
  id: number;
  session_id: string;
  trainee_id: string;
  device_id: string;
  zone_id?: string | null;
  session_type: string;
  status: SessionStatus;
  result?: string | null;
  start_time: string;
  end_time?: string | null;
  created_at: string;
}

export interface SessionCreate {
  session_id: string;
  trainee_id: string;
  device_id: string;
  zone_id?: string;
  session_type: string;
  start_time?: string;
}

export interface SessionUpdate {
  status?: SessionStatus;
  result?: string;
  end_time?: string;
}

export interface SensorReading {
  id: number;
  session_id: string;
  device_id: string;
  timestamp: string;
  sensor_type: string;
  value: number;
  unit: string;
  status: ReadingStatus | string;
}

export interface SensorReadingCreate {
  session_id: string;
  device_id: string;
  sensor_type: string;
  value: number;
  unit: string;
  status: string;
  timestamp?: string;
}

export interface Alert {
  id: number;
  session_id: string;
  device_id: string;
  alert_type: string;
  severity: AlertSeverity;
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

export interface AlertCreate {
  session_id: string;
  device_id: string;
  alert_type: string;
  severity: AlertSeverity;
  message: string;
}

export interface HealthResponse {
  status: string;
  service: string;
  database: string;
}

export interface ApiErrorDetail {
  message: string;
  status: number;
  fieldErrors?: Record<string, string>;
}

export interface SensorStatItem {
  sensor_type: string;
  unit: string;
  count: number;
  min: number;
  max: number;
  avg: number;
}

export interface ReadingStatistics {
  total_readings: number;
  first_reading_time?: string | null;
  last_reading_time?: string | null;
  by_sensor_type: SensorStatItem[];
}

export interface AlertSeverityCounts {
  INFO: number;
  WARNING: number;
  DANGER: number;
  CRITICAL: number;
  FAULT: number;
}

export interface AlertStatistics {
  total_alerts: number;
  unacknowledged_alerts: number;
  acknowledged_alerts: number;
  severity_counts: AlertSeverityCounts;
  first_alert_time?: string | null;
  latest_alert_time?: string | null;
}

export interface SessionSummary {
  id: number;
  session_id: string;
  trainee_id: string;
  device_id: string;
  device_type?: string | null;
  firmware_version?: string | null;
  zone_id?: string | null;
  status: SessionStatus;
  session_type: string;
  result?: string | null;
  start_time: string;
  end_time?: string | null;
  duration_seconds?: number | null;
  duration_formatted: string;
  reading_count: number;
  alert_count: number;
}

export interface SessionAnalytics {
  session: SessionSummary;
  reading_stats: ReadingStatistics;
  alert_stats: AlertStatistics;
  recent_alerts: Alert[];
}

