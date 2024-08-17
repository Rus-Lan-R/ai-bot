import TelegramBot from "node-telegram-bot-api";
import {
  assistantInit,
  createThread,
  generateQuestions,
  getOpenAIResponse,
  simpleRequest,
} from "../services/openAi";

const ErrorMessage =
  "Произошла ошибка при выполнении вашего запроса. Пожалуйста, попробуйте позже.";

const Buttons = {
  startTest: "Начать тест",
  endTest: "Завершить тест",
};

const telgramBot = new TelegramBot(process.env.TELEGRAM_BOT_KEY || "", {
  polling: true,
});

let sessions: {
  [key: string]: {
    threadId: string;
    isQuizStarted: boolean;
    quiz: {
      pools: { [key: number | string]: number };
      answers: { [key: number | string]: number };
    };
  };
} = {};

export const bot = async () => {
  const { assistantId } = await assistantInit();
  telgramBot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    try {
      const intro = await simpleRequest(
        `Привет меня зовут ${msg.from?.first_name}`
      );
      await telgramBot.sendMessage(
        chatId,
        intro || `Привет ${msg.from?.first_name}, чем могу помочь?`
      );
    } catch (error) {
      console.error("Error /start command:", error);
      telgramBot.sendMessage(chatId, ErrorMessage);
    }
  });

  telgramBot.on("poll_answer", async (msg) => {
    const chatId = msg.user.id;
    sessions[chatId] = {
      ...sessions[chatId],
      quiz: {
        ...sessions[chatId]?.quiz,
        answers: {
          ...sessions[chatId]?.quiz?.answers,
          [msg.poll_id]: msg.option_ids[0],
        },
      },
    };
  });

  telgramBot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const userText = msg.text;

    if (!sessions?.[chatId]?.threadId) {
      const thread = await createThread();
      sessions[chatId] = {
        ...sessions[chatId],
        threadId: thread.id,
        isQuizStarted: false,
        quiz: { pools: {}, answers: {} },
      };
    }

    if (msg.entities && msg.entities[0].type === "bot_command") {
      return;
    }

    if (userText === Buttons.endTest) {
      sessions[chatId] = {
        ...sessions[chatId],
        isQuizStarted: false,
      };
      const quizData = sessions[chatId].quiz;

      const score = Object.entries(quizData.pools).reduce(
        (acc, [poolId, answer]) => {
          if (quizData.answers[poolId] === answer) {
            return (acc += 1);
          } else return acc;
        },
        0
      );

      telgramBot.sendMessage(
        chatId,
        `Квиз завершен \nВаш результат ${score}/${
          Object.values(quizData.pools).length
        }`,
        {
          reply_markup: {
            keyboard: [
              [
                {
                  text: Buttons.startTest,
                },
              ],
            ],
            resize_keyboard: true,
          },
        }
      );
      return;
    }

    if (userText === Buttons.startTest) {
      sessions[chatId] = {
        ...sessions[chatId],
        isQuizStarted: true,
        quiz: { pools: {}, answers: {} },
      };

      telgramBot.sendMessage(chatId, `Квиз запушен \nЗадайте мне вопрос`, {
        reply_markup: {
          keyboard: [
            [
              {
                text: Buttons.endTest,
              },
            ],
          ],
          resize_keyboard: true,
        },
      });

      return;
    }

    try {
      const aiResponse = await getOpenAIResponse({
        userText: userText?.trim(),
        assistantId,
        threadId: sessions[chatId].threadId,
      });

      telgramBot.sendMessage(chatId, aiResponse || "", {
        reply_markup: {
          keyboard: [
            [
              {
                text: sessions[chatId].isQuizStarted
                  ? Buttons.endTest
                  : Buttons.startTest,
              },
            ],
          ],
          resize_keyboard: true,
        },
      });

      if (sessions?.[chatId].isQuizStarted) {
        const questions = await generateQuestions({
          assistantId,
          threadId: sessions[chatId].threadId,
        });
        if (questions) {
          const correctIndex = questions.answers.findIndex(
            (item) => item.isCorrect
          );
          const pool = await telgramBot.sendPoll(
            chatId,
            questions.question,
            questions.answers.map((item) => item.answer),
            {
              type: "quiz",
              is_anonymous: false,
              correct_option_id: correctIndex,
            }
          );
          if (pool.poll?.id) {
            sessions[chatId] = {
              ...sessions[chatId],
              quiz: {
                ...sessions[chatId].quiz,
                pools: {
                  ...sessions[chatId].quiz.pools,
                  [pool.poll?.id]: correctIndex,
                },
              },
            };
          }
        }
      }
    } catch (error) {
      console.error("Error message:", error);
      telgramBot.sendMessage(chatId, ErrorMessage);
    }
  });
};
