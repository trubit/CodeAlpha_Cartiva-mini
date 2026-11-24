import axios, {
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import type { ApiErrorResponse, ApiResponse, AuthResponseData } from '@shared/api.types.js';
import { useAuthStore } from '../stores/authStore';

// In browser environment, prefer relative /api/v1 to route through Vite proxy (same-origin, preserves httpOnly cookies)
const API_BASE_URL =
  typeof window !== 'undefined'
    ? '/api/v1'
    : import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Transmit httpOnly cookies for silent refresh
});

// Concurrent refresh queue management to prevent duplicate refresh calls
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null): void => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else if (token) {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

/**
 * Standardized API Error Parser: Unpacks structured error responses and maps HTTP status codes accurately.
 */
export const extractErrorMessage = (err: unknown): string => {
  const axiosErr = err as {
    response?: {
      status?: number;
      data?: (ApiErrorResponse & { message?: string }) | { error?: { message?: string; code?: string } };
    };
    message?: string;
  };

  const status = axiosErr?.response?.status;
  const resData = axiosErr?.response?.data as {
    error?: { message?: string; code?: string };
    message?: string;
  } | undefined;

  const serverMsg = resData?.error?.message || resData?.message;

  if (serverMsg) {
    return serverMsg;
  }

  // Fallback status-code specific error messages
  switch (status) {
    case 401:
      return 'Authentication credentials are required or have expired. Please log in again.';
    case 403:
      return 'Access denied. You do not possess the required permissions to perform this operation.';
    case 413:
      return 'Uploaded file is too large. Product images must not exceed 5 MB.';
    case 415:
      return 'Unsupported media type. Allowed formats: JPEG, PNG, WEBP.';
    case 422:
      return 'Validation failed: Invalid file or metadata submitted.';
    case 429:
      return 'Too many requests. Please wait a moment before trying again.';
    case 500:
    case 502:
    case 503:
    case 504:
      return 'The server encountered an error. Please try again shortly.';
    default:
      return axiosErr?.message || 'An unexpected network error occurred.';
  }
};

// Request Interceptor: Injects in-memory access token and manages multipart boundaries safely
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const accessToken = useAuthStore.getState().accessToken;

    if (accessToken) {
      if (typeof config.headers?.set === 'function') {
        config.headers.set('Authorization', `Bearer ${accessToken}`);
      } else if (config.headers) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
    }

    // When transmitting FormData, remove hardcoded Content-Type so Axios/browser sets boundary
    if (config.data instanceof FormData && config.headers) {
      if (typeof config.headers.delete === 'function') {
        config.headers.delete('Content-Type');
      } else {
        delete (config.headers as Record<string, unknown>)['Content-Type'];
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Catches 401, triggers silent refresh with rotation, and retries queued requests
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If 401 Unauthorized and not already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Do not attempt refresh on auth login, register, or refresh endpoints themselves
      if (
        originalRequest.url?.includes('/auth/login') ||
        originalRequest.url?.includes('/auth/refresh') ||
        originalRequest.url?.includes('/auth/register')
      ) {
        return Promise.reject(new Error(extractErrorMessage(error)));
      }

      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              if (typeof originalRequest.headers.set === 'function') {
                originalRequest.headers.set('Authorization', `Bearer ${token}`);
              } else {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Trigger silent token refresh via httpOnly cookie
        const refreshResponse = await axios.post<ApiResponse<AuthResponseData>>(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const newAccessToken = refreshResponse.data.data.accessToken;
        const user = refreshResponse.data.data.user;

        // Update in-memory auth store
        useAuthStore.getState().setAuth(user, newAccessToken);

        processQueue(null, newAccessToken);

        if (originalRequest.headers) {
          if (typeof originalRequest.headers.set === 'function') {
            originalRequest.headers.set('Authorization', `Bearer ${newAccessToken}`);
          } else {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }
        }

        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        useAuthStore.getState().clearAuth();
        return Promise.reject(new Error(extractErrorMessage(refreshError)));
      } finally {
        isRefreshing = false;
      }
    }

    // Extract standardized error message
    const message = extractErrorMessage(error);
    const customError = new Error(message) as Error & {
      code?: string;
      status?: number;
      data?: unknown;
    };
    if (error?.response?.data?.error?.code) {
      customError.code = error.response.data.error.code;
    }
    if (error?.response?.status) {
      customError.status = error.response.status;
    }
    customError.data = error?.response?.data;
    return Promise.reject(customError);
  }
);
