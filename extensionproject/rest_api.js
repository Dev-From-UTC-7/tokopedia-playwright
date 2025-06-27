import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()

console.log('Starting Bun server...')

Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url)

    // Handle POST requests to add data
    if (url.pathname === '/' && req.method === 'POST') {
      try {
        const body = await req.json()
        const { key, price, url: postUrl } = body

        if (!key || !price || !postUrl) {
          return new Response(
            'Missing required fields: key, price, and url are required.',
            { status: 400 }
          )
        }

        const timestamp = new Date().toISOString()
        const newData = { url: postUrl, price, timestamp }
        await redis.rpush(key, newData)

        return new Response('Data appended to Redis list', { status: 200 })
      } catch (error) {
        console.error(error)
        if (error instanceof SyntaxError) {
          return new Response('Invalid JSON body', { status: 400 })
        }
        return new Response('Error saving data to Redis', { status: 500 })
      }
    }

    // Handle GET requests to retrieve data
    if (req.method === 'GET' && url.pathname.length > 1) {
      const key = url.pathname.substring(1) // Remove leading '/'

      try {
        const data = await redis.lrange(key, 0, -1)
        return new Response(JSON.stringify(data), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        })
      } catch (error) {
        console.error(error)
        return new Response('Error retrieving data from Redis', {
          status: 500,
        })
      }
    }

    // Handle not found cases
    return new Response('Not Found', { status: 404 })
  },
  error(error) {
    console.error(error)
    return new Response('An unexpected error occurred', { status: 500 })
  },
})

console.log('Bun server running on port 3000')