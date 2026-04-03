import { http } from '../../core/httpClient';

export async function fetchMySubscription() {
  const res = await http.get('/api/v1/billing/me');
  return res.data?.data?.subscription || null;
}

export async function subscribePlan({ tier, interval, method }) {
  const res = await http.post('/api/v1/billing/subscribe', { tier, interval, method });
  return res.data;
}

export async function cancelSubscription() {
  const res = await http.post('/api/v1/billing/cancel-subscription');
  return res.data;
}

