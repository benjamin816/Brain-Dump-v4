// app/api/chat/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

// Initialize the Gemini client (uses the GEMINI_API_KEY from Vercel)
const ai = new GoogleGenAI({});

export async function POST(request: NextRequest) {
  try {
    const { history, prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: "Missing required 'prompt' field." }, { status: 400 });
    }

    // 1. Define the system instructions (this is the chatbot's personality and job)
    const systemInstruction = `You are a helpful and clear digital assistant that manages a user's Brain Dump. 
      Your primary goals are to: 
      1) Answer questions about their data (once tools are ready).
      2) Understand their intent (add, remove, find, or alter events/tasks).
      3) Respond in a fourth-grade reading level.
      4) You must use the provided tools when the user's request requires action (like adding a task or event).`;

    // 2. Prepare the chat history for the model
    // The history needs to be in a specific format for Gemini
    const contents = history.map((msg: any) => ({
      role: msg.role,
      parts: [{ text: msg.text }],
    }));
    contents.push({ role: 'user', parts: [{ text: prompt }] });
    
    // 3. Call the model and stream the response back
    const response = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        // Tools will go here later!
      },
    });

    // 4. Send the streaming response back to the client
    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of response) {
          // Check for text and send it
          if (chunk.text) {
            controller.enqueue(chunk.text);
          }
          // NOTE: Tool calls will be handled here later!
        }
        controller.close();
      },
    });

    return new NextResponse(stream, {
      headers: { 'Content-Type': 'text/plain' },
    });

  } catch (error) {
    console.error("Chat API Error:", error);
    return NextResponse.json(
      { error: "Failed to process chat request.", details: (error as Error).message },
      { status: 500 }
    );
  }
}
