const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
import { scrapeProducts } from '../functions/scrapeProducts';

const urls = [
  'https://www.tokopedia.com/gamingpcstore',
  'https://www.tokopedia.com/multipro-id',
  'https://www.tokopedia.com/enterkomputer',
  'https://www.tokopedia.com/cockomputer',
  'https://www.tokopedia.com/nanokomputer',
  'https://www.tokopedia.com/rakitancom',
  'https://www.tokopedia.com/duniastorage'

];

const keyword = process.argv[2];
if (!keyword) {
  console.error('Please provide a search keyword.');
  process.exit(1);
}

// Config for product scraping
const config = {
  startPrice: 0, // Set your price range here
  endPrice: 20000000,
};

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();

  // const browser = await chromium.launch({
  //   headless: false,
  //   args: [`--window-size=${3360},${1890}`], // Set window size to match your screen resolution
  // });

  // const context = await browser.newContext({
  //   viewport: { width: 3360, height: 1890 }, // Set viewport size to match your screen resolution
  // });

  const allProducts = [];

  // Use Promise.all to run scraping tasks in parallel
  await Promise.all(urls.map(async (baseUrl) => {
    const page = await context.newPage();
    const searchUrl = `${baseUrl}/product?q=${encodeURIComponent(keyword)}`;
    console.log(`Scraping ${searchUrl}...`);

    try {
      const products = await scrapeProducts(page, searchUrl, config);
      allProducts.push(...products); // Collect products from each page
    } catch (error) {
      console.error(`Error scraping ${searchUrl}:`, error);
    } finally {
      await page.close(); // Ensure page is closed after task is done
    }
  }));

  await browser.close();

  allProducts.sort((a, b) => a.price - b.price);
  // Generate HTML result
  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Product Results</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            padding: 20px;
            background-color: #f8f8f8;
        }
        .grid-container {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 20px;
        }
        .product-card {
            background: #fff;
            border: 1px solid #ddd;
            border-radius: 5px;
            padding: 10px;
            text-align: center;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        }
        .product-card img {
            max-width: 100%;
            max-height: 150px;
            margin-bottom: 10px;
        }
        .product-card h4 {
            font-size: 16px;
            margin: 10px 0;
        }
        .product-card p {
            margin: 5px 0;
        }
    </style>
</head>
<body>
    <h1>Product Results</h1>
    <div class="grid-container">
        ${allProducts.map(product => `
            <div class="product-card">
                <img src="${product.imgLink}" alt="${product.name}">
                <h4>${product.name}</h4>
                <p>Price: Rp ${product.price.toLocaleString('id-ID')}</p>
                <a href="${product.urlProduct}" target="_blank">View Product</a>
            </div>
        `).join('')}
    </div>
</body>
</html>
    `;

  const resultsDir = path.join(__dirname, '../test-results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir);
  }

  const filePath = path.join(resultsDir, 'results.html');
  fs.writeFileSync(filePath, htmlContent);
  console.log(`Results written to ${filePath}`);
})();
