import { useEffect } from 'react'
import { setupAPIClient } from '../../lib/api'

export default function Protected({ message }: { message: string }) {
  useEffect(() => {
    const api = setupAPIClient()

    api.get('/protected').then(response => {
      console.log(response.data);
    })
  }, [])

  return <h1>{message}</h1>
}

// export const getServerSideProps: GetServerSideProps = async (ctx) => {
//   const api = setupAPIClient(ctx);

//   const response = await api.get('/protected');

//   return {
//     props: {
//       message: response.data,
//     }
//   }
// }