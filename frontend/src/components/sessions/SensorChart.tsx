import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { SensorReading } from '../../api/types';
import { Activity } from 'lucide-react';

interface SensorChartProps {
  readings: SensorReading[];
}

export const SensorChart: React.FC<SensorChartProps> = ({ readings }) => {
  const [selectedSensor, setSelectedSensor] = useState<string>('ALL');

  if (readings.length === 0) {
    return (
      <div className="card" style={{ padding: '2.5rem', textAlign: 'center', backgroundColor: 'var(--bg-subtle)' }}>
        <Activity size={32} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem' }} />
        <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>No Sensor Telemetry Ingested</h4>
        <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Hardware device has not posted readings to /api/readings for this session yet.
        </p>
      </div>
    );
  }

  // Extract unique sensor types
  const sensorTypes = Array.from(new Set(readings.map((r) => r.sensor_type)));

  // Filter readings
  const filteredReadings = selectedSensor === 'ALL'
    ? readings
    : readings.filter((r) => r.sensor_type === selectedSensor);

  // Format data for chart
  const chartData = filteredReadings.map((r) => ({
    timestamp: new Date(r.timestamp).toLocaleTimeString(),
    value: r.value,
    sensor: r.sensor_type,
    unit: r.unit,
    status: r.status,
  }));

  const sensorColors: Record<string, string> = {
    gas_ch4: '#dc2626',
    gas_co: '#d97706',
    vibration: '#0284c7',
    temperature: '#ea580c',
    pressure: '#16a34a',
    default: '#475569',
  };

  return (
    <div className="card">
      <div className="card-header" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Activity size={16} color="var(--primary)" />
          <span className="card-title">Telemetry Stream Visualization</span>
        </div>

        {sensorTypes.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span className="label">Sensor Filter:</span>
            <select
              className="form-select"
              value={selectedSensor}
              onChange={(e) => setSelectedSensor(e.target.value)}
              style={{ width: 'auto', padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}
            >
              <option value="ALL">All Sensors ({readings.length} data points)</option>
              {sensorTypes.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="card-body" style={{ height: '320px', padding: '1rem 0.5rem 0.5rem 0' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-main)" />
            <XAxis
              dataKey="timestamp"
              stroke="var(--text-muted)"
              fontSize={11}
              tickLine={false}
            />
            <YAxis
              stroke="var(--text-muted)"
              fontSize={11}
              tickLine={false}
              domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-main)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
                color: 'var(--text-primary)',
              }}
              formatter={(value: unknown, name: string | undefined, item: { payload?: { unit?: string; status?: string } }) => {
                const formattedValue = typeof value === 'number' ? value.toFixed(2) : String(value ?? '');
                const unit = item.payload?.unit ?? '';
                const status = item.payload?.status ? ` [${item.payload.status}]` : '';
                return [`${formattedValue} ${unit}${status}`, name ?? 'Reading'];
              }}
            />
            <Legend wrapperStyle={{ fontSize: '0.8rem', paddingTop: '10px' }} />
            <Line
              type="monotone"
              dataKey="value"
              name={selectedSensor === 'ALL' ? 'Sensor Value' : selectedSensor}
              stroke={sensorColors[selectedSensor] || sensorColors.default}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
