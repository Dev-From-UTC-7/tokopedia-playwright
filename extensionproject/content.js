chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'scrapeProduct') {
    const priceElement = document.querySelector('div[data-testid="lblPDPDetailProductPrice"]');
    const nameElement = document.querySelector('h1[data-testid="lblPDPDetailProductName"]');
    
    let price = null;
    let productName = null;

    if (priceElement) {
      const priceText = priceElement.innerText;
      price = parseInt(priceText.replace(/Rp|\./g, ''), 10);
    }

    if (nameElement) {
      productName = nameElement.innerText.trim();
    }

    const productData = {
      price: price,
      productName: productName,
      url: window.location.href,
      timestamp: new Date().toISOString()
    };

    if (productData.price !== null && productData.productName !== null) {
      chrome.runtime.sendMessage({ action: 'sendData', data: productData });
      sendResponse({ status: "success", data: productData });
    } else {
      sendResponse({ status: "error", message: "Price or product name element not found." });
    }
    return true; 
  }
});
