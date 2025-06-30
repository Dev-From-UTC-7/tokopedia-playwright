import 'dotenv/config';
import { Redis } from '@upstash/redis'
import express from 'express';

const redis = Redis.fromEnv()

const app = express();
app.use(express.json()); // Middleware to parse JSON bodies

const PORT = 3000;

// Handle POST requests to add data
app.post('/', async (req, res) => {
  try {
    const { key, price, url: postUrl, productName } = req.body;

    if (!key || !price || !postUrl || !productName) {
      return res.status(400).send('Missing required fields: key, price, url, and productName are required.');
    }

    const timestamp = new Date().toISOString();
    const newData = { url: postUrl, price, timestamp, productName };
    await redis.rpush(key, JSON.stringify(newData));
    return res.status(200).send('Data appended to Redis list');
  } catch (error) {
    console.error(error);
    if (error instanceof SyntaxError) {
      return res.status(400).send('Invalid JSON body');
    }
    return res.status(500).send('Error saving data to Redis');
  }
});

// Handle GET requests to retrieve data
app.get('/:key', async (req, res) => {
  const key = req.params.key;

  try {
    const data = await redis.lrange(key, 0, -1);
    return res.status(200).json(data);
  } catch (error) {
    console.error(error);
    return res.status(500).send('Error retrieving data from Redis');
  }
});

// Handle DELETE requests to clear data
app.delete('/clear/:key', async (req, res) => {
  const key = req.params.key;

  try {
    await redis.del(key);
    return res.status(200).send(`Data for key '${key}' cleared successfully.`);
  } catch (error) {
    console.error(error);
    return res.status(500).send('Error clearing data from Redis');
  }
});

// Handle not found cases (for any other routes)
app.use((req, res) => {
  res.status(404).send('Not Found');
});

app.listen(PORT, () => {
  console.log(`Express server running on port ${PORT}`);
});