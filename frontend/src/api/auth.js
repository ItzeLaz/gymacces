import { apiRequest } from './client.js';

export async function login(correo, password) {
  const { data } = await apiRequest('/auth/login', {
    method: 'POST',
    body: { correo, password },
    token: null,
  });
  return data;
}

export async function getMe(token) {
  const { data } = await apiRequest('/auth/me', { token });
  return data;
}
