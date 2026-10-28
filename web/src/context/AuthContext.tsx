import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Perfil } from '../lib/tipos';

interface AuthContextValor {
  sesion: Session | null;
  perfil: Perfil | null;
  cargando: boolean;
  errorAcceso: string | null;
  iniciarSesion: (correo: string, contrasena: string) => Promise<{ error: string | null }>;
  cerrarSesion: () => Promise<void>;
  recargarPerfil: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValor | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [sesion, setSesion] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [cargando, setCargando] = useState<boolean>(true);
  const [errorAcceso, setErrorAcceso] = useState<string | null>(null);

  const cargarPerfilUsuario = useCallback(async (userId: string): Promise<Perfil | null> => {
    const { data, error } = await supabase
      .from('perfiles')
      .select('id,nombre,area,rol,activo')
      .eq('id', userId)
      .single();

    if (error || !data || !data.activo) {
      setErrorAcceso('Su usuario no está habilitado');
      setPerfil(null);
      await supabase.auth.signOut();
      setSesion(null);
      return null;
    }

    const perfilValido = data as Perfil;
    setErrorAcceso(null);
    setPerfil(perfilValido);
    return perfilValido;
  }, []);

  useEffect(() => {
    let montado = true;

    async function inicializar() {
      setCargando(true);
      try {
        const {
          data: { session }
        } = await supabase.auth.getSession();

        if (!montado) return;

        if (session?.user) {
          setSesion(session);
          await cargarPerfilUsuario(session.user.id);
        } else {
          setSesion(null);
          setPerfil(null);
        }
      } finally {
        if (montado) {
          setCargando(false);
        }
      }
    }

    void inicializar();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nuevaSesion) => {
      if (!montado) return;
      setSesion(nuevaSesion);
      if (!nuevaSesion?.user) {
        setPerfil(null);
        setCargando(false);
      }
    });

    return () => {
      montado = false;
      subscription.unsubscribe();
    };
  }, [cargarPerfilUsuario]);

  const iniciarSesion = async (
    correo: string,
    contrasena: string
  ): Promise<{ error: string | null }> => {
    setErrorAcceso(null);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: correo.trim(),
      password: contrasena
    });

    if (error || !data.user || !data.session) {
      return {
        error: 'Correo electrónico o contraseña incorrectos. Verifique sus datos e intente de nuevo.'
      };
    }

    setSesion(data.session);
    const perfilCargado = await cargarPerfilUsuario(data.user.id);
    if (!perfilCargado) {
      return {
        error: 'Su usuario no está habilitado'
      };
    }

    return { error: null };
  };

  const cerrarSesion = async () => {
    setErrorAcceso(null);
    await supabase.auth.signOut();
    setSesion(null);
    setPerfil(null);
  };

  const recargarPerfil = async () => {
    if (sesion?.user) {
      await cargarPerfilUsuario(sesion.user.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        sesion,
        perfil,
        cargando,
        errorAcceso,
        iniciarSesion,
        cerrarSesion,
        recargarPerfil
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValor {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return ctx;
}
