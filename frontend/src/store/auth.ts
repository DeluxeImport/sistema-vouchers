import { create } from "zustand";
import { api } from "../api/client";

export interface Usuario {
  id: string;
  nombre: string;
  username: string;
  rol: string;
  esAdmin: boolean;
  categorias: string[];
  puedeSubir: boolean;
  puedeVerGaleria: boolean;
  puedeVerDashboard: boolean;
  puedeDescargar: boolean;
}

interface AuthState {
  usuario: Usuario | null;
  token: string | null;
  debeCambiar: boolean;
  totpActivo: boolean;
  cargado: boolean;
  setSesion: (data: { token: string; usuario: Usuario; debeCambiar: boolean; totpActivo: boolean }) => void;
  setFlags: (f: Partial<Pick<AuthState, "debeCambiar" | "totpActivo">>) => void;
  cargarPerfil: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => ({
  usuario: null,
  token: localStorage.getItem("token"),
  debeCambiar: false,
  totpActivo: false,
  cargado: false,

  setSesion: ({ token, usuario, debeCambiar, totpActivo }) => {
    localStorage.setItem("token", token);
    set({ token, usuario, debeCambiar, totpActivo, cargado: true });
  },

  setFlags: (f) => set(f),

  cargarPerfil: async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      set({ cargado: true });
      return;
    }
    try {
      const { data } = await api.get("/auth/me");
      set({
        usuario: data.usuario,
        token,
        debeCambiar: data.debeCambiar,
        totpActivo: data.totpActivo,
        cargado: true,
      });
    } catch {
      localStorage.removeItem("token");
      set({ usuario: null, token: null, cargado: true });
    }
  },

  logout: async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      /* ignorar */
    }
    localStorage.removeItem("token");
    set({ usuario: null, token: null, debeCambiar: false, totpActivo: false });
  },
}));
