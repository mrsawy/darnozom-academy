/**
 * API client: axios instance with app-wide default options.
 * Use these instead of importing from axios directly.
 */

export { api } from './axiosInstance';

export {
  defaultApiOptions,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_BASE_URL,
  withDefaultApiOptions,
} from './apiOptions';

export { isAxiosError, isCancel } from 'axios';

export type {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
  CreateAxiosDefaults,
  InternalAxiosRequestConfig,
} from 'axios';
