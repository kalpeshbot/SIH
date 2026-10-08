import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '../components/common/StatusBadge';
import { SeverityBadge } from '../components/common/SeverityBadge';
import { LiveMetricsBar } from '../components/dashboard/LiveMetricsBar';
import { EmptyState } from '../components/common/EmptyState';

describe('Common UI Components', () => {
  it('renders correct badge classes for semantic statuses', () => {
    const { container: c1 } = render(<StatusBadge status="ACTIVE" />);
    expect(c1.querySelector('.badge-normal')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();

    const { container: c2 } = render(<StatusBadge status="FAULT" />);
    expect(c2.querySelector('.badge-danger')).toBeInTheDocument();
    expect(screen.getByText('FAULT')).toBeInTheDocument();
  });

  it('renders severity badges correctly', () => {
    const { container } = render(<SeverityBadge severity="DANGER" />);
    expect(container.querySelector('.badge-danger')).toBeInTheDocument();
    expect(screen.getByText('DANGER')).toBeInTheDocument();
  });

  it('displays accurate metrics in LiveMetricsBar without placeholder math', () => {
    render(
      <LiveMetricsBar
        activeSessionsCount={3}
        onlineDevicesCount={5}
        openAlertsCount={2}
        traineesCount={8}
      />
    );

    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('REQUIRES ACTION')).toBeInTheDocument();
  });

  it('renders empty states with descriptive messages', () => {
    render(
      <EmptyState
        title="No Sessions Recorded"
        description="Initiate a training session to start telemetry logging."
      />
    );

    expect(screen.getByText('No Sessions Recorded')).toBeInTheDocument();
    expect(
      screen.getByText('Initiate a training session to start telemetry logging.')
    ).toBeInTheDocument();
  });
});
