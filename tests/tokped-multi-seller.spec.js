const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { scrapeProducts } = require('../functions/scrapeProducts');

// Grouped seller URLs
const sellerGroups = {
  computer: [
    'https://www.tokopedia.com/gamingpcstore',
    'https://www.tokopedia.com/multipro-id',
    'https://www.tokopedia.com/enterkomputer',
    'https://www.tokopedia.com/cockomputer',
    'https://www.tokopedia.com/nanokomputer',
    'https://www.tokopedia.com/rakitancom',
    'https://www.tokopedia.com/duniastorage',
    'https://www.tokopedia.com/nvidiageforce',
    'https://www.tokopedia.com/gasol'
  ],
  skincare: [
    'https://www.tokopedia.com/schminkhaus',
    'https://www.tokopedia.com/nihonmart',
    'https://www.tokopedia.com/klairsid',
    'https://www.tokopedia.com/thenakedseries',
    'https://www.tokopedia.com/beautyhaulindo',
    'https://www.tokopedia.com/beautyofjoseon',
    'https://www.tokopedia.com/skin-1004',
    'https://www.tokopedia.com/venuss8'
  ],
};

const keyword = process.argv[2];
const category = process.argv[3]; // 2nd param for category
const shouldFilter = process.argv[4]; // 3rd param true false for forcing filter implementation
if (!keyword || !category) {
  console.error('Please provide both a search keyword and a seller category.');
  process.exit(1);
}

// Get seller URLs for the specified category
const urls = sellerGroups[category];
if (!urls) {
  console.error(`Invalid category: ${category}. Available categories: ${Object.keys(sellerGroups).join(', ')}`);
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

  const allProducts = [];

  // Use Promise.all to run scraping tasks in parallel
  await Promise.all(urls.map(async (baseUrl) => {
    const page = await context.newPage();
    const searchUrl = `${baseUrl}/product?q=${encodeURIComponent(keyword)}`;
    console.log(`Scraping ${searchUrl}...`);

    try {
      const products = await scrapeProducts(page, searchUrl, config);
      if (shouldFilter) {
        // Filter products to ensure they contain the keyword
        const filteredProducts = products.filter(product =>
          product.name.toLowerCase().includes(keyword.toLowerCase())
        );

        allProducts.push(...filteredProducts); // Collect filtered products from each page
      } else {
        allProducts.push(...products);
      }

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
    <title>Product Results for ${category}</title>
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
    <h1>Product Results for Category: ${category}</h1>
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

  const filePath = path.join(resultsDir, `results-${category}.html`);
  fs.writeFileSync(filePath, htmlContent);
  console.log(`Results written to ${filePath}`);

  // Open the HTML file in the default browser
  const { exec } = require('child_process');
  const os = require('os');
  function openHtml(filePath) {
    const platform = os.platform();
    let command;

    switch (platform) {
      case 'win32':
        command = `start ""`;
        break;
      case 'darwin':
        command = 'open';
        break;
      case 'linux':
        command = 'xdg-open';
        break;
      default:
        console.error('Unsupported platform');
        return;
    }

    exec(`${command} "${filePath}"`, (err) => {
      if (err) {
        console.error('Failed to open the file in the browser:', err);
      } else {
        console.log('Results HTML opened in the browser.');
      }
    });
  }

  // Usage
  openHtml(filePath);

})();
