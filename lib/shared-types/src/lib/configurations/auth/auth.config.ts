export const AUTH_CONFIG = {
  ACCESS_TOKEN_EXPIRES_IN: '15m',
  REFRESH_TOKEN_EXPIRES_IN: '7d',
} as const;

export const AUTH_COOKIE_NAME = 'ia_access_token';
export const REFRESH_TOKEN_NAME = 'ia_refresh_token';
export const SESSION_ID_COOKIE_NAME = 'ia_sid';
