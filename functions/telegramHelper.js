require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });

async function notifyPriceDrops(priceDrops) {
  if (priceDrops.length > 0) {
    const messageChunks = splitMessageIntoChunks(priceDrops);
    for (const chunk of messageChunks) {
      await bot.sendMessage(TELEGRAM_CHAT_ID, `Price drops detected:\n${chunk}`);
    }
  }
}

function splitMessageIntoChunks(priceDrops, chunkSize = 4096) {
  const chunks = [];
  let currentChunk = '';

  priceDrops.forEach((drop) => {
    const dropMessage = `${drop.name}: ${drop.oldPrice} -> ${drop.newPrice}\nlink : ${drop.urlProduct}\n`;
    if (currentChunk.length + dropMessage.length > chunkSize) {
      chunks.push(currentChunk.trim());
      currentChunk = dropMessage;
    } else {
      currentChunk += dropMessage;
    }
  });

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}
module.exports = { notifyPriceDrops };