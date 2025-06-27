import { Redis } from '@upstash/redis'
import express from 'express'
const redis = Redis.fromEnv()

const app = express()
app.use(express.json())

app.post('/', async (req, res) => {
  const { key, price, url } = req.body

  if (!key || !price || !url) {
    return res.status(400).send('Missing required fields: key, price, and url are required.')
  }

  try {
    const timestamp = new Date().toISOString()
    const newData = { url, price, timestamp }
    await redis.rpush(key, newData)
    res.status(200).send('Data appended to Redis list')
  } catch (error) {
    console.error(error)
    res.status(500).send('Error saving data to Redis')
  }
})

app.get('/:key', async (req, res) => {
  const { key } = req.params

  if (!key) {
    return res.status(400).send('Missing key in path')
  }

  try {
    const data = await redis.lrange(key, 0, -1)
    res.status(200).json(data)
  } catch (error) {
    console.error(error)
    res.status(500).send('Error retrieving data from Redis')
  }
})

app.listen(3000, () => {
  console.log('Server is running on port 3000')
})

