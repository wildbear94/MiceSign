import apiClient from '../../../api/client';
import type { ApiResponse } from '../../../types/api';
import type { Attachment } from '../types/document';

export const attachmentApi = {
  upload: (docId: number, file: File, onProgress?: (percent: number) => void, signal?: AbortSignal) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post<ApiResponse<Attachment>>(`/documents/${docId}/attachments`, formData, {
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      },
      signal,
    }).then(r => r.data.data!);
  },

  download: async (attachmentId: number): Promise<{ blob: Blob; filename: string }> => {
    const response = await apiClient.get(`/documents/attachments/${attachmentId}/download`, {
      responseType: 'blob',
    });
    const disposition = response.headers['content-disposition'] ?? '';
    const filenameMatch = disposition.match(/filename\*=UTF-8''(.+)|filename="?(.+?)"?$/);
    const filename = filenameMatch
      ? decodeURIComponent(filenameMatch[1] || filenameMatch[2] || 'download')
      : 'download';
    return { blob: response.data, filename };
  },

  delete: (attachmentId: number) =>
    apiClient.delete(`/documents/attachments/${attachmentId}`),
};
