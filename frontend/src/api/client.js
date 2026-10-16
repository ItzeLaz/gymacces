const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details ?? [];
  }
}

// Escucha global de sesiones inválidas (la registra AuthContext)
let onUnauthenticated = null;
export function setUnauthenticatedHandler(handler) {
  onUnauthenticated = handler;
}

export function getStoredToken() {
  try {
    return sessionStorage.getItem('gym_token');
  } catch {
    return null;
  }
}

// Envía una solicitud a la API y devuelve { data, meta, message }
export async function apiRequest(path, { method = 'GET', body, token = getStoredToken(), query } = {}) {
  const url = new URL(`${API_URL}${path}`);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
    });
  }

  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'No se pudo conectar con el servidor.');
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = payload?.error ?? {};
    const apiError = new ApiError(
      response.status,
      error.code ?? 'INTERNAL_ERROR',
      error.message ?? 'Ocurrió un error inesperado. Intenta de nuevo más tarde.',
      error.details,
    );
    if (response.status === 401 && error.code === 'UNAUTHENTICATED' && onUnauthenticated) {
      onUnauthenticated();
    }
    throw apiError;
  }

  return { data: payload?.data, meta: payload?.meta, message: payload?.message };
}

// Convierte los detalles de validación en { campo: mensaje }
export function fieldErrors(error) {
  if (!(error instanceof ApiError)) return {};
  return Object.fromEntries(error.details.map((detail) => [detail.field, detail.message]));
}
