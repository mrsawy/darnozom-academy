import axios from 'axios';

/** Axios instance for client-side requests to this app's own Route Handlers (/api/*). */
export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});
