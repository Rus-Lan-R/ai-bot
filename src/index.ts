import dotenv from "dotenv";
dotenv.config();
import { bot } from "./services/telegramBot";

bot()
  .then(() => {
    console.log("bot started");
  })
  .catch((e) => {
    console.log(e);
  });
