import React from 'react';
import { TopBar } from '../components/layout/TopBar';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

export const TermsPage: React.FC = () => {
  return (
    <>
      <TopBar
        title="Terms & Safety Disclaimer"
        subtitle="Operational scope, prototype conditions, and mandatory safety notices"
      />

      <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto', maxWidth: '840px' }}>
        {/* Critical Safety Notice Banner */}
        <div
          style={{
            marginBottom: '1.5rem',
            padding: '1rem 1.25rem',
            backgroundColor: 'var(--state-danger-bg)',
            border: '1px solid var(--state-danger-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--state-danger-text)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <AlertTriangle size={20} />
            <span style={{ fontWeight: 700, fontSize: '0.95rem', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
              Mandatory Safety Notice
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.5, color: 'var(--text-primary)' }}>
            <strong>THIS PROTOTYPE IS NOT A CERTIFIED LIFE-SAFETY DEVICE.</strong> The hardware probes, firmware, backend alert engine, and monitoring dashboard are developed strictly as educational and demonstration aids for vocational workshop training. This system must never replace certified personal protective equipment (PPE), calibrated industrial gas detectors, or established workshop safety procedures.
          </p>
        </div>

        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={16} color="var(--primary)" />
              <span className="card-title">Prototype Operational Terms</span>
            </div>
          </div>

          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', lineHeight: 1.6 }}>
            <div>
              <h2 className="section-title" style={{ marginBottom: '0.4rem' }}>1. Acceptable Educational Use</h2>
              <p className="supporting-text">
                The SIH Training Safety platform is provided solely for vocational skills assessment, training demonstrations, and academic evaluation of IoT sensor architectures.
              </p>
            </div>

            <div>
              <h2 className="section-title" style={{ marginBottom: '0.4rem' }}>2. Sensor Calibration & Telemetry Accuracy</h2>
              <p className="supporting-text">
                Readings produced by connected microcontroller hardware (e.g. MQ series gas sensors, IMU vibration sensors) are uncalibrated prototype estimates. Numerical outputs should not be relied upon for critical industrial compliance, environmental safety certification, or legal dispute resolution.
              </p>
            </div>

            <div>
              <h2 className="section-title" style={{ marginBottom: '0.4rem' }}>3. Operator & Instructor Responsibility</h2>
              <p className="supporting-text">
                Workshop instructors and supervisors retain full and sole responsibility for physical safety within the training environment. The presence of this software does not reduce or modify the requirement for active human supervision during hazardous training exercises.
              </p>
            </div>

            <div>
              <h2 className="section-title" style={{ marginBottom: '0.4rem' }}>4. Availability and Performance Limitations</h2>
              <p className="supporting-text">
                As a student prototype, the system is provided "as is" without warranty of continuous network availability, zero packet loss, or uninterrupted service. Backend instances run locally on SQLite.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
