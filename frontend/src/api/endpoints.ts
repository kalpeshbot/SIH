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
  Inspection,
  InspectionCreate,
  InspectionComplete,
  InspectionStepUpdate,
  InspectionEvidence,
  InspectionEvidenceCreate,
  InspectionTemplate,
  EvidenceQualityAssessment,
  TrainerIntervention,
  TrainerInterventionCreate,
  SessionReplayResponse,
  TrainerIntelligenceAnalytics,
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

// =========================================================================
// Phase 15B: Evidence-Guided Inspection Endpoints
// =========================================================================

export const getInspectionTemplates = () =>
  apiClient.get<InspectionTemplate[]>('/api/inspections/templates');

export const getInspectionTemplate = (templateId: string) =>
  apiClient.get<InspectionTemplate>(`/api/inspections/templates/${templateId}`);

export const getInspections = (params?: {
  session_id?: string;
  machine_id?: string;
  zone_id?: string;
  event_id?: string;
  status?: string;
  decision?: string;
  limit?: number;
  offset?: number;
}) => {
  const query = new URLSearchParams();
  if (params?.session_id) query.append('session_id', params.session_id);
  if (params?.machine_id) query.append('machine_id', params.machine_id);
  if (params?.zone_id) query.append('zone_id', params.zone_id);
  if (params?.event_id) query.append('event_id', params.event_id);
  if (params?.status) query.append('status', params.status);
  if (params?.decision) query.append('decision', params.decision);
  if (params?.limit !== undefined) query.append('limit', String(params.limit));
  if (params?.offset !== undefined) query.append('offset', String(params.offset));
  const queryString = query.toString() ? `?${query.toString()}` : '';
  return apiClient.get<Inspection[]>(`/api/inspections${queryString}`);
};

export const getInspection = (identifier: string | number) =>
  apiClient.get<Inspection>(`/api/inspections/${identifier}`);

export const createInspection = (data: InspectionCreate) =>
  apiClient.post<Inspection>('/api/inspections', data);

export const updateInspectionStep = (
  identifier: string | number,
  stepId: string,
  data: InspectionStepUpdate
) =>
  apiClient.patch<Inspection>(`/api/inspections/${identifier}/steps/${stepId}`, data);

export const addInspectionEvidence = (
  identifier: string | number,
  data: InspectionEvidenceCreate
) =>
  apiClient.post<InspectionEvidence>(`/api/inspections/${identifier}/evidence`, data);

export const completeInspection = (
  identifier: string | number,
  data: InspectionComplete
) =>
  apiClient.post<Inspection>(`/api/inspections/${identifier}/complete`, data);

export const cancelInspection = (
  identifier: string | number,
  cancellationNotes?: string
) => {
  const query = cancellationNotes
    ? `?cancellation_notes=${encodeURIComponent(cancellationNotes)}`
    : '';
  return apiClient.post<Inspection>(`/api/inspections/${identifier}/cancel${query}`, {});
};

export const getInspectionEvidenceQuality = (identifier: string | number) =>
  apiClient.get<EvidenceQualityAssessment>(`/api/inspections/${identifier}/evidence-quality`);

export const downloadInspectionExport = (
  identifier: string | number,
  format: 'json' | 'csv' = 'json'
) => {
  window.open(`/api/inspections/${identifier}/export?format=${format}`, '_blank');
};

// =========================================================================
// Phase 15B: Trainer Interventions Endpoints
// =========================================================================

export const getInterventions = (params?: {
  session_id?: string;
  inspection_id?: string;
  event_id?: string;
  category?: string;
  outcome?: string;
}) => {
  const query = new URLSearchParams();
  if (params?.session_id) query.append('session_id', params.session_id);
  if (params?.inspection_id) query.append('inspection_id', params.inspection_id);
  if (params?.event_id) query.append('event_id', params.event_id);
  if (params?.category) query.append('category', params.category);
  if (params?.outcome) query.append('outcome', params.outcome);
  const queryString = query.toString() ? `?${query.toString()}` : '';
  return apiClient.get<TrainerIntervention[]>(`/api/interventions${queryString}`);
};

export const getIntervention = (identifier: string | number) =>
  apiClient.get<TrainerIntervention>(`/api/interventions/${identifier}`);

export const createIntervention = (data: TrainerInterventionCreate) =>
  apiClient.post<TrainerIntervention>('/api/interventions', data);

// =========================================================================
// Phase 15B: Session Replay & Trainer Intelligence
// =========================================================================

export const getSessionReplay = (
  sessionId: string | number,
  params?: {
    record_type?: string;
    machine_id?: string;
    zone_id?: string;
    limit?: number;
    offset?: number;
  }
) => {
  const query = new URLSearchParams();
  if (params?.record_type) query.append('record_type', params.record_type);
  if (params?.machine_id) query.append('machine_id', params.machine_id);
  if (params?.zone_id) query.append('zone_id', params.zone_id);
  if (params?.limit !== undefined) query.append('limit', String(params.limit));
  if (params?.offset !== undefined) query.append('offset', String(params.offset));
  const queryString = query.toString() ? `?${query.toString()}` : '';
  return apiClient.get<SessionReplayResponse>(`/api/sessions/${sessionId}/replay${queryString}`);
};

export const downloadSessionEvidencePackage = (
  sessionId: string | number,
  format: 'json' | 'csv' = 'json'
) => {
  window.open(`/api/sessions/${sessionId}/export/evidence-package?format=${format}`, '_blank');
};

export const getTrainerAnalytics = (sessionId?: string) => {
  const query = sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : '';
  return apiClient.get<TrainerIntelligenceAnalytics>(`/api/trainer/analytics${query}`);
};
