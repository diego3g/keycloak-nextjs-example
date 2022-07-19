import axios, { AxiosError } from 'axios';
import { parseCookies, setCookie } from 'nookies';

let isRefreshing = false;
let failedRequestsQueue = [];

export function setupAPIClient(ctx = undefined) {
  let cookies = parseCookies(ctx);

  const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL,
    headers: {
      Authorization: `Bearer ${cookies['skylab_next_access_token']}`,
    },
  });

  api.interceptors.response.use(
    (response) => {
      return response;
    },
    (error: AxiosError) => {
      if (error.response?.status === 401) {
        if ('error' in error.response?.data) {
          return Promise.reject(error);
        } else if (error.response?.data?.startsWith('E_JWT_TOKEN_EXPIRED')) {
          cookies = parseCookies(ctx);

          const { '@skylab:refresh_token': refreshToken } = cookies;
          const originalConfig = error.config;

          if (!isRefreshing) {
            isRefreshing = true;

            api
              .post('/sessions/refresh', {
                refreshToken,
              })
              .then((response) => {
                const { token } = response.data;

                setCookie(ctx, '@skylab:access_token', token, {
                  maxAge: 60 * 60 * 24 * 30, // 30 days
                  path: '/',
                  secure: process.env.NODE_ENV !== 'development',
                });

                setCookie(
                  ctx,
                  'skylab_next_refresh_token',
                  response.data.refreshToken,
                  {
                    maxAge: 60 * 60 * 24 * 30, // 30 days
                    path: '/',
                    secure: process.env.NODE_ENV !== 'development',
                  },
                );

                api.defaults.headers['Authorization'] = `Bearer ${token}`;

                failedRequestsQueue.forEach((request) =>
                  request.onSuccess(token),
                );

                failedRequestsQueue = [];
              })
              .catch((err) => {
                failedRequestsQueue.forEach((request) =>
                  request.onFailure(err),
                );
                failedRequestsQueue = [];

                if (process.browser) {
                  signOut();
                }
              })
              .finally(() => {
                isRefreshing = false;
              });
          }

          return new Promise((resolve, reject) => {
            failedRequestsQueue.push({
              onSuccess: (token: string) => {
                originalConfig.headers['Authorization'] = `Bearer ${token}`;

                resolve(api(originalConfig));
              },
              onFailure: (err: AxiosError) => {
                reject(err);
              },
            });
          });
        } else {
          if (process.browser) {
            signOut();
          } else {
            return Promise.reject(new TokenInvalidError());
          }
        }
      }

      return Promise.reject(error);
    },
  );

  return api;
}