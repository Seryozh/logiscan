import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { SessionState, Package, Photo, Detection } from '../types/models';
import { saveSession, loadSession } from '../utils/localStorage';

// Action types
export type SessionAction =
  | { type: 'SET_PACKAGES'; packages: Package[] }
  | { type: 'ADD_PHOTO'; photo: Photo }
  | { type: 'ADD_DETECTIONS'; photoId: string; detections: Detection[] }
  | { type: 'UPDATE_PACKAGE_STATUS'; id: string; status: Package['status'] }
  | { type: 'UPDATE_DETECTION'; detection: Detection }
  | { type: 'UPDATE_PACKAGES_AND_DETECTIONS'; packages: Package[]; detections: Detection[] }
  | { type: 'DELETE_PHOTO'; photoId: string }
  | { type: 'CLEAR_SESSION' }
  | { type: 'LOAD_SESSION'; state: SessionState };

// Initial state factory
function createInitialState(): SessionState {
  return {
    packages: [],
    photos: [],
    detections: [],
    sessionId: uuidv4(),
    createdAt: Date.now(),
    lastModified: Date.now(),
  };
}

// Reducer function
function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  const newState = { ...state, lastModified: Date.now() };

  switch (action.type) {
    case 'SET_PACKAGES':
      return {
        ...newState,
        packages: action.packages,
      };

    case 'ADD_PHOTO':
      return {
        ...newState,
        photos: [...state.photos, action.photo],
      };

    case 'ADD_DETECTIONS': {
      // Add detections to the flattened list and to the photo
      const updatedPhotos = state.photos.map(photo =>
        photo.id === action.photoId
          ? { ...photo, detections: action.detections, processed: true }
          : photo
      );

      return {
        ...newState,
        photos: updatedPhotos,
        detections: [...state.detections, ...action.detections],
      };
    }

    case 'UPDATE_PACKAGE_STATUS': {
      const updatedPackages = state.packages.map(pkg =>
        pkg.id === action.id ? { ...pkg, status: action.status } : pkg
      );

      return {
        ...newState,
        packages: updatedPackages,
      };
    }

    case 'UPDATE_DETECTION': {
      // Update in both the flattened list and the photo's detections
      const updatedDetections = state.detections.map(det =>
        det.id === action.detection.id ? action.detection : det
      );

      const updatedPhotos = state.photos.map(photo => ({
        ...photo,
        detections: photo.detections.map(det =>
          det.id === action.detection.id ? action.detection : det
        ),
      }));

      return {
        ...newState,
        detections: updatedDetections,
        photos: updatedPhotos,
      };
    }

    case 'UPDATE_PACKAGES_AND_DETECTIONS': {
      // Used after matching algorithm runs
      // Update both packages and detections simultaneously
      const updatedPhotos = state.photos.map(photo => ({
        ...photo,
        detections: photo.detections.map(det => {
          const updated = action.detections.find(d => d.id === det.id);
          return updated || det;
        }),
      }));

      return {
        ...newState,
        packages: action.packages,
        detections: action.detections,
        photos: updatedPhotos,
      };
    }

    case 'DELETE_PHOTO': {
      // Remove photo and all its detections
      const photosWithoutDeleted = state.photos.filter(p => p.id !== action.photoId);
      const detectionsWithoutDeleted = state.detections.filter(d => d.photoId !== action.photoId);

      return {
        ...newState,
        photos: photosWithoutDeleted,
        detections: detectionsWithoutDeleted,
      };
    }

    case 'CLEAR_SESSION':
      return createInitialState();

    case 'LOAD_SESSION':
      return action.state;

    default:
      return state;
  }
}

// Context
interface SessionContextType {
  state: SessionState;
  dispatch: React.Dispatch<SessionAction>;
  // Convenience methods
  setPackages: (packages: Package[]) => void;
  addPhoto: (photo: Photo) => void;
  addDetections: (photoId: string, detections: Detection[]) => void;
  updatePackageStatus: (id: string, status: Package['status']) => void;
  updateDetection: (detection: Detection) => void;
  updatePackagesAndDetections: (packages: Package[], detections: Detection[]) => void;
  deletePhoto: (photoId: string) => void;
  clearSession: () => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

// Provider props
interface SessionProviderProps {
  children: React.ReactNode;
}

// Debounce utility
function useDebounce<T extends (...args: any[]) => void>(callback: T, delay: number): T {
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    }) as T,
    [callback, delay]
  );
}

// Provider component
export function SessionProvider({ children }: SessionProviderProps) {
  // Try to load existing session, otherwise create new
  const [state, dispatch] = useReducer(
    sessionReducer,
    null,
    () => loadSession() || createInitialState()
  );

  // Debounced save to localStorage (300ms delay)
  const debouncedSave = useDebounce((sessionState: SessionState) => {
    saveSession(sessionState);
  }, 300);

  // Auto-save whenever state changes
  useEffect(() => {
    debouncedSave(state);
  }, [state, debouncedSave]);

  // Convenience methods
  const setPackages = useCallback((packages: Package[]) => {
    dispatch({ type: 'SET_PACKAGES', packages });
  }, []);

  const addPhoto = useCallback((photo: Photo) => {
    dispatch({ type: 'ADD_PHOTO', photo });
  }, []);

  const addDetections = useCallback((photoId: string, detections: Detection[]) => {
    dispatch({ type: 'ADD_DETECTIONS', photoId, detections });
  }, []);

  const updatePackageStatus = useCallback((id: string, status: Package['status']) => {
    dispatch({ type: 'UPDATE_PACKAGE_STATUS', id, status });
  }, []);

  const updateDetection = useCallback((detection: Detection) => {
    dispatch({ type: 'UPDATE_DETECTION', detection });
  }, []);

  const updatePackagesAndDetections = useCallback(
    (packages: Package[], detections: Detection[]) => {
      dispatch({ type: 'UPDATE_PACKAGES_AND_DETECTIONS', packages, detections });
    },
    []
  );

  const deletePhoto = useCallback((photoId: string) => {
    dispatch({ type: 'DELETE_PHOTO', photoId });
  }, []);

  const clearSession = useCallback(() => {
    dispatch({ type: 'CLEAR_SESSION' });
  }, []);

  const contextValue: SessionContextType = {
    state,
    dispatch,
    setPackages,
    addPhoto,
    addDetections,
    updatePackageStatus,
    updateDetection,
    updatePackagesAndDetections,
    deletePhoto,
    clearSession,
  };

  return <SessionContext.Provider value={contextValue}>{children}</SessionContext.Provider>;
}

// Custom hook to use session context
export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
