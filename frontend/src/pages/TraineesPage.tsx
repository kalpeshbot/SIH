import React, { useEffect, useState, useCallback } from 'react';
import { TopBar } from '../components/layout/TopBar';
import { TableSkeleton } from '../components/common/LoadingSkeleton';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { CreateTraineeModal } from '../components/trainees/CreateTraineeModal';
import { getTrainees, getSessions, createTrainee, deleteTrainee } from '../api/endpoints';
import { Trainee, SessionRecord, TraineeCreate } from '../api/types';
import { Users, Plus, Search, Trash2 } from 'lucide-react';

export const TraineesPage: React.FC = () => {
  const [trainees, setTrainees] = useState<Trainee[]>([]);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deletingTrainee, setDeletingTrainee] = useState<Trainee | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [traineesData, sessionsData] = await Promise.all([
        getTrainees(),
        getSessions(),
      ]);
      setTrainees(traineesData);
      setSessions(sessionsData);
      setError(null);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError('Failed to retrieve trainee records.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async (data: TraineeCreate) => {
    await createTrainee(data);
    await fetchData();
  };

  const handleDelete = async () => {
    if (!deletingTrainee) return;
    setIsDeleting(true);
    try {
      await deleteTrainee(deletingTrainee.id);
      setDeletingTrainee(null);
      await fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete trainee record.');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredTrainees = trainees.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.trainee_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <TopBar
        title="Trainee Management Roster"
        subtitle="Manage vocational student profiles and track session assignments"
      />

      <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            marginBottom: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Search by trainee name or identifier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2rem' }}
            />
            <Search
              size={14}
              color="var(--text-muted)"
              style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)' }}
            />
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus size={16} />
            Register Trainee
          </button>
        </div>

        {error ? (
          <ErrorState message={error} onRetry={fetchData} />
        ) : loading ? (
          <TableSkeleton rows={4} cols={5} />
        ) : filteredTrainees.length === 0 ? (
          <EmptyState
            title="No Trainees Found"
            description={
              searchQuery
                ? 'No trainees match your search query.'
                : 'No trainee profiles currently exist in the database.'
            }
            actionLabel="Register Trainee"
            onAction={() => setIsCreateOpen(true)}
            icon={<Users size={36} color="var(--text-muted)" />}
          />
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Trainee ID</th>
                  <th>Full Name</th>
                  <th>Current Active Session</th>
                  <th>Registered On</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrainees.map((trainee) => {
                  const activeSession = sessions.find(
                    (s) => s.trainee_id === trainee.trainee_id && (s.status === 'ACTIVE' || s.status === 'PAUSED')
                  );

                  return (
                    <tr key={trainee.id}>
                      <td>
                        <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                          {trainee.trainee_id}
                        </span>
                      </td>
                      <td style={{ fontWeight: 500 }}>{trainee.name}</td>
                      <td>
                        {activeSession ? (
                          <span className="badge badge-normal">
                            ACTIVE: {activeSession.session_id}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                            Idle
                          </span>
                        )}
                      </td>
                      <td className="mono" style={{ fontSize: '0.8rem' }}>
                        {new Date(trainee.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-secondary btn-icon btn-sm"
                          onClick={() => setDeletingTrainee(trainee)}
                          title="Delete trainee profile"
                          aria-label={`Delete ${trainee.name}`}
                        >
                          <Trash2 size={13} color="var(--state-danger-text)" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateTraineeModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreate}
      />

      <ConfirmDialog
        isOpen={deletingTrainee !== null}
        onClose={() => setDeletingTrainee(null)}
        onConfirm={handleDelete}
        title="Delete Trainee Profile?"
        message={`Are you sure you want to delete ${deletingTrainee?.name} (${deletingTrainee?.trainee_id})? If this trainee has historical session records, the backend will prevent deletion.`}
        confirmLabel="Delete Trainee"
        isDestructive={true}
        isLoading={isDeleting}
      />
    </>
  );
};
