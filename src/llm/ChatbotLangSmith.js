import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import dotenv from "dotenv";

dotenv.config();

const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.0-flash", // ✅ REQUIRED!
    temperature: 0,
    apiKey: process.env.GOOGLE_GENAI_API_KEY,
  });

const prompt = ChatPromptTemplate.fromMessages([
  ["system", "You talk like a pirate. Answer all questions to the best of your ability."],
  ["user", "{text}"],
]);

export async function chatWithNoMemory(text) {
  const input = await prompt.invoke({ text });
  const response = await model.invoke(input);
  return response.content;
}
