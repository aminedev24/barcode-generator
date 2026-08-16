import { Capacitor } from '@capacitor/core';

const DEV_URL = 'http://localhost/barcode-generator/api';

function getBaseUrl(): string {
  if (Capacitor.isNativePlatform()) {
    return localStorage.getItem('api_base_url') || import.meta.env.VITE_API_URL || DEV_URL;
  }
  return import.meta.env.VITE_API_URL || DEV_URL;
}

export function setApiBaseUrl(url: string) {
  localStorage.setItem('api_base_url', url);
}

export function getApiBaseUrl(): string {
  return getBaseUrl();
}

async function request<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getBaseUrl()}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || res.statusText);
  }
  return res.json();
}

export interface ApiProduct {
  id: string;
  name: string;
  barcode: string;
  stock: number;
}

export const api = {
  products: {
    list:  ()               => request<ApiProduct[]>('/products.php'),
    create: (p: { id: string; name: string; barcode: string; stock?: number }) =>
              request('/products.php', { method: 'POST', body: JSON.stringify(p) }),
    update: (id: string, patch: Record<string, unknown>) =>
              request(`/products.php?id=${id}`, { method: 'PUT', body: JSON.stringify(patch) }),
    remove: (id: string)    => request(`/products.php?id=${id}`, { method: 'DELETE' }),
  },
};
