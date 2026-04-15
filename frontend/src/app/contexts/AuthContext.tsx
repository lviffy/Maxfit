import { createContext, useContext, useState, ReactNode } from 'react';
import { api } from '../services/api';

export type UserRole = 'admin' | 'trainer' | 'member' | 'owner';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  approved?: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  register: (userData: any, role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('gym-user');
    return stored ? JSON.parse(stored) : null;
  });

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/login', { email, password });
      const apiUser = response.data;
      const newUser: User = {
        id: apiUser.id,
        email: apiUser.email,
        firstName: apiUser.firstName,
        lastName: apiUser.lastName,
        role: apiUser.role,
        approved: true, 
      };
      setUser(newUser);
      localStorage.setItem('gym-user', JSON.stringify(newUser));
      return newUser;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Login failed. Invalid credentials.');
    }
  };

  const logout = async () => {
    try {
      await api.post('/logout');
    } catch (e) {
      console.error(e);
    } finally {
      setUser(null);
      localStorage.removeItem('gym-user');
    }
  };

  const register = async (userData: any, role: UserRole) => {
    try {
      await api.post('/register', { ...userData, role });
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Registration failed');
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
