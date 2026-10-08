import { apiClient } from './client';
import {
  Trainee,
  TraineeCreate,
  TraineeUpdate,
  Zone,
  ZoneCreate,
  ZoneUpdate,
  Device,
  DeviceCreate,
  DeviceUpdate,
  SessionRecord,
  SessionCreate,
  SessionUpdate,
  SensorReading,
  SensorReadingCreate,
  Alert,
  AlertCreate,
  HealthResponse,
  SessionAnalytics,
  SafetyEvent,
  MachineBaseline,
} from './types';

// Health
export const getHealth = () => apiClient.get<HealthResponse>('/health');

// Trainees
export const getTrainees = () => apiClient.get<Trainee[]>('/api/trainees');
export const getTrainee = (id: number) => apiClient.get<Trainee>(`/api/trainees/${id}`);
export const createTrainee = (data: TraineeCreate) =>
  apiClient.post<Trainee>('/api/trainees', data);
export const updateTrainee = (id: number, data: TraineeUpdate) =>
  apiClient.patch<Trainee>(`/api/trainees/${id}`, data);
export const deleteTrainee = (id: number) =>
  apiClient.delete<void>(`/api/trainees/${id}`);

// Zones
export const getZones = () => apiClient.get<Zone[]>('/api/zones');
export const getZone = (id: number) => apiClient.get<Zone>(`/api/zones/${id}`);
export const createZone = (data: ZoneCreate) =>
  apiClient.post<Zone>('/api/zones', data);
export const updateZone = (id: number, data: ZoneUpdate) =>
  apiClient.patch<Zone>(`/api/zones/${id}`, data);
export const deleteZone = (id: number) =>
  apiClient.delete<void>(`/api/zones/${id}`);

// Devices
export const getDevices = () => apiClient.get<Device[]>('/api/devices');
export const getDevice = (id: number) => apiClient.get<Device>(`/api/devices/${id}`);
export const createDevice = (data: DeviceCreate) =>
  apiClient.post<Device>('/api/devices', data);
export const updateDevice = (id: number, data: DeviceUpdate) =>
  apiClient.patch<Device>(`/api/devices/${id}`, data);
export const deleteDevice = (id: number) =>
  apiClient.delete<void>(`/api/devices/${id}`);

// Sessions
export const getSessions = () => apiClient.get<SessionRecord[]>('/api/sessions');
export const getSession = (id: number) =>
  apiClient.get<SessionRecord>(`/api/sessions/${id}`);
export const createSession = (data: SessionCreate) =>
  apiClient.post<SessionRecord>('/api/sessions', data);
export const updateSession = (id: number, data: SessionUpdate) =>
  apiClient.patch<SessionRecord>(`/api/sessions/${id}`, data);
export const getSessionReadings = (sessionId: string) =>
  apiClient.get<SensorReading[]>(`/api/sessions/${sessionId}/readings`);
export const getSessionAnalytics = (idOrCode: string | number) =>
  apiClient.get<SessionAnalytics>(`/api/sessions/${idOrCode}/analytics`);

export const downloadSessionExport = (idOrCode: string | number, format: 'csv' | 'json' = 'csv') => {
  window.open(`/api/sessions/${idOrCode}/export?format=${format}`, '_blank');
};

export const downloadReadingsExport = (idOrCode: string | number, format: 'csv' | 'json' = 'csv') => {
  window.open(`/api/sessions/${idOrCode}/export/readings?format=${format}`, '_blank');
};

export const downloadAlertsExport = (idOrCode: string | number, format: 'csv' | 'json' = 'csv') => {
  window.open(`/api/sessions/${idOrCode}/export/alerts?format=${format}`, '_blank');
};

// Readings Ingestion
export const ingestReading = (data: SensorReadingCreate) =>
  apiClient.post<SensorReading>('/api/readings', data);

// Alerts
export const getAlerts = (params?: { session_id?: string; acknowledged?: boolean }) => {
  const query = new URLSearchParams();
  if (params?.session_id) query.append('session_id', params.session_id);
  if (params?.acknowledged !== undefined) query.append('acknowledged', String(params.acknowledged));
  const queryString = query.toString() ? `?${query.toString()}` : '';
  return apiClient.get<Alert[]>(`/api/alerts${queryString}`);
};
export const getAlert = (id: number) => apiClient.get<Alert>(`/api/alerts/${id}`);
export const createAlert = (data: AlertCreate) =>
  apiClient.post<Alert>('/api/alerts', data);
export const acknowledgeAlert = (id: number) =>
  apiClient.patch<Alert>(`/api/alerts/${id}`, { acknowledged: true });

// Safety Events (Intelligence Layer)
export const getSafetyEvents = (params?: {
  session_id?: string;
  device_id?: string;
  machine_id?: string;
  status?: string;
  severity?: string;
  event_type?: string;
}) => {
  const query = new URLSearchParams();
  if (params?.session_id) query.append('session_id', params.session_id);
  if (params?.device_id) query.append('device_id', params.device_id);
  if (params?.machine_id) query.append('machine_id', params.machine_id);
  if (params?.status) query.append('status', params.status);
  if (params?.severity) query.append('severity', params.severity);
  if (params?.event_type) query.append('event_type', params.event_type);
  const queryString = query.toString() ? `?${query.toString()}` : '';
  return apiClient.get<SafetyEvent[]>(`/api/events${queryString}`);
};
export const getSafetyEvent = (identifier: string | number) =>
  apiClient.get<SafetyEvent>(`/api/events/${identifier}`);
export const acknowledgeSafetyEvent = (identifier: string | number, trainer_note?: string) =>
  apiClient.post<SafetyEvent>(`/api/events/${identifier}/acknowledge`, { trainer_note });
export const resolveSafetyEvent = (identifier: string | number, trainer_note?: string) =>
  apiClient.post<SafetyEvent>(`/api/events/${identifier}/resolve`, { trainer_note });
export const dismissSafetyEvent = (identifier: string | number) =>
  apiClient.post<SafetyEvent>(`/api/events/${identifier}/dismiss`, {});

// Machine Baselines (Intelligence Layer)
export const getBaselines = (params?: {
  machine_id?: string;
  sensor_type?: string;
  machine_state?: string;
  feature_name?: string;
}) => {
  const query = new URLSearchParams();
  if (params?.machine_id) query.append('machine_id', params.machine_id);
  if (params?.sensor_type) query.append('sensor_type', params.sensor_type);
  if (params?.machine_state) query.append('machine_state', params.machine_state);
  if (params?.feature_name) query.append('feature_name', params.feature_name);
  const queryString = query.toString() ? `?${query.toString()}` : '';
  return apiClient.get<MachineBaseline[]>(`/api/baselines${queryString}`);
};
export const getMachineBaselines = (machineId: string) =>
  apiClient.get<MachineBaseline[]>(`/api/baselines/${machineId}`);

