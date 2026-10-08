import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient, ApiError } from '../api/client';

describe('API Client Error Handling', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('maps 404 status into user-friendly message', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ detail: 'Not Found' }),
    });

    await expect(apiClient.get('/api/sessions/999')).rejects.toThrow(
      'Requested record was not found.'
    );
  });

  it('maps 409 conflict errors with backend detail', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ detail: 'Cannot delete device with existing readings.' }),
    });

    await expect(apiClient.delete('/api/devices/1')).rejects.toThrow(
      'Cannot delete device with existing readings.'
    );
  });

  it('maps 422 validation errors with field error breakdown', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        detail: [
          { loc: ['body', 'name'], msg: 'Field must not be empty' },
        ],
      }),
    });

    try {
      await apiClient.post('/api/trainees', { trainee_id: 'TRN-1', name: '' });
      expect.unreachable('Should have thrown ApiError');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(422);
      expect(apiErr.fieldErrors?.['body.name']).toBe('Field must not be empty');
    }
  });

  it('handles offline network connection failure gracefully', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'));

    await expect(apiClient.get('/health')).rejects.toThrow(
      'Unable to connect to the backend server. Verify the service is running.'
    );
  });
});
