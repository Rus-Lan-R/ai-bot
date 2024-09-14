import fs from "fs";
import TgBot from "node-telegram-bot-api";
import { YtDownload } from "./ytdl";
import { User } from "../database/users";
import { Logs } from "../database/loggs";

const ytRegex =
  /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|.+\/.+\/|user\/\w+\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/g;

export class TelegramBot {
  bot: TgBot;
  ytdl: YtDownload;

  constructor() {
    this.bot = new TgBot(process.env.TELEGRAM_BOT_KEY || "", {
      polling: true,
    });
    this.ytdl = new YtDownload();
  }

  async init() {
    this.bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
      try {
        let user = await User.findOne({ chat_id: chatId });
        if (!user) {
          user = await User.create({
            chat_id: chatId,
            first_name: msg.chat.first_name,
            last_name: msg.chat.last_name,
            username: msg.sender_chat?.active_usernames,
            language_code: msg.from?.language_code,
          });
        }

        await this.bot.sendMessage(chatId, "Hi i'm bot");
        await Logs.create({
          user_id: user._id,
          message_id: msg.message_id,
          text: "/start",
        });
      } catch (error) {
        console.log(error);
      }
    });
  }

  async ytLinkListen() {
    this.bot.onText(ytRegex, async (msg) => {
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
              console.log("delete");
              this.deleteFile(path);
            }, 60 * 1000);
          },
          onError: async ({ message, path }) => {
            await this.bot.sendMessage(chatId, `Error: ${message}`);
            this.deleteFile(path);
          },
        });
      } else {
        await this.bot.sendMessage(chatId, "Invalid link");
      }
    });
  }

  async listenMessages() {
    this.bot.on("message", async (msg) => {
      const chatId = msg.chat.id;
      await this.bot.sendMessage(chatId, "Send me youtube link");
    });
  }

  deleteFile(path: string) {
    fs.unlinkSync(path);
  }
}
