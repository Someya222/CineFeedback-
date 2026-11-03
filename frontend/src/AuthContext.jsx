import { createContext, useContext, useState } from 'react';
import { api } from './api.js';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cf_user')); } catch { return null; }
  });
  const save = (d) => {
    localStorage.setItem('cf_token', d.token);
    localStorage.setItem('cf_user', JSON.stringify(d.user));
    setUser(d.user);
  };
  const login = async (email, password) => save(await api.post('/auth/login', { email, password }));
  const register = async (name, email, password) => save(await api.post('/auth/register', { name, email, password }));
  const logout = () => {
    localStorage.removeItem('cf_token');
    localStorage.removeItem('cf_user');
    setUser(null);
  };
  return <Ctx.Provider value={{ user, login, register, logout }}>{children}</Ctx.Provider>;
}
