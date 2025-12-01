import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserStats } from '../api/auth';
import type { UserStats } from '../types';
import { Files, HardDrive, Upload, FileIcon, Loader2, ArrowRight } from 'lucide-react';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getUserStats();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  const filesPercentage = stats ? (stats.total_files / stats.max_files) * 100 : 0;
  const storagePercentage = stats ? (stats.total_size / stats.max_storage) * 100 : 0;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400">Welcome back, {user?.username}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
              <FileIcon className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Total Files</p>
              <p className="text-white text-xl font-bold">{stats?.total_files.toLocaleString()}</p>
            </div>
          </div>
          <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${Math.min(filesPercentage, 100)}%` }}
            />
          </div>
          <p className="text-gray-500 text-xs mt-1">of {stats?.max_files.toLocaleString()} max</p>
        </div>

        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-600/20 rounded-lg flex items-center justify-center">
              <HardDrive className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Storage Used</p>
              <p className="text-white text-xl font-bold">{formatBytes(stats?.total_size || 0)}</p>
            </div>
          </div>
          <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${Math.min(storagePercentage, 100)}%` }}
            />
          </div>
          <p className="text-gray-500 text-xs mt-1">of {formatBytes(stats?.max_storage || 0)} max</p>
        </div>

        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
              <Upload className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Max File Size</p>
              <p className="text-white text-xl font-bold">{formatBytes(stats?.max_file_size || 0)}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-600/20 rounded-lg flex items-center justify-center">
              <Files className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Files Remaining</p>
              <p className="text-white text-xl font-bold">
                {((stats?.max_files || 0) - (stats?.total_files || 0)).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Link
          to="/files"
          className="bg-gray-800 rounded-lg border border-gray-700 p-6 hover:border-gray-600 transition-colors group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <Files className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Browse Files</h3>
                <p className="text-gray-400 text-sm">View and manage your files</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
          </div>
        </Link>

        <Link
          to="/settings"
          className="bg-gray-800 rounded-lg border border-gray-700 p-6 hover:border-gray-600 transition-colors group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                <HardDrive className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Storage Settings</h3>
                <p className="text-gray-400 text-sm">Manage API key and preferences</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
          </div>
        </Link>
      </div>
    </div>
  );
}
