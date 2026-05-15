import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
console.log("API Key present:", !!apiKey);

const genAI = new GoogleGenAI(apiKey || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

async function run() {
  try {
    const result = await model.generateContent("Hello?");
    const response = await result.response;
    console.log("Success:", response.text());
  } catch (err: any) {
    console.error("Error:", err.message);
    if (err.response) {
        console.error("Body:", JSON.stringify(err.response, null, 2));
    }
  }
}

run();
