import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const encodedParams = new URLSearchParams();

  encodedParams.set('grant_type', 'client_credentials');
  encodedParams.set('client_id', process.env.KEYCLOAK_CLIENT_ID_SSR);
  encodedParams.set('client_secret', process.env.KEYCLOAK_CLIENT_SECRET_SSR);

  const url = `${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/token`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: encodedParams
  });

  const data = await response.json();  

  const helloResponse = await fetch('http://localhost:3333/protected', {
    headers: {
      'Authorization': `Bearer ${data.access_token}`,
    }
  })

  const helloData = await helloResponse.text();

  return res.send(helloData)
}