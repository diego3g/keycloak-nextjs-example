import axios from "axios";
import { parseCookies, setCookie } from 'nookies'

type RetryCallback = (token: string) => void;

let isRefreshing = false;
let failedRequestsQueue: RetryCallback[] = [];

function decodeJWTPayload(token: string) {
  const base64Url = token.split(".")[1];
  const base64 = base64Url.replace("-", "+").replace("_", "/");

  return JSON.parse(typeof window !== "undefined" 
    ? window.atob(base64) 
    : Buffer.from(base64, 'base64').toString()
  );
}

function isTokenExpired(token: string) {
  const payload = decodeJWTPayload(token);

  if (payload?.exp) {
    const tokenExpiresOn = (payload.exp - 15) * 1000;

    return new Date() > new Date(tokenExpiresOn);
  }

  return false;
}

async function refreshAccessToken(ctx: any = undefined): Promise<string> {
  const { '@skylab:refresh_token': refreshToken } = parseCookies(ctx)

  const encodedParams = new URLSearchParams();

  encodedParams.set('grant_type', 'refresh_token');
  encodedParams.set('client_id', process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID!);
  encodedParams.set('client_secret', process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_SECRET!);
  encodedParams.set('refresh_token', refreshToken);

  const url = `${process.env.NEXT_PUBLIC_KEYCLOAK_ISSUER}/protocol/openid-connect/token`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: encodedParams
  });

  const data = await response.json();  

  console.log('Refreshed', data)

  setCookie(ctx, '@skylab:access_token', data.access_token, {
    path: '/',
  });

  setCookie(ctx, '@skylab:refresh_token', data.refresh_token, {
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return data.access_token;
}

function subscribeToRefreshToken(cb: RetryCallback) {
  failedRequestsQueue.push(cb);
}

function onTokenRefreshed(token: string) {
  failedRequestsQueue.map(cb => cb(token));
}

export function setupAPIClient(ctx: any = undefined) {
  const { '@skylab:access_token': token } = parseCookies(ctx)

  const api = axios.create({
    baseURL: 'http://localhost:3333/',
    headers: {
      'Authorization': `Bearer ${token}`,
    }
  });

  api.interceptors.request.use(
    async config => {
      const token = String(config.headers!['Authorization']);

      if (token && isTokenExpired(token)) {
        if (!isRefreshing) {
          isRefreshing = true;

          refreshAccessToken(ctx).then((token) => {
            onTokenRefreshed(token);
          })
        }

        await new Promise((resolve) => {
          subscribeToRefreshToken(token => {
            config.headers!['Authorization'] = `Bearer ${token}`;

            resolve(axios.request(config));
          })
        });
      }

      return config;
    },
  );

  return api;
}
