import { GoogleGenAI } from "@google/genai";

export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const API_URL = ""; // Relative paths work fine since we use Vite proxy or same-origin Express
