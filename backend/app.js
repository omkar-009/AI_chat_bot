require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Load env variables
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Initialize Telegram bot
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

// Initialize Gemini
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

// Function to split long responses
function splitMessage(message, chunkSize = 3500) {
  const chunks = [];
  for (let i = 0; i < message.length; i += chunkSize) {
    chunks.push(message.substring(i, i + chunkSize));
  }
  return chunks;
}

// Start command (supports with & without slash)
bot.onText(/^\/?start$/i, (msg) => {
  const chatId = msg.chat.id;

  const welcomeMessage = `
Hey ${msg.from.first_name || "there"} 👋

I'm your Mini AI Chat Bot.
I reply short & concise by default. If you want a deep explanation, just say "explain in detail" or "long answer".

Try these examples:
• Explain JWT like I'm 10
• Write a LinkedIn message to HR for job referral
• Give a fun tech fact
• Solve a DSA problem

Type help for menu.
`;

  bot.sendMessage(chatId, welcomeMessage, { parse_mode: "Markdown" });
});

// Help command (supports with & without slash)
bot.onText(/^\/?help$/i, (msg) => {
  const chatId = msg.chat.id;

  const helpText = `
📌 *Available Commands*
start — Show welcome intro
help — Show this help menu

💡 *Examples you can ask*
- "Explain Kubernetes simply"
- "Create Node.js API example"
- "Write resume summary"
- "Explain in detail how Docker works"`;

  bot.sendMessage(chatId, helpText, { parse_mode: "Markdown" });
});

// Message listener
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const userText = msg.text?.trim();

  // Do not reply to start/help here as already handled
  if (!userText || /^\/?start$/i.test(userText) || /^\/?help$/i.test(userText)) return;

  try {
    await bot.sendChatAction(chatId, "typing");

    // Generate AI Response
    const response = await model.generateContent({
      contents: [
        {
          role: "system",
          parts: [{
            text:
              "You are a helpful AI assistant. Always give short and concise answers by default (max 6 sentences). " +
              "If the user requests: 'explain in detail', 'deep explanation', 'long answer', 'full explanation', or similar phrases — provide a long detailed answer instead."
          }]
        },
        {
          role: "user",
          parts: [{ text: userText }]
        }
      ],
    });

    const aiReply = response?.response?.text() || "⚠️ No response from AI";

    // Split long messages
    const messageParts = splitMessage(aiReply);
    for (const part of messageParts) {
      await bot.sendMessage(chatId, part);
    }
  } catch (err) {
    console.error("AI ERROR:", err);
    await bot.sendMessage(
      chatId,
      "⚠️ Oops! Something went wrong. Please try again shortly."
    );
  }
});