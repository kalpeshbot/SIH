import React from 'react';
import { Battery, BatteryCharging, Radio } from 'lucide-react';
import { Device } from '../../api/types';
import { StatusBadge } from '../common/StatusBadge';

interface DeviceStatusOverviewProps {
  devices: Device[];
}

export const DeviceStatusOverview: React.FC<DeviceStatusOverviewProps> = ({ devices }) => {
  if (devices.length === 0) {
    return (
      <div className="card" style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        No hardware devices registered.
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th>Device ID</th>
            <th>Type</th>
            <th>Status</th>
            <th>Zone</th>
            <th>Battery</th>
          </tr>
        </thead>
        <tbody>
          {devices.map((device) => (
            <tr key={device.id}>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                  <Radio size={14} color="var(--text-secondary)" />
                  {device.device_id}
                </div>
              </td>
              <td>{device.device_type}</td>
              <td>
                <StatusBadge status={device.status} />
              </td>
              <td>{device.zone_id || 'Unassigned'}</td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                  {device.battery > 90 ? (
                    <BatteryCharging size={14} color="var(--state-normal-text)" />
                  ) : (
                    <Battery size={14} color={device.battery < 20 ? 'var(--state-danger-text)' : 'var(--text-secondary)'} />
                  )}
                  <span>{device.battery}%</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
