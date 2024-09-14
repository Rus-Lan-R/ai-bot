import dotenv from "dotenv";
dotenv.config();
import express, { Express } from "express";
import { bot } from "./modules/bot";
import { connect } from "./database";

const app: Express = express();

const port = process.env.PORT;

app.listen(port, async () => {
  await connect()
    .then(() => console.log("Connect to DB"))
    .catch(() => console.log("Error with DB"));

  await bot().then(() => {
    console.log("bot started");
  });

  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
