import { useState, useEffect } from 'react';
import { X, Loader2, Save, FileText } from 'lucide-react';
import { getFileContent, updateFileContent } from '../api/files';
import type { File } from '../types';

interface FileEditorProps {
  isOpen: boolean;
  onClose: () => void;
  file: File | null;
  onSave: () => void;
}

export default function FileEditor({ isOpen, onClose, file, onSave }: FileEditorProps) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [originalContent, setOriginalContent] = useState('');

  useEffect(() => {
    if (isOpen && file) {
      loadContent();
    }
  }, [isOpen, file]);

  const loadContent = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const text = await getFileContent(file.id);
      setContent(text);
      setOriginalContent(text);
      setHasChanges(false);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to load file content');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!file) return;
    setSaving(true);
    setError('');
    try {
      await updateFileContent(file.id, content);
      setOriginalContent(content);
      setHasChanges(false);
      onSave();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to save file');
    } finally {
      setSaving(false);
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setHasChanges(e.target.value !== originalContent);
  };

  const handleClose = () => {
    if (hasChanges) {
      if (!confirm('You have unsaved changes. Discard?')) {
        return;
      }
    }
    onClose();
  };

  if (!isOpen || !file) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={handleClose}>
      <div 
        className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-4xl h-[80vh] flex flex-col" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white truncate">{file.original_name}</h2>
            {hasChanges && <span className="text-xs text-yellow-400">(unsaved)</span>}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </button>
            <button onClick={handleClose} className="p-1 text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden p-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-red-400 mb-4">{error}</p>
                <button
                  onClick={loadContent}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : (
            <textarea
              value={content}
              onChange={handleContentChange}
              className="w-full h-full bg-gray-900 border border-gray-700 rounded-lg text-white font-mono text-sm p-4 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              spellCheck={false}
            />
          )}
        </div>

        {error && !loading && (
          <div className="p-4 border-t border-gray-700">
            <div className="p-2 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
