document.addEventListener('DOMContentLoaded', () => {
  const fetchBtn = document.getElementById('fetchBtn');
  const scrapeBtn = document.getElementById('scrapeBtn');
  const clearBtn = document.getElementById('clearBtn');
  const keyInput = document.getElementById('key-input');
  const apiKeyInput = document.getElementById('api-key-input');
  const statusParagraph = document.getElementById('status');
  const resultsContainer = document.getElementById('results-container');

  // Function to fetch and display data
  const fetchDataAndDisplay = () => {
    const key = keyInput.value.trim();
    const apiKey = apiKeyInput.value.trim();
    if (key && apiKey) {
      resultsContainer.innerHTML = 'Loading...';
      fetch(`http://localhost:3000/${key}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        }
      })
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
    } else {
      resultsContainer.textContent = 'Enter a key and API key to fetch data.';
    }
  };

  // Load saved key and fetch data
  chrome.storage.local.get(['savedKey', 'apiKey'], (result) => {
    if (result.savedKey) {
      keyInput.value = result.savedKey;
    }
    if (result.apiKey) {
      apiKeyInput.value = result.apiKey;
    }
    fetchDataAndDisplay(); // Fetch data on load
  });

  keyInput.addEventListener('input', () => {
    chrome.storage.local.set({ savedKey: keyInput.value });
    fetchDataAndDisplay(); // Fetch data when key changes
  });

  apiKeyInput.addEventListener('input', () => {
    chrome.storage.local.set({ apiKey: apiKeyInput.value });
    fetchDataAndDisplay(); // Fetch data when key changes
  });

  fetchBtn.addEventListener('click', fetchDataAndDisplay); // Keep existing fetch button functionality

  scrapeBtn.addEventListener('click', () => {
    const key = keyInput.value.trim();
    const apiKey = apiKeyInput.value.trim();
    if (!key || !apiKey) {
      statusParagraph.textContent = 'Please enter a key and API key before scraping.';
      statusParagraph.style.color = 'orange';
      return;
    }

    statusParagraph.textContent = 'Scraping...';
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'scrapeProduct' }, (response) => {
        if (response && response.status === 'success' && response.data) {
          const productData = response.data;
          // Now send this data to your backend
          fetch('http://localhost:3000/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({ key, ...productData }),
          })
            .then(postResponse => {
              if (postResponse.ok) {
                statusParagraph.textContent = 'Product data sent and saved!';
                statusParagraph.style.color = 'green';
                fetchDataAndDisplay(); // Refetch data after successful save
              } else {
                statusParagraph.textContent = 'Failed to save product data.';
                statusParagraph.style.color = 'red';
              }
            })
            .catch(error => {
              console.error('Error sending data to backend:', error);
              statusParagraph.textContent = 'Error sending data to backend.';
              statusParagraph.style.color = 'red';
            });
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

  clearBtn.addEventListener('click', () => {
    const key = keyInput.value.trim();
    const apiKey = apiKeyInput.value.trim();
    if (key && apiKey) {
      statusParagraph.textContent = 'Clearing data...';
      fetch(`http://localhost:3000/clear/${key}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        }
      })
        .then(response => {
          if (response.ok) {
            statusParagraph.textContent = 'Data cleared successfully!';
            statusParagraph.style.color = 'green';
            resultsContainer.innerHTML = ''; // Clear displayed results
          } else {
            statusParagraph.textContent = 'Failed to clear data.';
            statusParagraph.style.color = 'red';
          }
        })
        .catch(error => {
          console.error('Error clearing data:', error);
          statusParagraph.textContent = 'Error clearing data.';
          statusParagraph.style.color = 'red';
        });
    } else {
      statusParagraph.textContent = 'Please enter a key to clear data.';
      statusParagraph.style.color = 'orange';
    }
  });
});
