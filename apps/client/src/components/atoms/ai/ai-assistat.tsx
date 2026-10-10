'use client';

import { useState, useRef, useEffect, type FormEvent } from 'react';
import { Send, Sparkles, X, Loader2 } from 'lucide-react';

function AIMessageBar() {
  const [input, setInput] = useState<string>('');
  const [messages, setMessages] = useState<{ text: string; isUser: boolean }[]>([]);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState<boolean>(false);

  // Simulate AI typing effect
  const simulateResponse = (userMessage: string) => {
    setIsTyping(true);

    // Simulate different responses based on input
    let response = "Hi there! I'm your AI assistant. How can I help you today?";

    if (userMessage.toLowerCase().includes('hello') || userMessage.toLowerCase().includes('hi')) {
      response = "Hello! I'm your friendly AI assistant. What can I do for you?";
    } else if (userMessage.toLowerCase().includes('help')) {
      response = "I'm here to help! You can ask me questions, request information, or just chat.";
    } else if (userMessage.toLowerCase().includes('thank')) {
      response = "You're welcome! Is there anything else you'd like to know?";
    } else if (userMessage.toLowerCase().includes('who are you')) {
      response = "I'm an AI assistant designed to be helpful, harmless, and honest!";
    }

    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [...prev, { text: response, isUser: false }]);
    }, 1500); // Delay for typing effect
  };

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();

    if (input.trim() === '') return;

    const userMessage = input;
    setMessages((prev) => [...prev, { text: userMessage, isUser: true }]);
    setInput('');

    simulateResponse(userMessage);
  };

  const clearChat = () => {
    setMessages([]);
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="mx-auto h-[600px] w-full max-w-xl overflow-hidden rounded-xl border border-indigo-500/20 bg-gradient-to-br from-slate-900 to-indigo-950 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-indigo-500/30 bg-indigo-600/30 p-4 backdrop-blur-sm">
        <div className="flex items-center space-x-2">
          <Sparkles className="h-5 w-5 text-indigo-300" />
          <h2 className="font-medium text-white">AI Assistant</h2>
        </div>
        <button
          type="button"
          onClick={clearChat}
          className="text-indigo-200 transition-colors hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages container */}
      <div className="h-[calc(100%-132px)] overflow-y-auto bg-slate-900/50 p-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Sparkles className="mb-4 h-12 w-12 text-indigo-400" />
            <h3 className="mb-2 text-xl text-indigo-200">How can I help you today?</h3>
            <p className="max-w-xs text-sm text-slate-400">
              Ask me anything and I&apos;ll do my best to assist you!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, index) => (
              <div key={index} className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl p-3 ${
                    msg.isUser
                      ? 'rounded-tr-none bg-indigo-600 text-white'
                      : 'rounded-tl-none border border-slate-600/50 bg-slate-700/60 text-slate-100'
                  } animate-fade-in`}>
                  <p className="text-sm">{msg.text}</p>
                </div>
              </div>
            ))}
            {isTyping ? (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl rounded-tl-none border border-slate-600/50 bg-slate-700/60 p-3 text-slate-100">
                  <div className="flex items-center space-x-2">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-indigo-400" />
                    <div className="h-2 w-2 animate-pulse rounded-full bg-indigo-400 delay-75" />
                    <div className="h-2 w-2 animate-pulse rounded-full bg-indigo-400 delay-150" />
                  </div>
                </div>
              </div>
            ) : null}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input form */}
      <form
        onSubmit={handleSubmit}
        className={`border-t p-4 ${isFocused ? 'border-indigo-500/70 bg-slate-800/80' : 'border-slate-700/50 bg-slate-800/30'} transition-colors duration-200`}>
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Type your message..."
            className="w-full rounded-full border border-slate-600/50 bg-slate-700/50 py-3 pr-12 pl-4 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/70 focus:outline-none"
          />
          <button
            type="submit"
            disabled={input.trim() === ''}
            className={`absolute right-1 rounded-full p-2 ${
              input.trim() === ''
                ? 'cursor-not-allowed bg-slate-700/50 text-slate-500'
                : 'bg-indigo-600 text-white hover:bg-indigo-500'
            } transition-colors`}>
            {isTyping ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </div>
      </form>

      <style>
        {`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
        
        .delay-75 {
          animation-delay: 0.2s;
        }
        
        .delay-150 {
          animation-delay: 0.4s;
        }
        `}
      </style>
    </div>
  );
}

export default AIMessageBar;
