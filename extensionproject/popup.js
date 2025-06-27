document.addEventListener('DOMContentLoaded', () => {
  const scrapeBtn = document.getElementById('scrapeBtn');
  const statusParagraph = document.getElementById('status');

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
