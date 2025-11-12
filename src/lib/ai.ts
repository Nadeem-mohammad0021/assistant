import { ChatCompletionMessageParam } from "groq-sdk/resources/chat/completions.mjs";

/**
 * Function to get a chat completion from the Groq API via our server-side API route
 * @param messages Array of message objects with role and content
 * @returns The AI response
 */
export async function getGroqChatCompletion(messages: ChatCompletionMessageParam[]) {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.content;
  } catch (error) {
    console.error("Error getting Groq chat completion:", error);
    throw error;
  }
}

// Export the type for use in other files
export type { ChatCompletionMessageParam };