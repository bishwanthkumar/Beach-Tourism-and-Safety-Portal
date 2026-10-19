import axios from 'axios';

const defaultApiUrl = import.meta.env.PROD
  ? '/api'
  : '/api';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || defaultApiUrl,
  timeout: 12000
});

export async function searchBeaches(q) {
  const { data } = await API.get('/beaches', { params: { q, limit: 30 } });
  return data.data || [];
}

export async function getBeachFull(id) {
  const { data } = await API.get(`/beaches/${id}/full`);
  return data.data;
}

export async function submitReport(payload) {
  const { data } = await API.post('/reports', payload);
  return data;
}
