import api from './client';
import type { User, UserStats, UserSettings } from '../types';

export const getMe = async (): Promise<User> => {
  const response = await api.get('/users/me');
  return response.data;
};

export const getUserStats = async (): Promise<UserStats> => {
  const response = await api.get('/users/stats');
  return response.data;
};

export const getUserSettings = async (): Promise<UserSettings> => {
  const response = await api.get('/users/settings');
  return response.data;
};

export const updateUserSettings = async (settings: Partial<UserSettings>): Promise<{ message: string; settings: UserSettings }> => {
  const response = await api.put('/users/settings', settings);
  return response.data;
};

export const regenerateApiKey = async (): Promise<{ message: string; user: User }> => {
  const response = await api.post('/users/regenerate-key');
  return response.data;
};

export const login = (apiKey: string): void => {
  localStorage.setItem('api_key', apiKey);
};

export const logout = (): void => {
  localStorage.removeItem('api_key');
};

export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem('api_key');
};
