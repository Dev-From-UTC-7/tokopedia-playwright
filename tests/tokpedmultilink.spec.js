require('dotenv').config();
import { test } from '@playwright/test';
import fs from 'fs';
import { scrapeProducts } from '../functions/scrapeProducts';
import { notifyPriceDrops } from '../functions/telegramHelper';

async function comparePrices(newData, oldData) {
  const priceDrops = [];
  newData.forEach((newProduct) => {
    const oldProduct = oldData.find((p) => p.name === newProduct.name);
    if (oldProduct && newProduct.price < oldProduct.price) {
      priceDrops.push({
        name: newProduct.name,
        oldPrice: oldProduct.price,
        newPrice: newProduct.price,
      });
    }
  });
  return priceDrops;
}

async function saveToJson(data, filename) {
  fs.writeFileSync(filename, JSON.stringify(data, null, 2));
}

test('tokopedia multi link', async ({ browser }) => {
  const config = {
    startPrice: 200000,
    endPrice: 1500000,
  };

  const startLinks = [
    'https://www.tokopedia.com/moticc/etalase/in-ear-monitor',
    'https://www.tokopedia.com/csi-zone/etalase/earphone',
    'https://www.tokopedia.com/yankeeofficial/etalase/kiwi-ears',
    'https://www.tokopedia.com/yankeeofficial/etalase/simgot'
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
    const oldData = JSON.parse(fs.readFileSync('products.json', 'utf-8'));
    const newData = allProducts;
    saveToJson(newData, 'products.json');
    const priceDrops = await comparePrices(newData, oldData);
    await notifyPriceDrops(priceDrops);
    await context.close();
  } catch (error) {
    console.error('Error processing data:', error);
  }
});
