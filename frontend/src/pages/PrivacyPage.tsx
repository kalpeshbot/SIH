import React from 'react';
import { TopBar } from '../components/layout/TopBar';
import { Shield } from 'lucide-react';

export const PrivacyPage: React.FC = () => {
  return (
    <>
      <TopBar
        title="Prototype Privacy Policy"
        subtitle="Transparent overview of data handling, local telemetry storage, and prototype boundaries"
      />

      <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto', maxWidth: '840px' }}>
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Shield size={16} color="var(--primary)" />
              <span className="card-title">Prototype Data Collection Notice</span>
            </div>
          </div>

          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', lineHeight: 1.6 }}>
            <div>
              <h2 className="section-title" style={{ marginBottom: '0.4rem' }}>1. Scope and Nature of Prototype</h2>
              <p className="supporting-text">
                This platform is an academic and technical demonstration prototype built for vocational training monitoring. This policy describes how data is handled within this prototype environment. We do not operate a commercial cloud service or sell data.
              </p>
            </div>

            <div>
              <h2 className="section-title" style={{ marginBottom: '0.4rem' }}>2. Data Collected by the Platform</h2>
              <p className="supporting-text">
                The software processes and records the following data categories strictly for training session evaluation:
              </p>
              <ul style={{ paddingLeft: '1.5rem', marginTop: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                <li><strong>Trainee Identification:</strong> Student names and assigned identifiers (e.g. TRN-001).</li>
                <li><strong>Hardware Telemetry:</strong> Device identifiers, battery percentages, and operational status (ONLINE/OFFLINE).</li>
                <li><strong>Sensor Telemetry:</strong> Gas concentrations (CH4, CO), vibration levels, temperature, and timestamps.</li>
                <li><strong>Safety Alerts:</strong> Hazard threshold breach records, severity levels, and instructor acknowledgment logs.</li>
              </ul>
            </div>

            <div>
              <h2 className="section-title" style={{ marginBottom: '0.4rem' }}>3. Data Storage and Local Control</h2>
              <p className="supporting-text">
                All records are stored locally in an embedded SQLite database on the host machine running the backend. No telemetry is transmitted to third-party advertisers, cloud telemetry aggregators, or external trackers.
              </p>
            </div>

            <div>
              <h2 className="section-title" style={{ marginBottom: '0.4rem' }}>4. Data Retention and Export</h2>
              <p className="supporting-text">
                Instructors have full local control over recorded data. Session telemetry can be exported in CSV and JSON formats for offline review. Records can be removed directly via the management interface or by resetting the local database.
              </p>
            </div>

            <div>
              <h2 className="section-title" style={{ marginBottom: '0.4rem' }}>5. Prototype Limitations</h2>
              <p className="supporting-text">
                This software is intended for vocational training and educational demonstrations. It is not designed to satisfy formal regulatory privacy frameworks (such as certified medical or enterprise compliance suites) and should not be used for collecting sensitive personal data.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
