# Tokopedia Price Scraper

This project is a web scraper that monitors product prices on Tokopedia and sends alerts when price drops are detected. It uses Playwright for web scraping and a Telegram bot for notifications.

## Features

- Scrapes product information from multiple Tokopedia links
- Filters products based on a price range
- Detects price drops by comparing with previously saved data
- Sends notifications via Telegram when price drops are detected
- Runs automatically on a schedule using GitHub Actions

## Prerequisites

- Node.js (v20 or later)
- npm (Node Package Manager)
- A Telegram bot token and chat ID

## Installation

1. Clone this repository:

   ```
   git clone https://github.com/Dev-From-UTC-7/tokopedia-playwright
   cd tokopedia-playwright
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Set up environment variables (see Configuration section)

## Configuration

Create a `.env` file in the root directory with the following content:

```
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id
```

Replace `your_telegram_bot_token` and `your_telegram_chat_id` with your actual Telegram bot token and chat ID.

## Usage

To run the scraper manually:

```
npx playwright test
```

The scraper will run automatically on the schedule defined in the `.github/workflows/cron.yaml` file.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the [MIT License](LICENSE).
