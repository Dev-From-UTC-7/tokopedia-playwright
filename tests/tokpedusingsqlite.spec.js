import { test } from '@playwright/test';
import { scrapeProducts } from '../functions/scrapeProducts';
import Database from 'better-sqlite3';

// Initialize SQLite database
const db = new Database('products.db');

// Create a table for storing product data (if it doesn't exist)
db.prepare(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price INTEGER NOT NULL,
    urlProduct TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

async function comparePrices(newData) {
  const priceDrops = [];
  for (const newProduct of newData) {
    // Get the latest price for this product from the database
    const oldProduct = db.prepare(`
      SELECT price FROM products
      WHERE name = ?
      ORDER BY timestamp DESC
      LIMIT 1
    `).get(newProduct.name);

    // Compare prices
    if (oldProduct && newProduct.price < oldProduct.price) {
      priceDrops.push({
        name: newProduct.name,
        oldPrice: oldProduct.price,
        newPrice: newProduct.price,
        urlProduct: newProduct.urlProduct,
      });
    }
  }
  return priceDrops;
}

async function saveToDatabase(data) {
  const insert = db.prepare(`
    INSERT INTO products (name, price, urlProduct)
    VALUES (?, ?, ?)
  `);

  // Check for price changes before inserting
  const checkPrice = db.prepare(`
    SELECT price FROM products
    WHERE name = ?
    ORDER BY timestamp DESC
    LIMIT 1
  `);

  // Insert each product into the database only if the price has changed
  data.forEach((product) => {
    const latestPrice = checkPrice.get(product.name);
    if (!latestPrice || latestPrice.price !== product.price) {
      insert.run(product.name, product.price, product.urlProduct);
      console.log(`Saved new price for ${product.name}: ${product.price}`);
    } else {
      console.log(`Skipped duplicate for ${product.name}: ${product.price}`);
    }
  });
  console.log('Data saved to database.');
}

async function getHistoricalData(productName) {
  return db.prepare(`
    SELECT price, timestamp FROM products
    WHERE name = ?
    ORDER BY timestamp DESC
  `).all(productName);
}

test('tokopedia using sqlite', async ({ browser }) => {
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
    const newData = allProducts;
    await saveToDatabase(newData);
    const priceDrops = await comparePrices(newData);
    console.info('Price Drops:', priceDrops);

    await context.close();
  } catch (error) {
    console.error('Error processing data:', error);
  }
});