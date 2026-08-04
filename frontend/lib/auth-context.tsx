"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError, setToken } from "./api-client";
import type { User } from "./types";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = typeof window !== "undefined" ? window.localStorage.getItem("auth_token") : null;
    if (!token) {
      setIsLoading(false);
      return;
    }

    api
      .get<{ data: User }>("/auth/me")
      .then((response) => setUser(response.data))
      .catch(() => setToken(null))
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await api.post<{ data: { user: User; token: string } }>("/auth/login", { email, password });
    setToken(response.data.token);
    setUser(response.data.user);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const response = await api.post<{ data: { user: User; token: string } }>("/auth/register", {
      name,
      email,
      password
    });
    setToken(response.data.token);
    setUser(response.data.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
    } finally {
      setToken(null);
      setUser(null);
      router.push("/login");
    }
  }, [router]);

  const value = useMemo(() => ({ user, isLoading, login, register, logout }), [user, isLoading, login, register, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
