require('dotenv').config();
import { test } from '@playwright/test';
import fs from 'fs';
const TelegramBot = require('node-telegram-bot-api');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });

async function scrapeProducts(page, url, config) {
  let products = [];
  await page.goto(url);
  await page.waitForSelector('.css-1sn1xa2', { timeout: 10000 });

  while (true) {
    await page.waitForSelector('.prd_link-product-price');

    const pageProducts = await page.evaluate((config) => {
      const productElements = document.querySelectorAll('.css-1sn1xa2');
      const products = [];

      productElements.forEach((element) => {
        const name = element.querySelector('[data-testid="linkProductName"]').textContent.trim();
        const priceText = element.querySelector('[data-testid="linkProductPrice"]').textContent.trim();
        const price = parseInt(priceText.replace(/[^0-9]/g, ''), 10);

        if (price >= config.startPrice && price <= config.endPrice) {
          products.push({ name, price });
        }
      });

      return products;
    }, config);

    products = products.concat(pageProducts);

    const nextButton = await page.$('[data-testid="btnShopProductPageNext"]');
    if (nextButton) {
      const navigationPromise = page.waitForNavigation({ waitUntil: 'networkidle' });
      await nextButton.click();
      await navigationPromise; // Wait for the next page to load
    } else {
      break;
    }
  }
  return products;
}

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

async function notifyPriceDrops(priceDrops) {
  if (priceDrops.length > 0) {
    const message = priceDrops
      .map((drop) => `${drop.name}: ${drop.oldPrice} -> ${drop.newPrice}`)
      .join('\n');
    await bot.sendMessage(TELEGRAM_CHAT_ID, `Price drops detected:\n${message}`);
  }
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
  } catch (error) {
    console.error('Error processing data:', error);
  }
});
