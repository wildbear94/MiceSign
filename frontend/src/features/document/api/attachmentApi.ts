import apiClient from '../../../api/client';
import type { ApiResponse } from '../../../types/api';
import type { AttachmentResponse } from '../types/document';

export const attachmentApi = {
  upload: async (
    documentId: number,
    file: File,
    onProgress: (percent: number) => void,
    signal?: AbortSignal,
  ): Promise<AttachmentResponse[]> => {
    const formData = new FormData();
    formData.append('files', file);
    const { data } = await apiClient.post<ApiResponse<AttachmentResponse[]>>(
      `/documents/${documentId}/attachments`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) onProgress(Math.round((e.loaded / e.total) * 100));
        },
        signal,
      },
    );
    return data.data!;
  },

  getByDocumentId: async (documentId: number): Promise<AttachmentResponse[]> => {
    const { data } = await apiClient.get<ApiResponse<AttachmentResponse[]>>(
      `/documents/${documentId}/attachments`,
    );
    return data.data!;
  },

  download: async (attachmentId: number): Promise<{ blob: Blob; filename: string }> => {
    const response = await apiClient.get(`/documents/attachments/${attachmentId}/download`, {
      responseType: 'blob',
    });
    // Extract filename from Content-Disposition header
    const disposition = response.headers['content-disposition'] ?? '';
    const filenameMatch = disposition.match(/filename\*=UTF-8''(.+)|filename="?(.+?)"?$/);
    const filename = filenameMatch
      ? decodeURIComponent(filenameMatch[1] || filenameMatch[2] || 'download')
      : 'download';
    return { blob: response.data, filename };
  },

  delete: async (attachmentId: number): Promise<void> => {
    await apiClient.delete(`/documents/attachments/${attachmentId}`);
  },
};
