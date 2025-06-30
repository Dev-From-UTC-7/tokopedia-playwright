
import { test, expect } from '@playwright/test';
import { firefox } from 'playwright';
// import fetch from 'node-fetch';

test('compare prices from API', async () => {
  const browser = await firefox.launch({ headless: false }); // Launch a single browser instance
  const context = await browser.newContext(); // Create a single browser context

  const fetch = (await import('node-fetch')).default;
  const response = await fetch('http://localhost:3000/anudhana');
  const products = await response.json();

  await Promise.all(products.map(async (productData) => {
    let product;
    // The data from Redis might be a string or already a JSON object.
    // This handles both cases.
    if (typeof productData === 'string') {
      try {
        product = JSON.parse(productData);
      } catch (e) {
        console.error('Failed to parse product JSON string:', productData);
        return; // Skip this product
      }
    } else {
      product = productData;
    }

    const { productName, price: savedPrice, url } = product;
    const page = await context.newPage(); // Open new pages within this context
    try {
      await page.goto(url);

      // This selector is a common one for Tokopedia, but might need adjustment
      // if the site structure has changed.
      const livePriceElement = await page.waitForSelector('div[data-testid="lblPDPDetailProductPrice"]');
      const livePriceText = await livePriceElement.innerText();

      // Clean the price text (e.g., "Rp 123.456" -> 123456)
      const livePrice = parseInt(livePriceText.replace(/[^0-9]/g, ''), 10);

      console.log(`Comparing price for: ${productName}`);
      console.log(`  - Saved price: ${savedPrice}`);
      console.log(`  - Live price:  ${livePrice}`);

      if (savedPrice !== livePrice) {
        console.log(`  - !!! Price has changed for ${productName} !!!`);
      } else {
        console.log(`  - Price is the same.`);
      }

      // Add an assertion for testing purposes
      expect(livePrice).toBeGreaterThan(0);
    } catch (error) {
      console.error(`Error processing ${productName} (${url}):`, error);
    } finally {
      await page.close();
    }
  }));
  await browser.close(); // Close the browser when all pages are processed
});
