import fs from "fs";
import TgBot from "node-telegram-bot-api";
import { YtDownload } from "./ytdl";
import { logFunction } from "../helpers/logger";

const ytRegex =
  /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|.+\/.+\/|user\/\w+\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/g;

export class TelegramBot {
  private bot: TgBot;
  private ytdl: YtDownload;

  constructor() {
    this.bot = new TgBot(process.env.TELEGRAM_BOT_KEY || "", {
      polling: true,
    });
    this.ytdl = new YtDownload();
  }

  async init() {
    this.bot.onText(
      /\/start/,
      logFunction(async (msg) => {
        const chatId = msg.chat.id;
        await this.bot.sendMessage(chatId, "Hi i'm bot");
      })
    );
  }

  async ytLinkListen() {
    this.bot.onText(
      ytRegex,
      logFunction(async (msg) => {
        const chatId = msg.chat.id;
        const userText = msg.text;

        const isValidLink = this.ytdl.validateLink(userText || "");

        if (isValidLink && userText) {
          await this.ytdl.getAudio({
            chatId,
            videoURL: userText,
            onSuccess: async ({ path, name }) => {
              const file = fs.readFileSync(path);
              await this.bot.sendAudio(chatId, file, {}, { filename: name });
              setTimeout(() => {
                this.deleteFile(path);
              }, 30 * 1000);
            },
            onError: async ({ message, path }) => {
              await this.bot.sendMessage(chatId, `Error: ${message}`);
              this.deleteFile(path);
            },
          });
        } else {
          await this.bot.sendMessage(chatId, "Invalid link");
        }
      })
    );
  }

  async listenMessages() {
    this.bot.on(
      "message",
      logFunction(async (msg) => {
        const chatId = msg.chat.id;
        await this.bot.sendMessage(chatId, "Send me youtube link");
      })
    );
  }

  deleteFile(path: string) {
    fs.unlinkSync(path);
  }
}
