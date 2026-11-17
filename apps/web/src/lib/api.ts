import { getSession, signIn } from "next-auth/react";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export type Account = { id: string; name: string; createdAt: string; updatedAt: string };
export type Category = { id: string; name: string; color?: string | null; createdAt: string; updatedAt: string };
export type Transaction = {
  id: string;
  type: 'EXPENSE' | 'INCOME' | 'TRANSFER';
  date: string;
  description: string;
  amount: string; // Decimal as string
  consolidated: boolean; // indica se a transação foi consolidada/paga
  account: Account;
  category?: Category | null;
  accountId: string;
  categoryId?: string | null;
  groupId?: string | null;
};
export type Subscription = {
  id: string;
  name: string;
  startDate: string;
  monthlyValue: string;
  autoRenewal: boolean;
  nextRenewalDate?: string | null;
  endDate?: string | null;
  createdAt: string;
  updatedAt: string;
};

async function authHeaders(): Promise<Record<string, string>> {
  const session = await getSession();
  const token = session?.accessToken;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as any),
    ...(await authHeaders()),
  };

  let res = await fetch(`${BASE_URL}${path}`, { ...init, headers });

  if (res.status === 401) {
    await signIn("google", { redirect: false });
    const retryHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...(init?.headers as any),
      ...(await authHeaders()),
    };
    res = await fetch(`${BASE_URL}${path}`, { ...init, headers: retryHeaders });
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function listAccounts() {
  return apiFetch<Account[]>('/accounts');
}

export async function createAccount(name: string) {
  return apiFetch<Account>('/accounts', { method: 'POST', body: JSON.stringify({ name }) });
}

export async function updateAccount(id: string, name: string) {
  return apiFetch<Account>(`/accounts/${id}`, { method: 'PUT', body: JSON.stringify({ name }) });
}

export async function deleteAccount(id: string) {
  return apiFetch<{ ok: true }>(`/accounts/${id}`, { method: 'DELETE' });
}

export async function listCategories() {
  return apiFetch<Category[]>('/categories');
}

export async function createCategory(name: string) {
  return apiFetch<Category>('/categories', { method: 'POST', body: JSON.stringify({ name }) });
}

export async function updateCategory(id: string, name: string) {
  return apiFetch<Category>(`/categories/${id}`, { method: 'PUT', body: JSON.stringify({ name }) });
}

export async function deleteCategory(id: string) {
  return apiFetch<{ ok: true }>(`/categories/${id}`, { method: 'DELETE' });
}

export async function listTransactions(params: { from?: string; to?: string; accountId?: string; q?: string }) {
  const qs = new URLSearchParams();
  if (params.from) qs.set('from', params.from);
  if (params.to) qs.set('to', params.to);
  if (params.accountId) qs.set('accountId', params.accountId);
  if (params.q) qs.set('q', params.q);
  const qstr = qs.toString();
  return apiFetch<Transaction[]>(`/transactions${qstr ? `?${qstr}` : ''}`);
}

export async function createTransaction(body: any) {
  return apiFetch<any>('/transactions', { method: 'POST', body: JSON.stringify(body) });
}

export async function updateTransaction(id: string, body: any) {
  return apiFetch<any>(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function deleteTransaction(id: string) {
  return apiFetch<any>(`/transactions/${id}`, { method: 'DELETE' });
}

export async function exportUrl(params: { from: string; to: string; accountId?: string; format: 'csv' | 'xlsx' }) {
  const qs = new URLSearchParams();
  qs.set('from', params.from);
  qs.set('to', params.to);
  qs.set('format', params.format);
  if (params.accountId) qs.set('accountId', params.accountId);

  // download requires auth header; we'll do a fetch download in UI instead of direct URL
  return `${BASE_URL}/export?${qs.toString()}`;
}

export async function previewImport(accountId: string, file: File) {
  const headers = await authHeaders();
  const form = new FormData();
  form.append('file', file);

  let res = await fetch(`${BASE_URL}/import/preview?accountId=${encodeURIComponent(accountId)}`, {
    method: 'POST',
    headers,
    body: form,
  });

  if (res.status === 401) {
    await signIn("google", { redirect: false });
    const retryHeaders = await authHeaders();
    res = await fetch(`${BASE_URL}/import/preview?accountId=${encodeURIComponent(accountId)}`, {
      method: 'POST',
      headers: retryHeaders,
      body: form,
    });
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Preview failed ${res.status}: ${text || res.statusText}`);
  }

  return res.json();
}

export async function importFile(accountId: string, file: File) {
  const headers = await authHeaders();
  const form = new FormData();
  form.append('file', file);

  let res = await fetch(`${BASE_URL}/import?accountId=${encodeURIComponent(accountId)}`, {
    method: 'POST',
    headers,
    body: form,
  });

  if (res.status === 401) {
    await signIn("google", { redirect: false });
    const retryHeaders = await authHeaders();
    res = await fetch(`${BASE_URL}/import?accountId=${encodeURIComponent(accountId)}`, {
      method: 'POST',
      headers: retryHeaders,
      body: form,
    });
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Import failed ${res.status}: ${text || res.statusText}`);
  }

  return res.json();
}

export async function downloadExport(params: { from: string; to: string; accountId?: string; format: 'csv' | 'xlsx' }) {
  const headers = await authHeaders();
  const qs = new URLSearchParams();
  qs.set('from', params.from);
  qs.set('to', params.to);
  qs.set('format', params.format);
  if (params.accountId) qs.set('accountId', params.accountId);

  let res = await fetch(`${BASE_URL}/export?${qs.toString()}`, { headers });

  if (res.status === 401) {
    await signIn("google", { redirect: false });
    const retryHeaders = await authHeaders();
    res = await fetch(`${BASE_URL}/export?${qs.toString()}`, { headers: retryHeaders });
  }

  if (!res.ok) throw new Error(`Export failed ${res.status}`);

  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match?.[1] || `export.${params.format}`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export type Webhook = {
  id: string;
  name: string;
  url: string;
  events: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export async function listSubscriptions() {
  return apiFetch<Subscription[]>('/subscriptions');
}

export async function createSubscription(data: {
  name: string;
  startDate: string;
  monthlyValue: number;
  autoRenewal?: boolean;
  nextRenewalDate?: string | null;
  endDate?: string | null;
}) {
  return apiFetch<Subscription>('/subscriptions', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateSubscription(id: string, data: {
  name?: string;
  startDate?: string;
  monthlyValue?: number;
  autoRenewal?: boolean;
  nextRenewalDate?: string | null;
  endDate?: string | null;
}) {
  return apiFetch<Subscription>(`/subscriptions/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteSubscription(id: string) {
  return apiFetch<{ ok: true }>(`/subscriptions/${id}`, { method: 'DELETE' });
}

export async function listWebhooks() {
  return apiFetch<Webhook[]>('/webhooks');
}

export async function createWebhook(data: { name: string; url: string; events: string[] }) {
  return apiFetch<Webhook>('/webhooks', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateWebhook(id: string, data: { name?: string; url?: string; events?: string[]; active?: boolean }) {
  return apiFetch<Webhook>(`/webhooks/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteWebhook(id: string) {
  return apiFetch<{ ok: true }>(`/webhooks/${id}`, { method: 'DELETE' });
}

export async function testDiscordAlerts() {
  return apiFetch<{ ok: true }>('/discord-alerts/test', { method: 'POST' });
}
