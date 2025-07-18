
async function scrapeProducts(page, url, config) {
  let products = [];
  let stockEmptyStatus = false;

  // Navigate to the URL
  await page.goto(url);

  // Ensure the page is fully loaded by waiting for key elements to appear
  try {
    await page.waitForSelector('.css-79elbk', { timeout: 3000 }); // Wait up to 30 seconds for the product list
  } catch (error) {
    console.warn(`Timeout waiting for product list selector: ${url}`);
    return products; // Return an empty product array if the selector doesn't appear
  }

  // Check if product list exists after waiting
  const hasProducts = await page.$('.css-79elbk');
  if (!hasProducts) {
    console.warn(`No products found on page: ${url}`);
    return products; // Return an empty product array if no products are found
  }

  while (true) {
    await scrollToBottom(page);

    // Wait for the selector, but handle cases where it might not appear
    try {
      await waitForSelectorWithTimeout(page, '.css-79elbk', 10000);
    } catch (error) {
      console.warn('Product selector not found. Stopping scrape for this page.');
      break;
    }

    const pageProducts = await page.evaluate((config) => {
      const productElements = document.querySelectorAll('.css-79elbk');
      const products = [];
      let stockEmptyStatus = false;
      console.log(productElements)

      productElements.forEach((element) => {
        const cleanUrl = (url) => new URL(url).origin + new URL(url).pathname;

        // You must verify this selector by inspecting an "Out of Stock" product.
        const emptyStockIdentifier = element.querySelector('.some-out-of-stock-class');

        if (emptyStockIdentifier == null) {
          // Robust: Targets the main link wrapper for the product URL.
          const urlProduct = element.querySelector('a')?.getAttribute('href');

          // Robust: Uses the 'alt' attribute of the image, which is very stable.
          const imgLink = element.querySelector('img[alt="product-image"]')?.getAttribute('src') || 'https://via.placeholder.com/150';

          // Using 'contains' attribute selector for robustness against dynamic class changes.
          const name = element.querySelector('span[class*="_0T8-iGxMpV6NEsYEhwkqEg=="]')?.textContent.trim();

          // Using 'contains' attribute selector for robustness against dynamic class changes.
          const priceText = element.querySelector('div[class*="_67d6E1xDKIzw+i2D2L0tjw=="]')?.textContent.trim();

          // The rest of your logic remains the same.
          if (name && priceText && urlProduct) {
            const price = parseInt(priceText.replace(/[^0-9]/g, ''), 10);
            if (price >= config.startPrice && price <= config.endPrice) {
              products.push({ name, price, urlProduct: cleanUrl(urlProduct), imgLink });
            }
          }
        } else {
          stockEmptyStatus = true;
        }
      });

      return { products, stockEmptyStatus };
    }, config);

    products = products.concat(pageProducts.products);
    stockEmptyStatus = pageProducts.stockEmptyStatus;

    if (stockEmptyStatus) {
      console.warn('Out of stock products identified. Stopping scrape for this page.');
      break;
    }

    const nextButton = await page.$('[data-testid="btnShopProductPageNext"]');
    if (nextButton) {
      try {
        await navigateToNextPage(page);
      } catch (error) {
        console.error('Error navigating to next page:', error);
        break;
      }
    } else {
      break;
    }
  }

  return products;
}


async function waitForSelectorWithTimeout(page, selector, timeout) {
  try {
    await page.waitForSelector(selector, { timeout });
  } catch (error) {
    console.error(`Timeout waiting for selector: ${selector}`);
    throw error;
  }
}

async function scrollToBottom(page) {
  const scrollStep = 500; // Amount to scroll in each step
  const scrollDelay = 100; // Delay between each scroll step in milliseconds

  await page.evaluate(async ({ scrollStep, scrollDelay }) => {
    const scrollHeight = document.body.scrollHeight;
    let currentScroll = 0;

    while (currentScroll < scrollHeight) {
      window.scrollBy(0, scrollStep);
      currentScroll += scrollStep;
      await new Promise(resolve => setTimeout(resolve, scrollDelay));
    }
  }, { scrollStep, scrollDelay });
}

async function navigateToNextPage(page) {
  const maxRetries = 5; // Maximum number of retries
  const initialTimeout = 15000; // Initial timeout in milliseconds
  const timeoutIncrement = 5000; // Increment timeout by this amount on each retry
  const contentLoadedSelector = '.css-79elbk'; // Selector indicating content is loaded

  let currentTimeout = initialTimeout;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      // Ensure the next button is visible before clicking
      // await page.waitForSelector('[data-testid="btnShopProductPageNext"]:not([disabled])', { timeout: currentTimeout });

      // Add a small delay before clicking the next button
      await page.waitForTimeout(500);

      // Click the next button
      await page.click('[data-testid="btnShopProductPageNext"]');

      // Wait for the specific selector indicating content is loaded
      // await page.waitForSelector(contentLoadedSelector, { timeout: currentTimeout });

      break; // Break out of the loop if navigation is successful
    } catch (error) {
      retryCount++;
      currentTimeout += timeoutIncrement;
      console.error(`Navigation timeout, retrying (attempt ${retryCount})...`);
    }
  }

  if (retryCount === maxRetries) {
    console.error('Navigation failed after maximum retries, continuing the script...');
  }
}

module.exports = { scrapeProducts };