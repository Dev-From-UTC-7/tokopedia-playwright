chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'sendData') {
    chrome.storage.local.get(['savedKey'], (result) => {
      const key = result.savedKey || 'tokopedia_products';
      fetch('http://localhost:3000/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          key: key,
          price: request.data.price,
          url: request.data.url,
          productName: request.data.productName
        })
      })
      .then(response => {
        if (response.ok) {
          return response.text().then(message => sendResponse({ status: 'success', message: message }));
        } else {
          return response.text().then(errorText => sendResponse({ status: 'error', message: `Server error: ${response.status} - ${errorText}` }));
        }
      })
      .catch(error => {
        console.error('Error:', error);
        sendResponse({ status: 'error', message: `Network error: ${error.message}` });
      });
    });
    return true; // Indicates that the response will be sent asynchronously
  }
});
