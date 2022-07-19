export default function Home() {
  const signInUrl = `https://keycloak.rocketseat.dev/auth/realms/skylab/protocol/openid-connect/auth?client_id=skylab-next-client&scope=openid%20profile%20email%20offline_access&response_type=code&redirect_uri=http://localhost:3000/api/auth/callback`;

  return (
    <>
      Not signed in <br />
      <a href={signInUrl}>Sign in</a>
    </>
  )
}