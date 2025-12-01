import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { regenerateApiKey, getUserStats, getUserSettings, updateUserSettings } from '../api/auth';
import type { UserStats, UserSettings } from '../types';
import { User, Key, Copy, RefreshCw, Loader2, Check, AlertTriangle, HardDrive, FileIcon, Settings as SettingsIcon, Save, Edit3 } from 'lucide-react';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function parseBytes(value: string, unit: string): number {
  const num = parseFloat(value) || 0;
  const multipliers: Record<string, number> = {
    'B': 1,
    'KB': 1024,
    'MB': 1024 * 1024,
    'GB': 1024 * 1024 * 1024,
  };
  return Math.floor(num * (multipliers[unit] || 1));
}

function bytesToUnit(bytes: number): { value: string; unit: string } {
  if (bytes >= 1024 * 1024 * 1024) {
    return { value: (bytes / (1024 * 1024 * 1024)).toFixed(2), unit: 'GB' };
  } else if (bytes >= 1024 * 1024) {
    return { value: (bytes / (1024 * 1024)).toFixed(2), unit: 'MB' };
  } else if (bytes >= 1024) {
    return { value: (bytes / 1024).toFixed(2), unit: 'KB' };
  }
  return { value: bytes.toString(), unit: 'B' };
}

function normalizeNumberInput(value: string): string {
  // Replace comma with dot for decimal separator
  return value.replace(',', '.');
}

export default function Settings() {
  const { user } = useAuth();
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Edit form state
  const [editMaxFiles, setEditMaxFiles] = useState('');
  const [editMaxFileSize, setEditMaxFileSize] = useState('');
  const [editMaxFileSizeUnit, setEditMaxFileSizeUnit] = useState('MB');
  const [editMaxStorage, setEditMaxStorage] = useState('');
  const [editMaxStorageUnit, setEditMaxStorageUnit] = useState('GB');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, settingsData] = await Promise.all([
          getUserStats(),
          getUserSettings(),
        ]);
        setStats(statsData);
        setSettings(settingsData);
        
        // Initialize edit form
        setEditMaxFiles(settingsData.max_files.toString());
        const fileSizeUnit = bytesToUnit(settingsData.max_file_size);
        setEditMaxFileSize(fileSizeUnit.value);
        setEditMaxFileSizeUnit(fileSizeUnit.unit);
        const storageUnit = bytesToUnit(settingsData.max_storage);
        setEditMaxStorage(storageUnit.value);
        setEditMaxStorageUnit(storageUnit.unit);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoadingStats(false);
      }
    };
    fetchData();
  }, []);

  const copyApiKey = () => {
    if (user?.api_key) {
      navigator.clipboard.writeText(user.api_key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const { user: updatedUser } = await regenerateApiKey();
      localStorage.setItem('api_key', updatedUser.api_key);
      window.location.reload();
    } catch (error) {
      console.error('Failed to regenerate API key:', error);
    } finally {
      setRegenerating(false);
      setShowConfirm(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const newSettings = {
        max_files: parseInt(editMaxFiles) || 1000,
        max_file_size: parseBytes(editMaxFileSize, editMaxFileSizeUnit),
        max_storage: parseBytes(editMaxStorage, editMaxStorageUnit),
      };
      
      const result = await updateUserSettings(newSettings);
      setSettings(result.settings);
      setStats(prev => prev ? {
        ...prev,
        max_files: result.settings.max_files,
        max_file_size: result.settings.max_file_size,
        max_storage: result.settings.max_storage,
      } : null);
      
      setEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    if (settings) {
      setEditMaxFiles(settings.max_files.toString());
      const fileSizeUnit = bytesToUnit(settings.max_file_size);
      setEditMaxFileSize(fileSizeUnit.value);
      setEditMaxFileSizeUnit(fileSizeUnit.unit);
      const storageUnit = bytesToUnit(settings.max_storage);
      setEditMaxStorage(storageUnit.value);
      setEditMaxStorageUnit(storageUnit.unit);
    }
    setEditing(false);
  };

  if (!user) return null;

  const filesPercentage = stats ? (stats.total_files / stats.max_files) * 100 : 0;
  const storagePercentage = stats ? (stats.total_size / stats.max_storage) * 100 : 0;

  return (
    <div className="p-6 max-w mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-400">Manage your account and storage limits</p>
      </div>

      {/* User Profile */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{user.username}</h2>
            <p className="text-gray-400">{user.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">User ID</label>
            <p className="text-white">{user.id}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Created</label>
            <p className="text-white">
              {new Date(user.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Storage Usage & Settings */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <HardDrive className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Storage & Limits</h3>
          </div>
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              Edit Limits
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={cancelEdit}
                disabled={saving}
                className="px-3 py-1.5 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save
              </button>
            </div>
          )}
        </div>

        {saveSuccess && (
          <div className="mb-4 p-2 bg-green-900/50 border border-green-700 rounded-lg text-green-300 text-sm flex items-center gap-2">
            <Check className="w-4 h-4" />
            Settings saved successfully!
          </div>
        )}

        {loadingStats ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Usage bars */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-300 text-sm">Total Files</span>
                </div>
                <span className="text-white text-sm font-medium">
                  {stats?.total_files.toLocaleString()} / {stats?.max_files.toLocaleString()}
                </span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    filesPercentage > 80 ? 'bg-red-500' : filesPercentage > 50 ? 'bg-yellow-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min(filesPercentage, 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-300 text-sm">Storage Used</span>
                </div>
                <span className="text-white text-sm font-medium">
                  {formatBytes(stats?.total_size || 0)} / {formatBytes(stats?.max_storage || 0)}
                </span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    storagePercentage > 80 ? 'bg-red-500' : storagePercentage > 50 ? 'bg-yellow-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min(storagePercentage, 100)}%` }}
                />
              </div>
            </div>

            {/* Settings form */}
            <div className="pt-4 border-t border-gray-700">
              <div className="flex items-center gap-3 mb-3">
                <SettingsIcon className="w-4 h-4 text-gray-400" />
                <span className="text-gray-300 text-sm font-medium">Limits Configuration</span>
              </div>
              
              {editing ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex flex-col">
                    <label className="block text-xs text-gray-400 mb-1.5">Max Files</label>
                    <input
                      type="number"
                      value={editMaxFiles}
                      onChange={(e) => setEditMaxFiles(normalizeNumberInput(e.target.value))}
                      min="1"
                      step="1"
                      className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-[42px]"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="block text-xs text-gray-400 mb-1.5">Max File Size</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={editMaxFileSize}
                        onChange={(e) => setEditMaxFileSize(normalizeNumberInput(e.target.value))}
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        className="flex-1 px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-[42px]"
                      />
                      <select
                        value={editMaxFileSizeUnit}
                        onChange={(e) => setEditMaxFileSizeUnit(e.target.value)}
                        className="px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-[85px] h-[42px]"
                      >
                        <option value="KB">KB</option>
                        <option value="MB">MB</option>
                        <option value="GB">GB</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <label className="block text-xs text-gray-400 mb-1.5">Max Storage</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={editMaxStorage}
                        onChange={(e) => setEditMaxStorage(normalizeNumberInput(e.target.value))}
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        className="flex-1 px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-[42px]"
                      />
                      <select
                        value={editMaxStorageUnit}
                        onChange={(e) => setEditMaxStorageUnit(e.target.value)}
                        className="px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-[85px] h-[42px]"
                      >
                        <option value="MB">MB</option>
                        <option value="GB">GB</option>
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="bg-gray-900 rounded-lg p-3">
                    <p className="text-gray-400 text-xs mb-1">Max Files</p>
                    <p className="text-white font-medium">{settings?.max_files.toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-3">
                    <p className="text-gray-400 text-xs mb-1">Max File Size</p>
                    <p className="text-white font-medium">{formatBytes(settings?.max_file_size || 0)}</p>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-3">
                    <p className="text-gray-400 text-xs mb-1">Max Storage</p>
                    <p className="text-white font-medium">{formatBytes(settings?.max_storage || 0)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* API Key */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Key className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">API Key</h3>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <input
            type={showKey ? 'text' : 'password'}
            value={user.api_key}
            readOnly
            className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono text-sm"
          />
          <button
            onClick={() => setShowKey(!showKey)}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors text-sm"
          >
            {showKey ? 'Hide' : 'Show'}
          </button>
          <button
            onClick={copyApiKey}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        {!showConfirm ? (
          <button
            onClick={() => setShowConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 rounded-lg transition-colors text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Regenerate API Key
          </button>
        ) : (
          <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-300 font-medium">Are you sure?</p>
                <p className="text-red-400 text-sm">
                  This will invalidate your current API key. All applications using the old key will stop working.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleRegenerate}
                disabled={regenerating}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white rounded-lg transition-colors text-sm"
              >
                {regenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  'Yes, Regenerate'
                )}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                disabled={regenerating}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
