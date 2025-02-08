import { test } from '@playwright/test';
import { scrapeProducts } from '../functions/scrapeProducts';
import Database from 'better-sqlite3';

// Initialize SQLite database
const db = new Database('processor.db');

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
      if (product.price < latestPrice.price) {
        console.info(`[INFO] Price drop detected for ${product.name}:
          Old price: ${latestPrice.price}, New price: ${product.price}`);
      }
    } else {
      // console.log(`Skipped duplicate for ${product.name}: ${product.price}`);
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

test('processor using sqlite', async ({ browser }) => {
  const config = {
    startPrice: 200000,
    endPrice: 150000000,
  };

  const startLinks = [
    'https://www.tokopedia.com/cockomputer/etalase/amd-ryzen-9000-series',
    'https://www.tokopedia.com/enterkomputer/etalase/processor-amd'
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
    const priceDrops = await comparePrices(newData);
    await saveToDatabase(newData);
    console.info('Price Drops:', priceDrops);

    if (priceDrops.length > 0) {
      const priceDropMessage = priceDrops.map(pd => `[${pd.name}](${pd.urlProduct}): from ${pd.oldPrice} to ${pd.newPrice}`).join('\n');
      console.log(`::set-output name=priceDrops::${priceDropMessage}`);
    }

    await context.close();
  } catch (error) {
    console.error('Error processing data:', error);
  }
});
