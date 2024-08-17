import dotenv from "dotenv";
dotenv.config();
import express, { Express } from "express";
import { bot } from "./services/telegramBot";

const app: Express = express();

const port = process.env.PORT;

bot()
  .then(() => {
    console.log("bot started");
  })
  .catch((e) => {
    console.log(e);
  });
const server = app.listen(port, async () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
