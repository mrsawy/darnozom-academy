/**
 * Shared axios instance with app-wide default options (timeout, baseURL, headers).
 * Use this instead of importing axios directly so all requests get the same defaults.
 */

import axios from 'axios';
import type { AxiosInstance } from 'axios';
import { defaultApiOptions } from './apiOptions';

/** Axios instance with default options. Per-request config overrides defaults. */
export const api: AxiosInstance = axios.create(defaultApiOptions);
