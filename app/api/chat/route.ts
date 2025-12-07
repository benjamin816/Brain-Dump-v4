// app/api/chat/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai'; 

// Initialize the Gemini client by passing the key from the environment variables
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }); // ⬅️ Ensure this line is correct

// ... (Keep the systemInstruction definition here) ...

// Placeholder for the real calendar creation logic.
// This function is executed locally when Gemini decides to call it.
const createCalendarEvent = (title: string, date: string, time: string): string => {
  // We'll replace this with the actual Google Calendar API call soon.
  // For now, it returns a structured success message for Gemini to read.
  return JSON.stringify({
    success: true,
    action: "create",
    details: `Successfully prepared to schedule "${title}" on ${date} at ${time}.`,
    note: "This is a dummy response. The full calendar logic is not yet implemented."
  });
};

// ... (Keep the calendarToolSchema definition here, ensuring Type.STRING, etc., are used) ...

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

// app/api/chat/route.ts (REPLACE THE ENTIRE POST FUNCTION)

export async function POST(request: NextRequest) {
  try {
    const { history, prompt } = await request.json();

    // 1. Prepare the chat history for the model
    const contents = history.map((msg: any) => ({
      role: msg.role,
      parts: [{ text: msg.text }],
    }));
    contents.push({ role: 'user', parts: [{ text: prompt }] });
    
    // 2. First API Call: Ask Gemini for the next step (text or function call)
    const firstResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        tools: [calendarToolSchema],
      },
    });

    let finalResponse = firstResponse;

    // 3. Tool Execution Loop
    if (firstResponse.functionCalls && firstResponse.functionCalls.length > 0) {
      const toolCall = firstResponse.functionCalls[0];
      
      // We only have one tool right now: createCalendarEvent
      if (toolCall.name === 'createCalendarEvent') {
        // Cast arguments for type safety (if your code uses TypeScript)
        const { title, date, time } = toolCall.args as { title: string, date: string, time: string };
        
        // Execute the local function (the placeholder)
        const toolOutput = createCalendarEvent(title, date, time);

        // Add the function response to the conversation history
        contents.push({
          role: 'model',
          parts: [{ functionCall: toolCall }],
        });
        contents.push({
          role: 'function',
          parts: [{
            functionResponse: {
              name: 'createCalendarEvent',
              response: toolOutput,
            },
          }],
        });

        // Second API Call: Send the function's output back to Gemini
        // This makes Gemini generate a human-readable reply.
        finalResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: contents,
          config: {
            systemInstruction: systemInstruction,
          },
        });
      }
    }

    // 4. Return the Final Text Response (Non-Streaming for stability)
    const responseText = finalResponse.text || "I was unable to process that request. Please try again or rephrase your request.";

    return new NextResponse(responseText, {
        headers: { 'Content-Type': 'text/plain' },
    });

  } catch (error) {
    console.error("Chat API Error:", error);
    // Return a clearer error message in the final response
    return new NextResponse(`Sorry, I hit an error: ${error instanceof Error ? error.message : String(error)}`, { status: 500 });
  }
}
