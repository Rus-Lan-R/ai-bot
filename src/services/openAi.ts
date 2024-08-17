import OpenAI from "openai";
import { assistantPrompt, questionPrompt, introPrompt } from "../const/prompt";
import fs from "fs";
import path from "path";
import { extractTextWithoutAnnotations } from "../helpers/utils";
import { Run } from "openai/resources/beta/threads/runs/runs";
import { Message } from "openai/resources/beta/threads/messages";

interface IQuestions {
  question: string;
  answers: { answer: string; isCorrect: boolean }[];
}

const aiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const storeName = "rag-vs-store";
const files = fs.readdirSync(path.join(process.env.PWD || "", "docs"));

export const assistantInit = async () => {
  console.log("start file uploading");
  const list = await aiClient.files.list();

  const oldFiles = list.data.filter((item) => files.includes(item.filename));
  const oldFileNames = oldFiles.map((item) => item.filename);
  const newFiles = files.filter((item) => !oldFileNames.includes(item));

  console.log("total files", list?.data?.length);
  console.log("new files", newFiles);
  console.log("old files", oldFileNames);

  const vectorStores = await aiClient.beta.vectorStores.list();

  console.log("stores count", vectorStores.data.length);
  const oldStore = vectorStores.data.find((item) => item.name === storeName);
  console.log("old vs", oldStore?.id);
  const fileStreams = newFiles.map((fileName) =>
    fs.createReadStream(path.join(process.env.PWD || "", "docs", fileName))
  );

  const newFilesForRetrieval = await Promise.all(
    fileStreams.map((item) =>
      aiClient.files.create({
        file: item,
        purpose: "assistants",
      })
    )
  );

  let vectorStore;
  const fileIds = [...oldFiles, ...newFilesForRetrieval].map((item) => item.id);
  if (oldStore) {
    const batches = await aiClient.beta.vectorStores.fileBatches.create(
      oldStore.id,
      {
        file_ids: fileIds,
      }
    );

    console.log("add files status", batches.status);
    vectorStore = oldStore;
    console.log("use prev vs store", vectorStore.id);
  } else {
    vectorStore = await aiClient.beta.vectorStores.create({
      name: storeName,
      file_ids: [...oldFiles, ...newFilesForRetrieval].map((item) => item.id),
    });
    console.log("created new vs store", vectorStore.id);
  }

  console.log("files added to VS");
  console.dir(vectorStore, { depth: 5 });

  const assistant = await aiClient.beta.assistants.create({
    model: "gpt-4o",
    name: "AI-ассистент LATOKEN",
    instructions: assistantPrompt.trim(),
    temperature: 0.5,
    tool_resources: {
      file_search: {
        vector_store_ids: [vectorStore.id],
      },
    },
    tools: [
      { type: "file_search" },
      {
        type: "function",
        function: {
          name: "get_date",
          description: "function get today date and time",
          parameters: {
            type: "object",
            properties: {
              today_date: {
                type: "string",
                description: "Today date and time",
              },
            },
            required: ["today_date"],
            additionalProperties: false,
          },
        },
      },
    ],
  });

  return { assistantId: assistant.id };
};

export const createThread = async () => {
  const thread = await aiClient.beta.threads.create();
  return thread;
};

export const getOpenAIResponse = async ({
  userText,
  assistantId,
  threadId,
}: {
  userText?: string;
  assistantId: string;
  threadId: string;
}) => {
  if (!userText) return "Пожалуйста задайте вопрос";
  console.log("message", userText);

  await aiClient.beta.threads.messages.create(threadId, {
    role: "user",
    content: userText,
  });

  const run = await aiClient.beta.threads.runs.createAndPoll(threadId, {
    assistant_id: assistantId,
  });

  const message = await handleRunStatus(run, threadId);

  if (
    message?.content[0].type === "text" &&
    message.content[0].text.annotations.length
  ) {
    console.log("RAG --->", message.content[0].text.annotations[0]);
  }
  const text = extractTextWithoutAnnotations(message?.content || []);

  return text;
};

export const generateQuestions = async ({
  assistantId,
  threadId,
}: {
  assistantId: string;
  threadId: string;
}): Promise<IQuestions | undefined> => {
  await aiClient.beta.threads.messages.create(threadId, {
    role: "assistant",
    content: questionPrompt,
  });

  const run = await aiClient.beta.threads.runs.createAndPoll(threadId, {
    assistant_id: assistantId,
  });

  const message = await handleRunStatus(run, threadId);
  const text = extractTextWithoutAnnotations(message?.content || []);
  try {
    const questions = (await JSON.parse(text)) as IQuestions;
    return questions;
  } catch (error) {
    console.log(text);
    console.log(error);
    return undefined;
  }
};

export const simpleRequest = async (hiText: string) => {
  const response = await aiClient.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: assistantPrompt + introPrompt + `\n \n${hiText}`,
      },
    ],
  });

  return response.choices[0]?.message?.content;
};

const handleRequiresAction = async (run: Run, threadId: string) => {
  // Check if there are tools that require outputs
  if (
    run.required_action &&
    run.required_action.submit_tool_outputs &&
    run.required_action.submit_tool_outputs.tool_calls
  ) {
    // Loop through each tool in the required action section
    const toolOutputs = run.required_action.submit_tool_outputs.tool_calls.map(
      (tool) => {
        if (tool.function.name === "get_date") {
          return {
            tool_call_id: tool.id,
            output: new Date().toISOString(),
          };
        }
      }
    );

    // Submit all tool outputs at once after collecting them in a list
    if (toolOutputs?.length > 0 && toolOutputs) {
      run = await aiClient.beta.threads.runs.submitToolOutputsAndPoll(
        threadId,
        run.id,

        { tool_outputs: toolOutputs.filter((item) => !!item) }
      );
      console.log("Tool outputs submitted successfully.");
    } else {
      console.log("No tool outputs to submit.");
    }

    // Check status after submitting tool outputs
    return handleRunStatus(run, threadId);
  }
};

const handleRunStatus = async (
  run: Run,
  threadId: string
): Promise<Message | undefined> => {
  // Check if the run is completed
  if (run.status === "completed") {
    let messages = await aiClient.beta.threads.messages.list(threadId);
    return messages?.data?.[0];
  } else if (run.status === "requires_action") {
    console.log(run.status);
    return await handleRequiresAction(run, threadId);
  } else {
    console.error("Run did not complete:", run);
  }
};
