
import { test, expect } from '@playwright/test';
// import fetch from 'node-fetch';

test('compare prices from API', async ({ page }) => {
  const fetch = (await import('node-fetch')).default;
  const response = await fetch('http://localhost:3000/anudhana');
  const products = await response.json();
  for (const productData of products) {
    let product;
    // The data from Redis might be a string or already a JSON object.
    // This handles both cases.
    if (typeof productData === 'string') {
      try {
        product = JSON.parse(productData);
      } catch (e) {
        console.error('Failed to parse product JSON string:', productData);
        continue; // Skip this product
      }
    } else {
      product = productData;
    }

    const { productName, price: savedPrice, url } = product;

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
  }
});
