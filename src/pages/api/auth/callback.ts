import { setCookie } from 'nookies';
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const encodedParams = new URLSearchParams();

  encodedParams.set('grant_type', 'authorization_code');
  encodedParams.set('client_id', process.env.KEYCLOAK_CLIENT_ID);
  encodedParams.set('client_secret', process.env.KEYCLOAK_CLIENT_SECRET);
  encodedParams.set('code', String(req.query.code));
  encodedParams.set('redirect_uri', 'http://localhost:3000/api/auth/callback');

  let url = `${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/token`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: encodedParams
  });

  const data = await response.json();

  setCookie({ res }, '@skylab:access_token', data.access_token, {
    path: '/',
  });

  setCookie({ res }, '@skylab:refresh_token', data.refresh_token, {
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return res.redirect('/')
}