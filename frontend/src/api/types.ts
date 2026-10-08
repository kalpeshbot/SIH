export type DeviceType = 'HANDHELD' | 'WEARABLE' | 'BEACON';
export type DeviceStatus = 'ONLINE' | 'OFFLINE' | 'FAULT' | 'UNKNOWN';
export type SessionStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
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
