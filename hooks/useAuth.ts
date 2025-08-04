
'use client';

import { useState, useEffect } from 'react';
import { User, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // AUTHENTICATION STATE LISTENER: Monitor Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('AUTH STATE CHANGED:', user ? `User logged in: ${user.email}` : 'User logged out');
      setUser(user);
      setLoading(false);
    });

    // CLEANUP: Remove listener on component unmount
    return unsubscribe;
  }, []);

  // USER SIGN IN: Firebase Auth email/password login
  const signIn = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('SIGN IN SUCCESS:', userCredential.user.email);
      return userCredential;
    } catch (error) {
      console.error('SIGN IN ERROR:', error);
      throw error;
    }
  };

  // USER REGISTRATION: Firebase Auth account creation
  const signUp = async (email: string, password: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log('SIGN UP SUCCESS:', userCredential.user.email);
      return userCredential;
    } catch (error) {
      console.error('SIGN UP ERROR:', error);
      throw error;
    }
  };

  // USER LOGOUT: Firebase Auth sign out
  const logout = async () => {
    try {
      await signOut(auth);
      console.log('LOGOUT SUCCESS: User signed out');
    } catch (error) {
      console.error('LOGOUT ERROR:', error);
      throw error;
    }
  };

  return {
    user,           // CURRENT USER: Firebase User object or null
    loading,        // LOADING STATE: True while checking auth status
    signIn,         // SIGN IN METHOD: Email/password authentication
    signUp,         // SIGN UP METHOD: Account creation
    logout,         // LOGOUT METHOD: Sign out current user
  };
};