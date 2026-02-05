import type { SessionState } from '../types/models';

const STORAGE_KEY = 'package-scanner-session-v1';
const API_KEY_STORAGE_KEY = 'openrouter-api-key';
const GOOGLE_API_KEY_STORAGE_KEY = 'google-cloud-api-key';

/**
 * Saves the current session state to localStorage
 */
export function saveSession(state: SessionState): void {
  try {
    const serialized = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch (error) {
    console.error('Failed to save session to localStorage:', error);
    // Could be quota exceeded or other storage error
    // TODO: Show user warning if storage is full
  }
}

/**
 * Loads the session state from localStorage
 * Returns null if no session exists or if loading fails
 */
export function loadSession(): SessionState | null {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY);
    if (!serialized) {
      return null;
    }
    return JSON.parse(serialized) as SessionState;
  } catch (error) {
    console.error('Failed to load session from localStorage:', error);
    return null;
  }
}

/**
 * Clears the current session from localStorage
 */
export function clearSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear session from localStorage:', error);
  }
}

/**
 * Saves the OpenRouter API key to localStorage
 */
export function saveApiKey(apiKey: string): void {
  try {
    localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
  } catch (error) {
    console.error('Failed to save API key to localStorage:', error);
  }
}

/**
 * Loads the OpenRouter API key from localStorage
 */
export function loadApiKey(): string | null {
  try {
    return localStorage.getItem(API_KEY_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to load API key from localStorage:', error);
    return null;
  }
}

/**
 * Removes the API key from localStorage
 */
export function clearApiKey(): void {
  try {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear API key from localStorage:', error);
  }
}

/**
 * Saves the Google Cloud API key to localStorage
 */
export function saveGoogleApiKey(apiKey: string): void {
  try {
    localStorage.setItem(GOOGLE_API_KEY_STORAGE_KEY, apiKey);
  } catch (error) {
    console.error('Failed to save Google API key to localStorage:', error);
  }
}

/**
 * Loads the Google Cloud API key from localStorage
 */
export function loadGoogleApiKey(): string | null {
  try {
    return localStorage.getItem(GOOGLE_API_KEY_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to load Google API key from localStorage:', error);
    return null;
  }
}

/**
 * Removes the Google API key from localStorage
 */
export function clearGoogleApiKey(): void {
  try {
    localStorage.removeItem(GOOGLE_API_KEY_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear Google API key from localStorage:', error);
  }
}

/**
 * Estimates the size of stored session data in bytes
 */
export function getSessionSize(): number {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY);
    if (!serialized) {
      return 0;
    }
    // Rough estimate: each character is ~2 bytes in UTF-16
    return serialized.length * 2;
  } catch (error) {
    return 0;
  }
}

/**
 * Gets the percentage of localStorage quota used (approximate)
 * Most browsers allow 5-10MB per origin
 */
export function getStorageUsagePercent(): number {
  try {
    const estimatedQuota = 5 * 1024 * 1024; // Assume 5MB quota
    let totalSize = 0;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (value) {
          totalSize += (key.length + value.length) * 2;
        }
      }
    }

    return (totalSize / estimatedQuota) * 100;
  } catch (error) {
    return 0;
  }
}
