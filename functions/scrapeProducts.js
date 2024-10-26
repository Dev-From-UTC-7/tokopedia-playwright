async function scrapeProducts(page, url, config) {
  let products = [];
  await page.goto(url);
  await waitForSelectorWithTimeout(page, '.css-1sn1xa2', 10000);
  let stockEmptyStatus = false;

  while (true) {
    await scrollToBottom(page);
    await waitForSelectorWithTimeout(page, '.prd_link-product-price', 10000);

    const pageProducts = await page.evaluate((config) => {
      const productElements = document.querySelectorAll('.css-1sn1xa2');
      const products = [];
      let stockEmptyStatus = false;

      productElements.forEach((element) => {
        const emptyStockIdentifier = element.querySelector('.css-szwojr');
        if (emptyStockIdentifier == null) {
          const name = element.querySelector('[data-testid="linkProductName"]').textContent.trim();
          const priceText = element.querySelector('[data-testid="linkProductPrice"]').textContent.trim();
          const price = parseInt(priceText.replace(/[^0-9]/g, ''), 10);
          const urlProduct = element.querySelector('.css-gwkf0u').getAttribute('href');

          if (price >= config.startPrice && price <= config.endPrice) {
            products.push({ name, price, urlProduct });
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
      break;
    }

    const nextButton = await page.$('[data-testid="btnShopProductPageNext"]');

    if (nextButton && !stockEmptyStatus) {
      await navigateToNextPage(page);
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
  const navigationPromise = page.waitForNavigation({
    waitUntil: 'networkidle',
    timeout: 10000,
  });
  await page.click('[data-testid="btnShopProductPageNext"]');
  try {
    await navigationPromise;
  } catch (error) {
    console.error('Navigation timeout, continuing the script...');
  }
}

module.exports = { scrapeProducts };