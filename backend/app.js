require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Load env variables
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Init Telegram bot
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

// Init Gemini AI
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

function splitMessage(message, chunkSize = 3500) {
  const chunks = [];
  for (let i = 0; i < message.length; i += chunkSize) {
    chunks.push(message.substring(i, i + chunkSize));
  }
  return chunks;
}

// Start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  const welcomeMessage = `
Hey ${msg.from.first_name || "there"} 👋

I'm your Mini AI Chat Bot.
Just send a message and I’ll help you with smart responses.

Try these examples:
    • Explain JWT like I'm 10
    • Write a LinkedIn message to HR for job referral
    • Give a fun tech fact
    • Solve a DSA problem

Type /help to learn more.`;

  bot.sendMessage(chatId, welcomeMessage, { parse_mode: "Markdown" });
});

// Help command
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;

  const helpText = `
📌 **Available Commands**
/start — Reset and see introduction
/help — Show this help menu

💡 **Just ask anything**
Examples:
- "Explain Kubernetes simply"
- "Write resume summary for frontend intern"
- "Create Node.js API example"
`;

  bot.sendMessage(chatId, helpText, { parse_mode: "Markdown" });
});

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const userText = msg.text?.trim();

  // Skip command handling here (handled above)
  if (!userText || userText.startsWith("/")) return;

  try {
    await bot.sendChatAction(chatId, "typing");

    // Generate AI Response
    const response = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: userText }] }],
    });

    const aiReply = response?.response?.text() || "⚠️ No response from AI";

    // Split long messages
    const parts = splitMessage(aiReply);
    for (const part of parts) {
      await bot.sendMessage(chatId, part);
    }
  } catch (err) {
    console.error("AI ERROR:", err);

    // Send clean error message to user
    await bot.sendMessage(
      chatId,
      "⚠️ Oops! Something went wrong while processing your request.\nPlease try again in a moment."
    );
  }
});
