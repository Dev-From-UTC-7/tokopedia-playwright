require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });
async function notifyPriceDrops(priceDrops) {
  if (priceDrops.length > 0) {
    const message = priceDrops
      .map((drop) => `${drop.name}: ${drop.oldPrice} -> ${drop.newPrice}`)
      .join('\n');
    await bot.sendMessage(TELEGRAM_CHAT_ID, `Price drops detected:\n${message}`);
  }
}
module.exports = { notifyPriceDrops };