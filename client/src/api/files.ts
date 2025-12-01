import api from './client';
import type { File, FilesResponse } from '../types';

export interface GetFilesParams {
  page?: number;
  pageSize?: number;
  folder?: string;
  sortBy?: 'name' | 'size' | 'created_at' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
}

export const getFiles = async (params: GetFilesParams = {}): Promise<FilesResponse> => {
  const { page = 1, pageSize = 20, folder = '', sortBy = 'created_at', sortOrder = 'desc' } = params;
  const response = await api.get('/files', {
    params: { page, page_size: pageSize, folder, sort_by: sortBy, sort_order: sortOrder },
  });
  return response.data;
};

export const getFile = async (id: number): Promise<File> => {
  const response = await api.get(`/files/${id}`);
  return response.data;
};

export const getFolders = async (): Promise<string[]> => {
  const response = await api.get('/folders');
  return response.data.folders || [];
};

export const uploadFile = async (file: globalThis.File, folderPath?: string): Promise<{ message: string; file: File }> => {
  const formData = new FormData();
  formData.append('file', file);
  if (folderPath) {
    formData.append('folder_path', folderPath);
  }
  const response = await api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const uploadImage = async (file: globalThis.File, folderPath?: string): Promise<{ message: string; file: File }> => {
  const formData = new FormData();
  formData.append('image', file);
  if (folderPath) {
    formData.append('folder_path', folderPath);
  }
  const response = await api.post('/upload-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const deleteFile = async (id: number): Promise<{ message: string }> => {
  const response = await api.delete(`/files/${id}`);
  return response.data;
};

export const downloadFile = async (id: number, filename: string): Promise<void> => {
  const response = await api.get(`/download/${id}`, {
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const renameFile = async (id: number, name: string): Promise<{ message: string; file: File }> => {
  const response = await api.put(`/files/${id}/rename`, { name });
  return response.data;
};

export const renameFolder = async (path: string, newName: string): Promise<{ message: string }> => {
  const response = await api.put('/folders/rename', { path, new_name: newName });
  return response.data;
};

export const deleteFolder = async (path: string): Promise<{ message: string }> => {
  const response = await api.delete('/folders', { data: { path } });
  return response.data;
};

export const getFileContent = async (id: number): Promise<string> => {
  const response = await api.get(`/files/${id}/content`);
  return response.data.content;
};

export const updateFileContent = async (id: number, content: string): Promise<{ message: string; file: File }> => {
  const response = await api.put(`/files/${id}/content`, { content });
  return response.data;
};
