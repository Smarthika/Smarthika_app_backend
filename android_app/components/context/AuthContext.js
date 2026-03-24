import React, { createContext, useContext, useReducer, useEffect } from 'react';
import StorageService from '../services/storageService';

// Initial state
const initialState = {
  isAuthenticated: false,
  isLoading: true,
  user: null,
  userRole: null,
  language: 'en',
};

// Action types
const AUTH_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_AUTHENTICATED: 'SET_AUTHENTICATED',
  SET_USER: 'SET_USER',
  SET_ROLE: 'SET_ROLE',
  SET_LANGUAGE: 'SET_LANGUAGE',
  LOGOUT: 'LOGOUT',
};

// Reducer
function authReducer(state, action) {
  switch (action.type) {
    case AUTH_ACTIONS.SET_LOADING:
      return { ...state, isLoading: action.payload };
    case AUTH_ACTIONS.SET_AUTHENTICATED:
      return { ...state, isAuthenticated: action.payload };
    case AUTH_ACTIONS.SET_USER:
      return { ...state, user: action.payload };
    case AUTH_ACTIONS.SET_ROLE:
      return { ...state, userRole: action.payload };
    case AUTH_ACTIONS.SET_LANGUAGE:
      return { ...state, language: action.payload };
    case AUTH_ACTIONS.LOGOUT:
      return {
        ...initialState,
        isLoading: false,
        language: state.language, // Keep language preference
      };
    default:
      return state;
  }
}

// Create context
const AuthContext = createContext();

// Provider component
export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });

      // Check authentication status
      const isAuthenticated = await StorageService.isAuthenticated();
      const language = await StorageService.getLanguage();
      const userRole = await StorageService.getUserRole();
      const userProfile = await StorageService.getUserProfile();

      dispatch({ type: AUTH_ACTIONS.SET_AUTHENTICATED, payload: isAuthenticated });
      dispatch({ type: AUTH_ACTIONS.SET_LANGUAGE, payload: language || 'en' });
      dispatch({ type: AUTH_ACTIONS.SET_ROLE, payload: userRole });
      dispatch({ type: AUTH_ACTIONS.SET_USER, payload: userProfile });
    } catch (error) {
      console.error('Error initializing auth:', error);
    } finally {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
    }
  };

  const login = async (token, userRole, userData) => {
    try {
      await StorageService.setAuthToken(token);
      await StorageService.setUserRole(userRole);
      if (userData) {
        await StorageService.setUserProfile(userData);
      }

      dispatch({ type: AUTH_ACTIONS.SET_AUTHENTICATED, payload: true });
      dispatch({ type: AUTH_ACTIONS.SET_ROLE, payload: userRole });
      dispatch({ type: AUTH_ACTIONS.SET_USER, payload: userData });
    } catch (error) {
      console.error('Error during login:', error);
    }
  };

  const logout = async () => {
    try {
      await StorageService.clearUserData();
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const setLanguage = async (language) => {
    try {
      await StorageService.setLanguage(language);
      dispatch({ type: AUTH_ACTIONS.SET_LANGUAGE, payload: language });
    } catch (error) {
      console.error('Error setting language:', error);
    }
  };

  const updateUser = async (userData) => {
    try {
      await StorageService.setUserProfile(userData);
      dispatch({ type: AUTH_ACTIONS.SET_USER, payload: userData });
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const value = {
    ...state,
    login,
    logout,
    setLanguage,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;