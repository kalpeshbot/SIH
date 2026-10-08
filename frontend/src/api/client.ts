import { ApiErrorDetail } from './types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export class ApiError extends Error {
  status: number;
  fieldErrors?: Record<string, string>;

  constructor(detail: ApiErrorDetail) {
    super(detail.message);
    this.name = 'ApiError';
    this.status = detail.status;
    this.fieldErrors = detail.fieldErrors;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return {} as T;
  }

  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const data = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    let message = 'An unexpected server error occurred.';
    let fieldErrors: Record<string, string> | undefined;

    if (response.status === 400) {
      message = (data && data.detail) ? String(data.detail) : 'Invalid request parameters.';
    } else if (response.status === 404) {
      message = 'Requested record was not found.';
    } else if (response.status === 409) {
      message = (data && data.detail) ? String(data.detail) : 'This action conflicts with the current state.';
    } else if (response.status === 422) {
      message = 'Please check the entered information.';
      if (data && Array.isArray(data.detail)) {
        fieldErrors = {};
        for (const err of data.detail) {
          const loc = err.loc ? err.loc.join('.') : 'field';
          fieldErrors[loc] = err.msg || 'Invalid value';
        }
      }
    } else if (response.status >= 500) {
      message = 'Server error. Please verify backend service.';
    }

    throw new ApiError({
      message,
      status: response.status,
      fieldErrors
    });
  }

  return data as T;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });
    return await handleResponse<T>(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Network / offline error
    throw new ApiError({
      message: 'Unable to connect to the backend server. Verify the service is running.',
      status: 0,
    });
  }
}

export const apiClient = {
  get: <T>(endpoint: string) => apiRequest<T>(endpoint, { method: 'GET' }),
  post: <T>(endpoint: string, body?: unknown) =>
    apiRequest<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(endpoint: string, body?: unknown) =>
    apiRequest<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(endpoint: string) =>
    apiRequest<T>(endpoint, { method: 'DELETE' }),
};
