export interface User {
  id: number;
  username: string;
  email: string;
  api_key: string;
  max_files: number;
  max_file_size: number;
  max_storage: number;
  created_at: string;
  updated_at: string;
}

export interface UserStats {
  total_files: number;
  total_size: number;
  max_files: number;
  max_file_size: number;
  max_storage: number;
}

export interface UserSettings {
  max_files: number;
  max_file_size: number;
  max_storage: number;
}

export interface File {
  id: number;
  user_id: number;
  filename: string;
  original_name: string;
  file_path: string;
  folder_path: string;
  file_size: number;
  mime_type: string;
  url: string;
  created_at: string;
}

export interface Pagination {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface FilesResponse {
  files: File[];
  pagination: Pagination;
}

export interface FolderNode {
  name: string;
  path: string;
  children: FolderNode[];
  fileCount?: number;
}
