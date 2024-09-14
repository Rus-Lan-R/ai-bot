import ytdl from "@distube/ytdl-core";
import ffmpeg from "fluent-ffmpeg";
import { path } from "@ffmpeg-installer/ffmpeg";
import filePath from "path";
import fs from "fs";
ffmpeg.setFfmpegPath(path);

const agentOptions = {
  pipelining: 5,
  maxRedirections: 0,
};

const cookies = [{ name: "", value: "" }];

export class YtDownload {
  agent: any;
  constructor() {
    this.agent = ytdl.createAgent(cookies, agentOptions);
  }

  validateLink(url: string) {
    const isValid = ytdl.validateURL(url);

    return isValid;
  }

  async getAudio({
    chatId,
    videoURL,
    onSuccess,
    onError,
  }: {
    chatId: number;
    videoURL: string;
    onSuccess: ({ path }: { name: string; path: string }) => void;
    onError: ({ message, path }: { message: string; path: string }) => void;
  }) {
    const info = await ytdl.getBasicInfo(videoURL);
    const title = info.videoDetails.title;

    const pathLink = [
      process.env.PWD || "",
      "tmp",
      String(chatId),
      `${title}.mp3`,
    ];
    const tmpPath = filePath.join(...pathLink);
    const folderPath = filePath.join(...pathLink.slice(0, -1));
    const hasFolder = fs.existsSync(folderPath);
    if (!hasFolder) {
      fs.mkdirSync(folderPath);
    }

    const audioStream = ytdl(videoURL, {
      agent: this.agent,
      filter: "audioonly",
    });

    ffmpeg(audioStream)
      .audioBitrate(320)
      .save(tmpPath)
      .on("end", async (data) => {
        console.log(data);
        console.log("Audio downloaded successfully");
        onSuccess({ path: tmpPath, name: title });
      })
      .on("error", (err) => {
        onError({ message: err.message, path: tmpPath });
      });
  }
}
