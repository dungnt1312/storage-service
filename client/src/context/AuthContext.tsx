import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from '../types';
import { getMe, login as apiLogin, logout as apiLogout, isAuthenticated } from '../api/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (apiKey: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    if (!isAuthenticated()) {
      setLoading(false);
      return;
    }
    try {
      const userData = await getMe();
      setUser(userData);
    } catch {
      apiLogout();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const login = async (apiKey: string): Promise<boolean> => {
    apiLogin(apiKey);
    try {
      const userData = await getMe();
      setUser(userData);
      return true;
    } catch {
      apiLogout();
      return false;
    }
  };

  const logout = () => {
    apiLogout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
