export type DeviceType = 'HANDHELD' | 'WEARABLE' | 'MACHINE_NODE' | 'GATEWAY' | 'BEACON';
export type DeviceStatus = 'ONLINE' | 'OFFLINE' | 'FAULT' | 'UNKNOWN';
export type SessionStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED' | 'FAULT';
export type AlertSeverity = 'INFO' | 'WARNING' | 'DANGER' | 'CRITICAL';
export type ReadingStatus = 'NORMAL' | 'WARNING' | 'DANGER';

export type MachineOperatingState = 'IDLE' | 'STARTUP' | 'ACTIVE' | 'COOLDOWN' | 'MAINTENANCE' | 'UNKNOWN';
export type SensorHealthState = 'OK' | 'WARMING_UP' | 'UNRELIABLE' | 'DISCONNECTED' | 'SATURATED' | 'STALE' | 'UNKNOWN';
export type ConfidenceLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type SafetyEventType =
  | 'VIBRATION_ANOMALY'
  | 'ACOUSTIC_ANOMALY'
  | 'GAS_ANOMALY'
  | 'PRESSURE_ANOMALY'
  | 'WETNESS_EVENT'
  | 'SENSOR_FAULT'
  | 'MULTI_SENSOR_HAZARD'
  | 'UNKNOWN_ANOMALY';
export type SafetyEventStatus = 'DETECTED' | 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED';


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

export interface SafetyEvent {
  id: number;
  event_id: string;
  session_id: string;
  device_id: string;
  zone_id?: string | null;
  machine_id?: string | null;
  event_type: SafetyEventType | string;
  severity: AlertSeverity | string;
  status: SafetyEventStatus;
  confidence_level: ConfidenceLevel;
  confidence_reason?: string | null;
  triggering_sensor_types?: string | null;
  context_state?: MachineOperatingState | string | null;
  started_at: string;
  ended_at?: string | null;
  duration_seconds?: number | null;
  acknowledged_at?: string | null;
  resolved_at?: string | null;
  trainer_note?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MachineBaseline {
  id: number;
  baseline_id: string;
  machine_id: string;
  sensor_type: string;
  machine_state: MachineOperatingState | string;
  feature_name: string;
  baseline_value: number;
  spread?: number | null;
  sample_count: number;
  created_at: string;
  updated_at: string;
}

export interface ExplainableAlert {
  condition: string;
  evidence: string;
  confidence: ConfidenceLevel | string;
  sensor_status: SensorHealthState | string;
  recommended_action: string;
}

// Phase 15B: Evidence-Guided Inspection & Intelligence Layer
export type InspectionDecision =
  | 'CONFIRMED_BY_TRAINER'
  | 'REFUTED_BY_TRAINER'
  | 'INCONCLUSIVE'
  | 'INSUFFICIENT_EVIDENCE';

export type InspectionStatus = 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type StepStatus = 'PENDING' | 'COMPLETED' | 'SKIPPED' | 'FOLLOW_UP_REQUIRED';

export type EvidenceQualityStatus = 'SUFFICIENT' | 'DEGRADED' | 'INSUFFICIENT';

export type InterventionOutcome = 'IMPROVED' | 'UNCHANGED' | 'WORSENED' | 'INCONCLUSIVE';

export type TrendState = 'TRANSIENT' | 'PERSISTENT' | 'ESCALATING' | 'RECOVERING' | 'UNKNOWN';

export interface InspectionStepItem {
  step_id: string;
  instruction: string;
  component?: string | null;
  reference_position?: string | null;
  status: StepStatus;
  observation?: string | null;
  evidence_reference?: string | null;
  completed_at?: string | null;
}

export interface InspectionTemplate {
  template_id: string;
  title: string;
  category: string;
  description: string;
  steps: InspectionStepItem[];
}

export interface InspectionEvidence {
  id: number;
  evidence_id: string;
  inspection_id: string;
  session_id: string;
  evidence_type: string;
  source: string;
  reference_id?: string | null;
  value?: number | null;
  unit?: string | null;
  notes?: string | null;
  timestamp: string;
  created_at: string;
}

export interface InspectionEvidenceCreate {
  evidence_id: string;
  evidence_type: string;
  source?: string;
  reference_id?: string | null;
  value?: number | null;
  unit?: string | null;
  notes?: string | null;
  timestamp?: string | null;
}

export interface Inspection {
  id: number;
  inspection_id: string;
  session_id: string;
  device_id?: string | null;
  zone_id?: string | null;
  machine_id?: string | null;
  event_id?: string | null;
  trainer_id?: string | null;
  template_id?: string | null;
  status: InspectionStatus;
  decision?: InspectionDecision | null;
  reason: string;
  checklist: InspectionStepItem[];
  measurement_source?: string | null;
  sensor_health_state?: string | null;
  machine_state?: string | null;
  baseline_id?: string | null;
  trainer_notes?: string | null;
  outcome_notes?: string | null;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
  evidence_items: InspectionEvidence[];
}

export interface InspectionCreate {
  inspection_id: string;
  session_id: string;
  device_id?: string | null;
  zone_id?: string | null;
  machine_id?: string | null;
  event_id?: string | null;
  trainer_id?: string | null;
  template_id?: string | null;
  reason: string;
  checklist?: InspectionStepItem[] | null;
  measurement_source?: string;
  sensor_health_state?: string;
  machine_state?: string;
  baseline_id?: string | null;
  trainer_notes?: string | null;
}

export interface InspectionComplete {
  decision: InspectionDecision;
  outcome_notes?: string | null;
  trainer_notes?: string | null;
}

export interface InspectionStepUpdate {
  status: StepStatus;
  observation?: string | null;
  evidence_reference?: string | null;
}

export interface EvidenceQualityAssessment {
  status: EvidenceQualityStatus;
  quality_issues: string[];
  supporting_evidence_refs: string[];
  missing_evidence_requirements: string[];
  explanation: string;
  assessment_timestamp: string;
}

export interface TrainerIntervention {
  id: number;
  intervention_id: string;
  session_id: string;
  inspection_id?: string | null;
  event_id?: string | null;
  machine_id?: string | null;
  trainer_id?: string | null;
  category: string;
  notes: string;
  timestamp: string;
  before_window_data?: Record<string, any> | null;
  after_window_data?: Record<string, any> | null;
  comparison_outcome: InterventionOutcome;
  comparison_notes?: string | null;
  created_at: string;
}

export interface TrainerInterventionCreate {
  intervention_id: string;
  session_id: string;
  inspection_id?: string | null;
  event_id?: string | null;
  machine_id?: string | null;
  trainer_id?: string | null;
  category: string;
  notes: string;
  timestamp?: string | null;
  before_window_data?: Record<string, any> | null;
  after_window_data?: Record<string, any> | null;
  comparison_notes?: string | null;
}

export interface TimelineRecord {
  record_type: 'SESSION_LIFECYCLE' | 'SAFETY_EVENT' | 'ALERT' | 'INSPECTION' | 'INTERVENTION';
  id: string;
  timestamp: string;
  title: string;
  machine_id?: string | null;
  zone_id?: string | null;
  severity: string;
  status: string;
  details: Record<string, any>;
}

export interface SessionReplayResponse {
  session_id: string;
  total_records: number;
  limit: number;
  offset: number;
  records: TimelineRecord[];
}

export interface TrainerIntelligenceAnalytics {
  session_filter?: string | null;
  inspections: {
    total: number;
    unresolved: number;
    completed: number;
    cancelled: number;
    decisions: Record<string, number>;
    checklist_steps: {
      completed: number;
      skipped: number;
      follow_up_required: number;
    };
  };
  safety_events: {
    total: number;
    by_type: Record<string, number>;
    by_trend: Record<string, number>;
    repeated_by_machine: Record<string, number>;
    repeated_by_zone: Record<string, number>;
    timing_metrics: {
      average_time_to_acknowledge_seconds: number | null;
      acknowledged_samples_count: number;
      unacknowledged_or_missing_samples: number;
      average_time_to_resolve_seconds: number | null;
      resolved_samples_count: number;
      unresolved_or_missing_samples: number;
    };
  };
  interventions: {
    total: number;
    outcomes: Record<string, number>;
    categories: Record<string, number>;
  };
}
