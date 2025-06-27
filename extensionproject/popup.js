document.addEventListener('DOMContentLoaded', () => {
  const fetchBtn = document.getElementById('fetchBtn');
  const scrapeBtn = document.getElementById('scrapeBtn');
  const keyInput = document.getElementById('key-input');
  const statusParagraph = document.getElementById('status');
  const resultsContainer = document.getElementById('results-container');

  // Load saved key
  chrome.storage.local.get(['savedKey'], (result) => {
    if (result.savedKey) {
      keyInput.value = result.savedKey;
    }
  });

  keyInput.addEventListener('input', () => {
    chrome.storage.local.set({ savedKey: keyInput.value });
  });

  fetchBtn.addEventListener('click', () => {
    const key = keyInput.value.trim();
    if (key) {
      resultsContainer.innerHTML = 'Loading...';
      fetch(`http://localhost:3000/${key}`)
        .then(response => response.json())
        .then(data => {
          resultsContainer.innerHTML = '';
          if (Array.isArray(data) && data.length > 0) {
            data.forEach(item => {
              const row = document.createElement('div');
              row.className = 'result-row';

              const nameSpan = document.createElement('span');
              nameSpan.className = 'product-name';
              nameSpan.textContent = item.productName;
              nameSpan.title = item.productName;

              const priceSpan = document.createElement('span');
              priceSpan.className = 'product-price';
              priceSpan.textContent = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(item.price);

              row.appendChild(nameSpan);
              row.appendChild(priceSpan);
              resultsContainer.appendChild(row);
            });
          } else {
            resultsContainer.textContent = 'No results found.';
          }
        })
        .catch(error => {
          console.error('Error fetching data:', error);
          resultsContainer.textContent = 'Error fetching data.';
        });
    }
  });

  scrapeBtn.addEventListener('click', () => {
    statusParagraph.textContent = 'Scraping...';
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'scrapeProduct' }, (response) => {
        if (response && response.status === 'success') {
          statusParagraph.textContent = 'Product data sent!';
          statusParagraph.style.color = 'green';
        } else if (response && response.status === 'error') {
          statusParagraph.textContent = `Error: ${response.message}`;
          statusParagraph.style.color = 'red';
        } else {
          statusParagraph.textContent = 'Failed to get response from content script.';
          statusParagraph.style.color = 'orange';
        }
      });
    });
  });
});
