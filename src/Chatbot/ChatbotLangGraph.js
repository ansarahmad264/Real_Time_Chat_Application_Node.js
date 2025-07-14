// src/chatbot.js
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { MessagesAnnotation, StateGraph, MemorySaver, START, END } from "@langchain/langgraph";

dotenv.config();
const llm = new ChatGoogleGenerativeAI({
  model: "gemini-2.0-flash",
  temperature: 0,
  apiKey: process.env.GOOGLE_GENAI_API_KEY,
});

// Function to call model using current conversation state
const callModel = async (state) => {
  const systemPrompt = "You are a helpful assistant. Answer clearly and politely.";
  const messages = [
    { role: "system", content: systemPrompt },
    ...state.messages,
  ];
  const response = await llm.invoke(messages);
  return { messages: response };
};

// Build the conversation workflow
const workflow = new StateGraph(MessagesAnnotation)
  .addNode("model", callModel)
  .addEdge(START, "model")
  .addEdge("model", END);

// Use MemorySaver to keep session-specific memory
const memory = new MemorySaver();
const chatbot = workflow.compile({ checkpointer: memory });

// Unique thread ID for each user/session
const threadId = uuidv4();

// Function to process a chat input
export async function chatWithMemory(userMessage) {
  const res = await chatbot.invoke(
    { messages: [{ role: "user", content: userMessage }] },
    { configurable: { thread_id: threadId } }
  );
  // Response includes full conversation history so far
  const lastAI = res.messages[res.messages.length - 1];
  return lastAI.content;
}
