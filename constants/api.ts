export const API_BASE_URL = 'https://607b2c240c84.ngrok-free.app';

export const buildApiUrl = (path: string) => {
  const normalizedBase = API_BASE_URL.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
};
