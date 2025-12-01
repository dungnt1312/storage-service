import { useState, useEffect, useMemo } from 'react';
import type { File as FileType, FolderNode, Pagination } from '../types';
import type { GetFilesParams } from '../api/files';
import { getFiles, getFolders, deleteFile, downloadFile, renameFile, renameFolder, deleteFolder } from '../api/files';
import UploadModal from '../components/UploadModal';
import RenameModal from '../components/RenameModal';
import FileEditor from '../components/FileEditor';
import {
  FileIcon, Image, FileText, Archive, Trash2, Download, ChevronRight, ChevronLeft,
  Loader2, Eye, Upload, CheckSquare, Square, X, Folder, FolderOpen, 
  ChevronDown, ChevronUp, Edit3, MoreVertical, FileEdit, Link, Copy, ArrowUpDown
} from 'lucide-react';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return Image;
  if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) return FileText;
  if (mimeType.includes('zip') || mimeType.includes('archive')) return Archive;
  return FileIcon;
}

function isTextFile(file: FileType): boolean {
  const textTypes = ['text/', 'application/json', 'application/xml', 'application/x-yaml'];
  if (textTypes.some(t => file.mime_type.includes(t))) return true;
  const ext = file.original_name.split('.').pop()?.toLowerCase();
  const textExts = ['txt', 'md', 'json', 'xml', 'html', 'css', 'csv', 'yaml', 'yml', 'ini', 'conf', 'log'];
  return textExts.includes(ext || '');
}

function buildFolderTree(folders: string[]): FolderNode[] {
  const root: FolderNode[] = [];
  
  folders.forEach(path => {
    if (!path) return;
    const parts = path.split('/');
    let current = root;
    let currentPath = '';
    
    parts.forEach((part, index) => {
      currentPath = index === 0 ? part : `${currentPath}/${part}`;
      let node = current.find(n => n.name === part);
      if (!node) {
        node = { name: part, path: currentPath, children: [] };
        current.push(node);
      }
      current = node.children;
    });
  });
  
  return root;
}

interface FolderTreeProps {
  nodes: FolderNode[];
  currentPath: string;
  onSelect: (path: string) => void;
  onRename: (path: string, name: string) => void;
  onDelete: (path: string) => void;
  level?: number;
  expandedPaths: Set<string>;
  toggleExpanded: (path: string) => void;
}

function FolderTree({ nodes, currentPath, onSelect, onRename, onDelete, level = 0, expandedPaths, toggleExpanded }: FolderTreeProps) {
  const [contextMenu, setContextMenu] = useState<{ path: string; x: number; y: number } | null>(null);

  const handleContextMenu = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ path, x: e.clientX, y: e.clientY });
  };

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  return (
    <div style={{ paddingLeft: level > 0 ? '12px' : '0' }}>
      {nodes.map(node => {
        const isExpanded = expandedPaths.has(node.path);
        const isSelected = currentPath === node.path;
        const hasChildren = node.children.length > 0;
        
        return (
          <div key={node.path}>
            <div
              className={`flex items-center gap-1 py-1 px-2 rounded cursor-pointer text-sm group ${
                isSelected ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
              }`}
              onContextMenu={(e) => handleContextMenu(e, node.path)}
            >
              {hasChildren && (
                <button
                  onClick={(e) => { e.stopPropagation(); toggleExpanded(node.path); }}
                  className="p-0.5"
                >
                  {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </button>
              )}
              {!hasChildren && <div className="w-4" />}
              <div
                className="flex items-center gap-1.5 flex-1 min-w-0"
                onClick={() => onSelect(node.path)}
              >
                {isExpanded || isSelected ? (
                  <FolderOpen className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                ) : (
                  <Folder className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                )}
                <span className="truncate">{node.name}</span>
              </div>
              <button
                onClick={(e) => handleContextMenu(e, node.path)}
                className="p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="w-3 h-3" />
              </button>
            </div>
            {hasChildren && isExpanded && (
              <FolderTree
                nodes={node.children}
                currentPath={currentPath}
                onSelect={onSelect}
                onRename={onRename}
                onDelete={onDelete}
                level={level + 1}
                expandedPaths={expandedPaths}
                toggleExpanded={toggleExpanded}
              />
            )}
          </div>
        );
      })}
      
      {contextMenu && (
        <div
          className="fixed bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1 z-50"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              const name = contextMenu.path.split('/').pop() || '';
              onRename(contextMenu.path, name);
              setContextMenu(null);
            }}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700"
          >
            <Edit3 className="w-4 h-4" />
            Rename
          </button>
          <button
            onClick={() => {
              onDelete(contextMenu.path);
              setContextMenu(null);
            }}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-red-400 hover:bg-gray-700"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

type SortField = 'name' | 'size' | 'created_at' | 'updated_at';
type SortOrder = 'asc' | 'desc';

export default function Files() {
  const [files, setFiles] = useState<FileType[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileType | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [currentFolder, setCurrentFolder] = useState('');
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  
  // Sort state
  const [sortBy, setSortBy] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  
  // Rename modal state
  const [renameModal, setRenameModal] = useState<{ type: 'file' | 'folder'; id?: number; path?: string; name: string } | null>(null);
  
  // Editor modal state
  const [editorFile, setEditorFile] = useState<FileType | null>(null);
  
  // Copy feedback
  const [copiedId, setCopiedId] = useState<number | string | null>(null);

  const folderTree = useMemo(() => buildFolderTree(folders), [folders]);

  const subFolders = useMemo(() => {
    const prefix = currentFolder ? `${currentFolder}/` : '';
    const subs = new Set<string>();
    folders.forEach(f => {
      if (currentFolder === '' && !f.includes('/')) {
        subs.add(f);
      } else if (f.startsWith(prefix)) {
        const rest = f.slice(prefix.length);
        const nextPart = rest.split('/')[0];
        if (nextPart) subs.add(nextPart);
      }
    });
    return Array.from(subs);
  }, [folders, currentFolder]);

  const fetchFiles = async (params: GetFilesParams = {}) => {
    setLoading(true);
    try {
      const data = await getFiles({
        folder: currentFolder,
        sortBy,
        sortOrder,
        ...params,
      });
      setFiles(data.files || []);
      setPagination(data.pagination);
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Failed to fetch files:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFolders = async () => {
    try {
      const foldersData = await getFolders();
      setFolders(foldersData);
    } catch (error) {
      console.error('Failed to fetch folders:', error);
    }
  };

  useEffect(() => {
    fetchFolders();
  }, []);

  useEffect(() => {
    fetchFiles({ page: 1 });
  }, [currentFolder, sortBy, sortOrder]);

  const toggleSelect = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    if (selectedIds.size === files.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(files.map(f => f.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected file(s)?`)) return;

    setDeleting(true);
    try {
      await Promise.all(Array.from(selectedIds).map(id => deleteFile(id)));
      fetchFiles({ page: 1 });
      fetchFolders();
    } catch (error) {
      console.error('Failed to delete files:', error);
    } finally {
      setDeleting(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handlePageChange = (page: number) => {
    fetchFiles({ page });
  };

  const handleDownload = async (file: FileType) => {
    try {
      await downloadFile(file.id, file.original_name);
    } catch (error) {
      console.error('Failed to download file:', error);
    }
  };

  const copyToClipboard = async (text: string, id: number | string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const copyFileUrl = (file: FileType) => {
    copyToClipboard(file.url, file.id);
  };

  const copySelectedUrls = () => {
    const urls = files
      .filter(f => selectedIds.has(f.id))
      .map(f => f.url)
      .join('\n');
    copyToClipboard(urls, 'selected');
  };

  const toggleExpanded = (path: string) => {
    const newExpanded = new Set(expandedPaths);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedPaths(newExpanded);
  };

  const navigateToFolder = (path: string) => {
    setCurrentFolder(path);
    setSelectedIds(new Set());
    if (path) {
      const parts = path.split('/');
      const newExpanded = new Set(expandedPaths);
      let current = '';
      parts.forEach((part, i) => {
        current = i === 0 ? part : `${current}/${part}`;
        newExpanded.add(current);
      });
      setExpandedPaths(newExpanded);
    }
  };

  const handleRenameFile = async (newName: string) => {
    if (!renameModal?.id) return;
    await renameFile(renameModal.id, newName);
    fetchFiles({ page: pagination?.page || 1 });
  };

  const handleRenameFolder = async (newName: string) => {
    if (!renameModal?.path) return;
    await renameFolder(renameModal.path, newName);
    fetchFolders();
    fetchFiles({ page: 1 });
  };

  const handleDeleteFolder = async (path: string) => {
    if (!confirm(`Delete folder "${path}" and all its contents?`)) return;
    try {
      await deleteFolder(path);
      if (currentFolder === path || currentFolder.startsWith(path + '/')) {
        setCurrentFolder('');
      }
      fetchFolders();
    } catch (error) {
      console.error('Failed to delete folder:', error);
    }
  };

  const breadcrumbs = currentFolder ? currentFolder.split('/') : [];

  if (loading && files.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Sidebar - Folder Tree */}
      <div className="w-56 bg-gray-800 border-r border-gray-700 p-3 overflow-auto flex-shrink-0">
        <p className="text-xs text-gray-500 uppercase mb-2 px-2">Folders</p>
        {folderTree.length > 0 ? (
          <FolderTree
            nodes={folderTree}
            currentPath={currentFolder}
            onSelect={navigateToFolder}
            onRename={(path, name) => setRenameModal({ type: 'folder', path, name })}
            onDelete={handleDeleteFolder}
            expandedPaths={expandedPaths}
            toggleExpanded={toggleExpanded}
          />
        ) : (
          <p className="text-gray-500 text-sm px-2">No folders yet</p>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const parts = currentFolder.split('/');
                parts.pop();
                navigateToFolder(parts.join('/'));
              }}
              disabled={!currentFolder}
              className="p-1.5 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1 text-sm">
              <button
                onClick={() => navigateToFolder('')}
                className={currentFolder === '' ? 'text-white font-medium' : 'text-gray-400 hover:text-white'}
              >
                Files
              </button>
              {breadcrumbs.map((crumb, i) => (
                <span key={i} className="flex items-center gap-1">
                  <ChevronRight className="w-3 h-3 text-gray-600" />
                  <button
                    onClick={() => navigateToFolder(breadcrumbs.slice(0, i + 1).join('/'))}
                    className={i === breadcrumbs.length - 1 ? 'text-white font-medium' : 'text-gray-400 hover:text-white'}
                  >
                    {crumb}
                  </button>
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Sort dropdown */}
            <div className="relative group">
              <button className="flex items-center gap-1 px-2 py-1.5 text-gray-400 hover:text-white text-sm rounded hover:bg-gray-700">
                <ArrowUpDown className="w-4 h-4" />
                <span className="hidden sm:inline">Sort</span>
              </button>
              <div className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1 hidden group-hover:block z-10 min-w-[140px]">
                {[
                  { field: 'name' as SortField, label: 'Name' },
                  { field: 'size' as SortField, label: 'Size' },
                  { field: 'created_at' as SortField, label: 'Created' },
                  { field: 'updated_at' as SortField, label: 'Updated' },
                ].map(({ field, label }) => (
                  <button
                    key={field}
                    onClick={() => handleSort(field)}
                    className={`flex items-center justify-between w-full px-3 py-1.5 text-sm hover:bg-gray-700 ${
                      sortBy === field ? 'text-blue-400' : 'text-gray-300'
                    }`}
                  >
                    {label}
                    {sortBy === field && (
                      <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Upload className="w-4 h-4" />
              Upload
            </button>
          </div>
        </div>

        {/* Toolbar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-4 px-4 py-2 bg-gray-800 border-b border-gray-700">
            <span className="text-gray-300 text-sm">{selectedIds.size} selected</span>
            <div className="flex-1" />
            <button
              onClick={copySelectedUrls}
              className="flex items-center gap-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors"
            >
              {copiedId === 'selected' ? <Copy className="w-4 h-4 text-green-400" /> : <Link className="w-4 h-4" />}
              {copiedId === 'selected' ? 'Copied!' : 'Copy URLs'}
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={deleting}
              className="flex items-center gap-2 px-3 py-1 bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white text-sm rounded transition-colors"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Delete
            </button>
            <button onClick={() => setSelectedIds(new Set())} className="p-1 text-gray-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* File List */}
        <div className="flex-1 overflow-auto p-4">
          {subFolders.length === 0 && files.length === 0 && !loading ? (
            <div className="text-center py-12">
              <Folder className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-300">Empty folder</h3>
              <p className="text-gray-500 mb-4">Upload files to get started</p>
              <button
                onClick={() => setShowUpload(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                <Upload className="w-4 h-4" />
                Upload Files
              </button>
            </div>
          ) : (
            <div>
              {files.length > 0 && (
                <div className="flex items-center gap-2 mb-3">
                  <button
                    onClick={selectAll}
                    className="flex items-center gap-2 px-2 py-1 text-gray-400 hover:text-white text-sm transition-colors"
                  >
                    {selectedIds.size === files.length && files.length > 0 ? (
                      <CheckSquare className="w-4 h-4" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                    {selectedIds.size === files.length ? 'Deselect All' : 'Select All'}
                  </button>
                  <span className="text-gray-600">|</span>
                  <span className="text-gray-500 text-sm">
                    {pagination ? `${pagination.total} file(s)` : `${files.length} file(s)`}
                  </span>
                </div>
              )}

              {/* Subfolders */}
              {subFolders.length > 0 && (
                <div className="mb-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                    {subFolders.map(folder => {
                      const fullPath = currentFolder ? `${currentFolder}/${folder}` : folder;
                      return (
                        <div
                          key={folder}
                          className="flex flex-col items-center gap-1 p-3 rounded-lg hover:bg-gray-800 transition-colors group relative"
                        >
                          <button
                            onClick={() => navigateToFolder(fullPath)}
                            className="flex flex-col items-center gap-1"
                          >
                            <Folder className="w-10 h-10 text-yellow-400" />
                            <span className="text-gray-300 text-xs text-center truncate w-full">{folder}</span>
                          </button>
                          <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 flex gap-1">
                            <button
                              onClick={() => setRenameModal({ type: 'folder', path: fullPath, name: folder })}
                              className="p-1 bg-gray-700 hover:bg-gray-600 rounded"
                            >
                              <Edit3 className="w-3 h-3 text-gray-300" />
                            </button>
                            <button
                              onClick={() => handleDeleteFolder(fullPath)}
                              className="p-1 bg-gray-700 hover:bg-red-600 rounded"
                            >
                              <Trash2 className="w-3 h-3 text-gray-300" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Files in list view */}
              {files.length > 0 && (
                <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700 text-left">
                        <th className="p-3 w-10"></th>
                        <th className="p-3 text-gray-400 text-sm font-medium">Name</th>
                        <th className="p-3 text-gray-400 text-sm font-medium w-24">Size</th>
                        <th className="p-3 text-gray-400 text-sm font-medium w-40">Modified</th>
                        <th className="p-3 text-gray-400 text-sm font-medium w-36">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {files.map(file => {
                        const Icon = getFileIcon(file.mime_type);
                        const isImage = file.mime_type.startsWith('image/');
                        const isEditable = isTextFile(file);
                        const isSelected = selectedIds.has(file.id);
                        
                        return (
                          <tr
                            key={file.id}
                            className={`border-b border-gray-700 last:border-0 hover:bg-gray-700/50 ${
                              isSelected ? 'bg-blue-900/20' : ''
                            }`}
                          >
                            <td className="p-3">
                              <button
                                onClick={() => toggleSelect(file.id)}
                                className="text-gray-400 hover:text-white"
                              >
                                {isSelected ? (
                                  <CheckSquare className="w-4 h-4 text-blue-400" />
                                ) : (
                                  <Square className="w-4 h-4" />
                                )}
                              </button>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-3">
                                {isImage ? (
                                  <img
                                    src={file.url}
                                    alt={file.original_name}
                                    className="w-8 h-8 object-cover rounded"
                                  />
                                ) : (
                                  <Icon className="w-5 h-5 text-gray-400" />
                                )}
                                <span className="text-white text-sm truncate">{file.original_name}</span>
                              </div>
                            </td>
                            <td className="p-3 text-gray-400 text-sm">{formatBytes(file.file_size)}</td>
                            <td className="p-3 text-gray-400 text-sm">{formatDate(file.created_at)}</td>
                            <td className="p-3">
                              <div className="flex items-center gap-1">
                                {isImage && (
                                  <button
                                    onClick={() => setPreviewFile(file)}
                                    className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-gray-600"
                                    title="Preview"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                )}
                                {isEditable && (
                                  <button
                                    onClick={() => setEditorFile(file)}
                                    className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-gray-600"
                                    title="Edit"
                                  >
                                    <FileEdit className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => setRenameModal({ type: 'file', id: file.id, name: file.original_name })}
                                  className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-gray-600"
                                  title="Rename"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => copyFileUrl(file)}
                                  className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-gray-600"
                                  title="Copy URL"
                                >
                                  {copiedId === file.id ? <Copy className="w-4 h-4 text-green-400" /> : <Link className="w-4 h-4" />}
                                </button>
                                <button
                                  onClick={() => handleDownload(file)}
                                  className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-gray-600"
                                  title="Download"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm(`Delete "${file.original_name}"?`)) {
                                      deleteFile(file.id).then(() => {
                                        fetchFiles({ page: pagination?.page || 1 });
                                        fetchFolders();
                                      });
                                    }
                                  }}
                                  className="p-1.5 text-gray-400 hover:text-red-400 rounded hover:bg-gray-600"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {pagination && pagination.total_pages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="p-2 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded hover:bg-gray-700"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(pagination.total_pages, 7) }, (_, i) => {
                      let page: number;
                      if (pagination.total_pages <= 7) {
                        page = i + 1;
                      } else if (pagination.page <= 4) {
                        page = i + 1;
                      } else if (pagination.page >= pagination.total_pages - 3) {
                        page = pagination.total_pages - 6 + i;
                      } else {
                        page = pagination.page - 3 + i;
                      }
                      return (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`px-3 py-1 text-sm rounded ${
                            pagination.page === page
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-400 hover:text-white hover:bg-gray-700'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.total_pages}
                    className="p-2 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded hover:bg-gray-700"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {previewFile && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewFile(null)}
        >
          <div className="max-w-4xl max-h-full">
            <img
              src={previewFile.url}
              alt={previewFile.original_name}
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />
            <p className="text-white text-center mt-2">{previewFile.original_name}</p>
          </div>
        </div>
      )}

      <UploadModal
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        onSuccess={() => {
          fetchFiles({ page: 1 });
          fetchFolders();
        }}
        currentFolder={currentFolder}
      />

      <RenameModal
        isOpen={!!renameModal}
        onClose={() => setRenameModal(null)}
        onSubmit={renameModal?.type === 'file' ? handleRenameFile : handleRenameFolder}
        currentName={renameModal?.name || ''}
        type={renameModal?.type || 'file'}
      />

      <FileEditor
        isOpen={!!editorFile}
        onClose={() => setEditorFile(null)}
        file={editorFile}
        onSave={() => fetchFiles({ page: pagination?.page || 1 })}
      />
    </div>
  );
}
