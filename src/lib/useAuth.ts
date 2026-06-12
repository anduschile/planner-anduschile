import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import {
  getCurrentSession,
  getCurrentUser,
  onAuthStateChange,
  signInWithPassword,
  signOut,
} from "./supabase";

export interface UseAuthReturn {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const currentSession = await getCurrentSession();
        const currentUser = await getCurrentUser();

        setSession(currentSession);
        setUser(currentUser);
      } catch (error) {
        console.error("Error initializing auth:", error);
      } finally {
        setLoading(false);
      }
    };

    void initAuth();

    const unsubscribe = onAuthStateChange((newSession, newUser) => {
      setSession(newSession);
      setUser(newUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSignInWithPassword = async (email: string, password: string) => {
    try {
      await signInWithPassword(email, password);
    } catch (error) {
      throw error;
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setSession(null);
      setUser(null);
    } catch (error) {
      throw error;
    }
  };

  return {
    session,
    user,
    loading,
    signInWithPassword: handleSignInWithPassword,
    signOut: handleSignOut,
  };
}
