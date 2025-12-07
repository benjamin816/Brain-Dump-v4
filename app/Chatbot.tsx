// app/Chatbot.tsx
'use client';

import { useState, useRef, useEffect } from 'react';

// Define the types for our messages
interface Message {
  id: number;
  role: 'user' | 'model'; // Who sent the message
  text: string;
}

// Simple component for a typing indicator
const TypingIndicator = () => (
  <div style={{ padding: '8px', borderRadius: '15px', backgroundColor: '#e0e0e0', maxWidth: '100px' }}>
    <span style={{ animation: 'blink 1s infinite', display: 'inline-block' }}>...</span>
  </div>
);


export default function Chatbot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom of the chat window
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  // Function to handle sending the message
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { id: Date.now(), role: 'user', text: input.trim() };
    const newHistory = [...messages, userMessage];
    
    setMessages(newHistory);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          history: newHistory.filter(m => m.role !== 'model' || m.text.length > 0), // Clean history
          prompt: input.trim() 
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Chat API failed: ${response.statusText}`);
      }

      // Handle streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      // Create a temporary message for streaming the model's response
      const modelMessageId = Date.now() + 1;
      setMessages(current => [...current, { id: modelMessageId, role: 'model', text: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullResponse += chunk;

        // Update the last message (the model's response) with the streamed text
        setMessages(current => 
          current.map(m => m.id === modelMessageId ? { ...m, text: fullResponse } : m)
        );
      }

      // Optional: Add logic here later to check for tool calls before setting the final message
      
    } catch (error) {
      console.error("Chat streaming error:", error);
      setMessages(current => [...current, { id: Date.now() + 2, role: 'model', text: `Sorry, I hit an error: ${error}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ border: '1px solid #ccc', borderRadius: '10px', height: '400px', display: 'flex', flexDirection: 'column', marginTop: '20px' }}>
      {/* Chat History Area */}
      <div style={{ flexGrow: 1, overflowY: 'auto', padding: '15px', backgroundColor: '#f9f9f9' }}>
        {messages.map((message) => (
          <div 
            key={message.id} 
            style={{ 
              display: 'flex', 
              justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
              marginBottom: '10px'
            }}
          >
            <div style={{
              padding: '8px 12px',
              borderRadius: '15px',
              maxWidth: '80%',
              backgroundColor: message.role === 'user' ? '#0070f3' : '#e0e0e0',
              color: message.role === 'user' ? 'white' : 'black',
              fontSize: '0.9rem'
            }}>
              {message.text}
            </div>
          </div>
        ))}
        {isLoading && messages[messages.length - 1]?.role === 'user' && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={sendMessage} style={{ display: 'flex', borderTop: '1px solid #ccc', padding: '10px' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask me to add an event, or search your notes..."
          style={{ flexGrow: 1, padding: '10px', border: '1px solid #ddd', borderRadius: '5px', marginRight: '10px', fontSize: '1rem' }}
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          style={{ padding: '10px 15px', backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', opacity: (input.trim() && !isLoading) ? 1 : 0.6 }}
        >
          Send
        </button>
      </form>
    </div>
  );
}
