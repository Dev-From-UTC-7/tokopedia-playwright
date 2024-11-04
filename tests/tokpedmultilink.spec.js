require('dotenv').config();
import { test } from '@playwright/test';
import { createClient } from 'redis';
import { scrapeProducts } from '../functions/scrapeProducts';
import { notifyPriceDrops } from '../functions/telegramHelper';

const redisClient = createClient({
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT
  }
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));

async function comparePrices(newData, oldData) {
  const priceDrops = [];
  if (!oldData || !newData) {
    return priceDrops;
  }
  newData.forEach((newProduct) => {
    const oldProduct = oldData.find((p) => p.name === newProduct.name);
    if (oldProduct && newProduct.price < oldProduct.price) {
      priceDrops.push({
        name: newProduct.name,
        oldPrice: oldProduct.price,
        newPrice: newProduct.price,
        urlProduct: newProduct.urlProduct
      });
    }
  });
  return priceDrops;
}


async function saveToRedis(data, key) {
  await redisClient.connect();
  await redisClient.set(key, JSON.stringify(data));
  await redisClient.disconnect();
}

async function getFromRedis(key) {
  await redisClient.connect();
  const data = await redisClient.get(key);
  await redisClient.disconnect();
  return data ? JSON.parse(data) : null;
}

test('tokopedia multi link', async ({ browser }) => {
  const config = {
    startPrice: 200000,
    endPrice: 1500000,
  };

  const startLinks = [
    'https://www.tokopedia.com/moticc/etalase/in-ear-monitor',
    'https://www.tokopedia.com/csi-zone/etalase/earphone',
    'https://www.tokopedia.com/yankeeofficial/product',
    'https://www.tokopedia.com/kupingsensi/product'
  ];

  const allProducts = [];

  const context = await browser.newContext();
  const pages = await Promise.all(startLinks.map(async (link) => {
    const page = await context.newPage();
    return scrapeProducts(page, link, config);
  }));

  pages.forEach((products) => {
    allProducts.push(...products);
  });

  try {
    const oldData = await getFromRedis('products');
    const newData = allProducts;
    await saveToRedis(newData, 'products');
    const priceDrops = await comparePrices(newData, oldData);
    await notifyPriceDrops(priceDrops);
    await context.close();
  } catch (error) {
    console.error('Error processing data:', error);
  }
});
