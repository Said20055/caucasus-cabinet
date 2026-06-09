import apiClient from './client';

export interface ExternalConfigItem {
  id: number;
  name: string;
  display_name: string | null;
  protocol: string | null;
  raw_link: string;
  is_selected: boolean;
  is_active: boolean;
  last_seen_at: string | null;
}

export interface ExternalSourceListItem {
  id: number;
  name: string;
  url: string;
  is_active: boolean;
  refresh_interval_minutes: number;
  last_fetched_at: string | null;
  last_status: string | null;
  last_error: string | null;
  configs_count: number;
  selected_count: number;
}

export interface ExternalSourceListResponse {
  enabled: boolean;
  public_url: string | null;
  total_selected: number;
  sources: ExternalSourceListItem[];
}

export interface ExternalSourceDetail extends ExternalSourceListItem {
  configs: ExternalConfigItem[];
}

export interface RefreshResult {
  fetched: number;
  created: number;
  updated: number;
  deactivated: number;
  error: string | null;
}

const BASE = '/cabinet/admin/external-subscriptions';

export const externalSubsApi = {
  list: async (): Promise<ExternalSourceListResponse> => {
    const { data } = await apiClient.get<ExternalSourceListResponse>(BASE);
    return data;
  },

  get: async (id: number): Promise<ExternalSourceDetail> => {
    const { data } = await apiClient.get<ExternalSourceDetail>(`${BASE}/${id}`);
    return data;
  },

  create: async (payload: {
    name: string;
    url: string;
    refresh_interval_minutes?: number;
  }): Promise<ExternalSourceDetail> => {
    const { data } = await apiClient.post<ExternalSourceDetail>(BASE, payload);
    return data;
  },

  update: async (
    id: number,
    payload: Partial<{
      name: string;
      url: string;
      refresh_interval_minutes: number;
      is_active: boolean;
    }>,
  ): Promise<ExternalSourceDetail> => {
    const { data } = await apiClient.patch<ExternalSourceDetail>(`${BASE}/${id}`, payload);
    return data;
  },

  remove: async (id: number): Promise<void> => {
    await apiClient.delete(`${BASE}/${id}`);
  },

  refresh: async (id: number): Promise<RefreshResult> => {
    const { data } = await apiClient.post<RefreshResult>(`${BASE}/${id}/refresh`);
    return data;
  },

  setSelection: async (id: number, selectedIds: number[]): Promise<ExternalSourceDetail> => {
    const { data } = await apiClient.put<ExternalSourceDetail>(`${BASE}/${id}/selection`, {
      selected_ids: selectedIds,
    });
    return data;
  },

  renameConfig: async (
    sourceId: number,
    configId: number,
    displayName: string | null,
  ): Promise<ExternalSourceDetail> => {
    const { data } = await apiClient.patch<ExternalSourceDetail>(
      `${BASE}/${sourceId}/configs/${configId}`,
      { display_name: displayName },
    );
    return data;
  },
};
