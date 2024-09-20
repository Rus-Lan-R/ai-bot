import { TelegramBot } from "../services/bot";

const telegramBot = new TelegramBot();

export const bot = async () => {
  await telegramBot.init();
  await telegramBot.ytLinkListen();
  // await telegramBot.listenMessages();
};
