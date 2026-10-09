const API_BASE = import.meta.env.VITE_API_BASE || '/api';
const TOKEN_KEY = 'labdesk.accessToken';

export type ApiError = Error & { status?: number; payload?: unknown };

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  } catch {
    throw new Error('Cannot reach the API gateway. Check that services and the gateway are running.');
  }

  const raw = await response.text();
  let payload: unknown;
  try {
    payload = raw ? JSON.parse(raw) : undefined;
  } catch {
    payload = raw;
  }

  if (!response.ok) {
    const message = typeof payload === 'object' && payload && 'error' in payload
      ? String((payload as { error: unknown }).error)
      : typeof payload === 'string' && payload.includes('<html')
        ? `Request failed (${response.status}). Check the service route and request body.`
        : `Request failed (${response.status})`;
    const error = new Error(message) as ApiError;
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload as T;
}

function post<T>(path: string, body: unknown) {
  return request<T>(path, { method: 'POST', body: JSON.stringify(body) });
}

export const tokenKey = TOKEN_KEY;

export const api = {
  login: (body: { email: string; password: string }) => post<{ token: string; user: Record<string, unknown> }>('/auth/login', body),
  register: (body: { email: string; password: string; name?: string; batch_id: string }) => post<{ token: string; user: Record<string, unknown> }>('/auth/register', body),
  me: () => request<Record<string, unknown>>('/auth/me'),
  health: () => fetch('/health').then(async (response) => {
    if (!response.ok) throw new Error(`Gateway health check failed (${response.status})`);
    return response.json() as Promise<{ status: string; services: string[] }>;
  }),
  environments: () => request<{ count: number; environments: Array<Record<string, unknown>> }>('/execution/environments'),
  listPracticals: () => request<Record<string, unknown>[]>('/practicals'),
  getPractical: (id: string) => request<Record<string, unknown>>(`/practicals/${encodeURIComponent(id)}`),
  createPractical: (body: Record<string, unknown>) => post<Record<string, unknown>>('/practicals', body),
  listAssessments: () => request<Record<string, unknown>[]>('/assessments'),
  getAssessment: (id: string) => request<Record<string, unknown>>(`/assessments/${encodeURIComponent(id)}`),
  createQuestion: (body: Record<string, unknown>) => post<Record<string, unknown>>('/assessments/questions', body),
  createAssessment: (body: Record<string, unknown>) => post<Record<string, unknown>>('/assessments', body),
  run: (body: Record<string, unknown>) => request<Record<string, unknown>>('/execution/execute?sync=true', {
    method: 'POST',
    body: JSON.stringify({ ...body, sync: true }),
  }),
  submit: (body: Record<string, unknown>) => post<Record<string, unknown>>('/submissions', body),
  listSubmissions: (submitterId?: string) => request<Record<string, unknown>[]>(
    submitterId ? `/submissions?submitter_id=${encodeURIComponent(submitterId)}` : '/submissions',
  ),
  getSubmission: (id: string) => request<Record<string, unknown>>(`/submissions/${encodeURIComponent(id)}`),
};

export function decodeToken(token: string): Record<string, unknown> {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '='))) as Record<string, unknown>;
  } catch {
    return {};
  }
}
