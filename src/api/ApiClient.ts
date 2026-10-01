import { AppData } from '../types/AppData';
import { AppResponse } from '../types/AppResponse';

export class ApiClient {
    async fetchApp(id: number): Promise<AppResponse> {
        const resp = await this.apiFetch(`/api/apps/${id}`);
        return resp.json();
    }

    async createApp(data: AppData): Promise<Response> {
        return this.apiFetch('/api/apps', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    }

    async updateApp(id: number, data: AppData): Promise<Response> {
        return this.apiFetch(`/api/apps/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    }

    async deleteApp(id: number): Promise<void> {
        await this.apiFetch(`/api/apps/${id}`, { method: 'DELETE' });
    }

    async reorderApps(ids: number[]): Promise<void> {
        await this.apiFetch('/api/apps/reorder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids })
        });
    }

    async fetchIcons(query: string, offset: number, limit: number, signal?: AbortSignal): Promise<{ icons: string[]; total: number }> {
        const params = new URLSearchParams({
            search: query,
            offset: offset.toString(),
            limit: limit.toString()
        });
        const resp = await this.apiFetch(`/api/icons?${params}`, { signal });
        return resp.json();
    }

    private async apiFetch(url: string, options?: RequestInit): Promise<Response> {
        const resp = await fetch(url, options);
        if (!resp.ok) {
            const err = await resp.text();
            throw new Error(err || `HTTP ${resp.status}`);
        }
        return resp;
    }
}

const apiClient = new ApiClient();

export const fetchApp = (id: number) => apiClient.fetchApp(id);
export const createApp = (data: AppData) => apiClient.createApp(data);
export const updateApp = (id: number, data: AppData) => apiClient.updateApp(id, data);
export const deleteApp = (id: number) => apiClient.deleteApp(id);
export const reorderApps = (ids: number[]) => apiClient.reorderApps(ids);
export const fetchIcons = (query: string, offset: number, limit: number, signal?: AbortSignal) => apiClient.fetchIcons(query, offset, limit, signal);
