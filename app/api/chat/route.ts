// app/api/chat/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai'; // ⬅️ ADDED 'Type' HERE!

// app/api/chat/route.ts

// Initialize the Gemini client by passing the key from the environment variables
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }); // ⬅️ FIXED!

// app/api/chat/route.ts (after imports)

// NOTE: We will fill out the actual logic for this function later.
const createCalendarEvent = (title: string, date: string, time: string) => {
  console.log(`Tool called: createCalendarEvent - Title: ${title}, Date: ${date}, Time: ${time}`);
  return "Event placeholder created successfully. Waiting for full implementation.";
};

// This is the structure (schema) that describes the function to Gemini
const calendarToolSchema = {
  functionDeclarations: [
    {
      name: 'createCalendarEvent',
      description: 'Creates a new event on the user\'s Google Calendar. Use this for events, meetings, appointments, or anything with a specific date and time.',
      parameters: {
        type: Type.OBJECT, // ⬅️ FIXED!
        properties: {
          title: {
            type: Type.STRING, // ⬅️ FIXED!
            description: 'The short, descriptive title for the event, e.g., "Dentist Appointment" or "Meeting with John".',
          },
          date: {
            type: Type.STRING, // ⬅️ FIXED!
            description: 'The date for the event in YYYY-MM-DD format, or a relative date like "today", "tomorrow", "next Monday", or "Dec 15".',
          },
          time: {
            type: Type.STRING, // ⬅️ FIXED!
            description: 'The specific time for the event, e.g., "3:00 PM", or a duration like "2 hours" if only a start time is given.',
          },
        },
        required: ['title', 'date'],
      },
    },
  ],
};
// ... rest of the file continues below ...

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
    
// app/api/chat/route.ts (inside POST function)

    // 3. Call the model and stream the response back
    const response = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        // ⬇️ ⬇️ ⬇️ ADD THIS LINE ⬇️ ⬇️ ⬇️
        tools: [calendarToolSchema], 
        // ⬆️ ⬆️ ⬆️ END OF ADDITION ⬆️ ⬆️ ⬆️
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
