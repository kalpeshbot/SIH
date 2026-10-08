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
