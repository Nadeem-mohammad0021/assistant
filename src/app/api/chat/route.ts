import { NextResponse } from 'next/server';
import Groq from "groq-sdk";

// Initialize the Groq client (server-side only)
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || "",
});

export async function POST(request: Request) {
  try {
    const { messages } = await request.json();
    
    const chatCompletion = await groq.chat.completions.create({
      messages: messages,
      model: "llama-3.3-70b-versatile",
    });

    const response = chatCompletion.choices[0]?.message?.content || "";
    
    return NextResponse.json({ content: response });
  } catch (error) {
    console.error("Error getting Groq completion:", error);
    return NextResponse.json({ error: "Failed to get AI response" }, { status: 500 });
  }
}