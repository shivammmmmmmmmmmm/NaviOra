import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';

const AuthContext = createContext();

// Local demo session used ONLY when the Base44 backend is unreachable, so the
// app can be explored in the sandbox preview. Real auth (email/Google) runs
// unchanged whenever the backend is connected, and any stale demo session is
// cleared the moment the backend comes back online.
const DEMO_STORAGE_KEY = 'naviora_demo_user';
const DEMO_USER = { id: 'demo-user', full_name: 'Demo Traveler', email: 'demo@naviora.app', _demo: true };
const loadDemoSession = () => {
  try { return JSON.parse(localStorage.getItem(DEMO_STORAGE_KEY) || 'null'); } catch { return null; }
};
const saveDemoSession = (u) => {
  try { localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(u)); } catch { /* noop */ }
};
const clearDemoSession = () => {
  try { localStorage.removeItem(DEMO_STORAGE_KEY); } catch { /* noop */ }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [backendAvailable, setBackendAvailable] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null); // Contains only { id, public_settings }

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    // Restore a local demo session (backend not connected) without hitting the API.
    const demo = loadDemoSession();
    if (demo) {
      setUser(demo);
      setIsAuthenticated(true);
      setAuthChecked(true);
      setBackendAvailable(false);
      setIsLoadingAuth(false);
      setIsLoadingPublicSettings(false);
      return;
    }
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);
      
      try {
        const publicSettings = await base44.app.getPublicSettings();
        setAppPublicSettings(publicSettings);
        setBackendAvailable(true);
        clearDemoSession(); // backend is live — discard any stale demo session
        
        // If we got the app public settings successfully, check if user is authenticated
        if (appParams.token) {
          await checkUserAuth();
        } else {
          setIsLoadingAuth(false);
          setIsAuthenticated(false);
          setAuthChecked(true);
        }
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        console.error('App state check failed:', appError);
        setBackendAvailable(false);
        
        // Handle app-level errors
        if (appError.status === 403 && appError.data?.extra_data?.reason) {
          const reason = appError.data.extra_data.reason;
          if (reason === 'auth_required') {
            setAuthError({
              type: 'auth_required',
              message: 'Authentication required'
            });
          } else if (reason === 'user_not_registered') {
            setAuthError({
              type: 'user_not_registered',
              message: 'User not registered for this app'
            });
          } else {
            setAuthError({
              type: reason,
              message: appError.message
            });
          }
        } else {
          setAuthError({
            type: 'unknown',
            message: appError.message || 'Failed to load app'
          });
        }
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({
        type: 'unknown',
        message: error.message || 'An unexpected error occurred'
      });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async () => {
    try {
      // Now check if the user is authenticated
      setIsLoadingAuth(true);
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
      setAuthChecked(true);
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setAuthChecked(true);
      
      // If user auth fails, it might be an expired token
      if (error.status === 401 || error.status === 403) {
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required'
        });
      }
    }
  };

  const demoLogin = () => {
    saveDemoSession(DEMO_USER);
    setUser(DEMO_USER);
    setIsAuthenticated(true);
    setAuthChecked(true);
    setAuthError(null);
    setIsLoadingAuth(false);
    setIsLoadingPublicSettings(false);
  };

  const logout = (shouldRedirect = true) => {
    clearDemoSession();
    setUser(null);
    setIsAuthenticated(false);
    
    if (shouldRedirect) {
      // Use the SDK's logout method which handles token cleanup and redirect
      base44.auth.logout(window.location.href);
    } else {
      // Just remove the token without redirect
      base44.auth.logout();
    }
  };

  const navigateToLogin = () => {
    // Use the SDK's redirectToLogin method
    base44.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      backendAvailable,
      logout,
      demoLogin,
      navigateToLogin,
      checkUserAuth,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
