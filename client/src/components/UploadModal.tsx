import { useState, useRef, useCallback } from 'react';
import { uploadFile, uploadImage } from '../api/files';
import { Upload as UploadIcon, Image, FileText, X, Loader2, CheckCircle, Folder } from 'lucide-react';

type UploadMode = 'file' | 'image';

interface FileWithPath {
  file: File;
  path: string;
}

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentFolder?: string;
}

export default function UploadModal({ isOpen, onClose, onSuccess, currentFolder = '' }: UploadModalProps) {
  const [mode, setMode] = useState<UploadMode>('file');
  const [files, setFiles] = useState<FileWithPath[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setFiles([]);
    setError('');
    setSuccess(false);
    setUploadProgress({ current: 0, total: 0 });
    setMode('file');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    if (!uploading) {
      resetState();
      onClose();
    }
  };

  const processEntry = async (entry: FileSystemEntry, basePath: string = ''): Promise<FileWithPath[]> => {
    const results: FileWithPath[] = [];

    if (entry.isFile) {
      const fileEntry = entry as FileSystemFileEntry;
      const file = await new Promise<File>((resolve, reject) => {
        fileEntry.file(resolve, reject);
      });
      const path = basePath ? `${basePath}` : '';
      results.push({ file, path });
    } else if (entry.isDirectory) {
      const dirEntry = entry as FileSystemDirectoryEntry;
      const reader = dirEntry.createReader();
      const entries = await new Promise<FileSystemEntry[]>((resolve, reject) => {
        reader.readEntries(resolve, reject);
      });
      const newBasePath = basePath ? `${basePath}/${entry.name}` : entry.name;
      for (const childEntry of entries) {
        const childResults = await processEntry(childEntry, newBasePath);
        results.push(...childResults);
      }
    }

    return results;
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setError('');

    const items = e.dataTransfer.items;
    const allFiles: FileWithPath[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const entry = item.webkitGetAsEntry();
      if (entry) {
        try {
          const filesFromEntry = await processEntry(entry);
          allFiles.push(...filesFromEntry);
        } catch (err) {
          console.error('Error processing entry:', err);
        }
      }
    }

    if (mode === 'image') {
      const imageFiles = allFiles.filter(f => f.file.type.startsWith('image/'));
      if (imageFiles.length !== allFiles.length) {
        setError('Some non-image files were excluded in image mode');
      }
      setFiles(prev => [...prev, ...imageFiles]);
    } else {
      setFiles(prev => [...prev, ...allFiles]);
    }
  }, [mode]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const newFiles: FileWithPath[] = selectedFiles.map(file => ({
      file,
      path: '',
    }));
    setFiles(prev => [...prev, ...newFiles]);
    setError('');
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setError('');
    setUploadProgress({ current: 0, total: files.length });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < files.length; i++) {
      const { file, path } = files[i];
      const folderPath = currentFolder 
        ? (path ? `${currentFolder}/${path}` : currentFolder)
        : path;

      try {
        if (mode === 'image' && file.type.startsWith('image/')) {
          await uploadImage(file, folderPath);
        } else {
          await uploadFile(file, folderPath);
        }
        successCount++;
      } catch (err) {
        failCount++;
        console.error(`Failed to upload ${file.name}:`, err);
      }
      setUploadProgress({ current: i + 1, total: files.length });
    }

    setUploading(false);

    if (failCount === 0) {
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 1000);
    } else {
      setError(`${failCount} file(s) failed to upload. ${successCount} succeeded.`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={handleClose}>
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-white">Upload Files</h2>
            {currentFolder && (
              <p className="text-sm text-gray-400 flex items-center gap-1">
                <Folder className="w-3 h-3" />
                {currentFolder}
              </p>
            )}
          </div>
          <button onClick={handleClose} disabled={uploading} className="p-1 text-gray-400 hover:text-white disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-auto">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setMode('file')}
              disabled={uploading}
              className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                mode === 'file'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <FileText className="w-4 h-4" />
              General
            </button>
            <button
              onClick={() => setMode('image')}
              disabled={uploading}
              className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                mode === 'image'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <Image className="w-4 h-4" />
              Image (Optimized)
            </button>
          </div>

          <p className="text-xs text-gray-400 mb-4">
            {mode === 'file'
              ? 'Drag and drop files or folders. Folder structure will be preserved.'
              : 'Drag and drop images or folders. Images will be automatically optimized.'}
          </p>

          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            accept={mode === 'image' ? 'image/jpeg,image/png,image/gif' : '*'}
            multiple
            className="hidden"
          />

          <div
            onClick={() => !uploading && fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className={`border-2 border-dashed border-gray-600 rounded-lg p-6 text-center transition-colors ${
              uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-gray-500'
            }`}
          >
            <UploadIcon className="w-8 h-8 text-gray-500 mx-auto mb-2" />
            <p className="text-gray-300 text-sm mb-1">Click to select or drag files/folders here</p>
            <p className="text-gray-500 text-xs">Max file size: 10MB per file</p>
          </div>

          {files.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-300 text-sm font-medium">{files.length} file(s) selected</p>
                {!uploading && (
                  <button
                    onClick={() => setFiles([])}
                    className="text-xs text-gray-400 hover:text-white"
                  >
                    Clear all
                  </button>
                )}
              </div>
              <div className="max-h-40 overflow-auto space-y-1">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm bg-gray-700/50 rounded px-2 py-1">
                    <FileText className="w-3 h-3 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-300 truncate flex-1">
                      {f.path ? `${f.path}/` : ''}{f.file.name}
                    </span>
                    <span className="text-gray-500 text-xs flex-shrink-0">
                      {(f.file.size / 1024).toFixed(1)} KB
                    </span>
                    {!uploading && (
                      <button onClick={() => removeFile(i)} className="text-gray-400 hover:text-red-400">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {uploading && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-300 text-sm">Uploading...</span>
                <span className="text-gray-400 text-sm">{uploadProgress.current}/{uploadProgress.total}</span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="mt-3 p-2 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-3 p-2 bg-green-900/50 border border-green-700 rounded-lg text-green-300 text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              All files uploaded successfully!
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-700 flex gap-2">
          <button
            onClick={handleClose}
            disabled={uploading}
            className="flex-1 py-2 px-4 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-300 font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={files.length === 0 || uploading || success}
            className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <UploadIcon className="w-4 h-4" />
                Upload {files.length > 0 ? `(${files.length})` : ''}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
