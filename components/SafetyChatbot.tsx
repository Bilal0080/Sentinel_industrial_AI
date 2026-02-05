
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";

const SafetyChatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([
    { role: 'model', text: 'Safety Command initialized. How can I help you optimize plant safety or address workforce health issues today?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatSessionRef = useRef<Chat | null>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initChat = () => {
    if (!chatSessionRef.current) {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      chatSessionRef.current = ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: {
          systemInstruction: `You are the Sentinel Industrial Safety Command AI. You are a specialist in Industrial safety and Occupational Dietetics.
          
          CORE EXPERTISE: THERMAL-METABOLIC SYNERGY
          - Explain why eating oily/heavy food (like Biryani or Beef) is dangerous in high ambient temperatures (>35°C). 
          - Keywords: Specific Dynamic Action (SDA), Metabolic Heat, Vasodilation, Dehydration, Core Body Temp.
          - Advice: Suggest light, water-rich foods (yogurt, salads, cucumber) and electrolytic hydration during heatwaves.
          
          MASS CATERING (4000+ EMPLOYEES):
          - Advice on volumetric oil pumps and industrial skimming.
          
          Keep responses concise, scientific yet practical, and authoritative.`,
        },
      });
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsTyping(true);

    try {
      initChat();
      const response = await chatSessionRef.current!.sendMessageStream({ message: userMessage });
      
      let fullText = '';
      setMessages(prev => [...prev, { role: 'model', text: '' }]);
      
      for await (const chunk of response) {
        const c = chunk as GenerateContentResponse;
        fullText += c.text;
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1].text = fullText;
          return newMessages;
        });
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'model', text: "Connection to Safety Command interrupted. Please try again." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const suggestions = [
    "Why is spice bad in heat?",
    "Lunch for 4000+ at 40°C",
    "Prevent heat stroke via diet",
    "Electrolyte protocols"
  ];

  return (
    <div className="fixed bottom-6 right-6 z-[100] font-sans">
      {/* Floating Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          initChat();
        }}
        className={`w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 active:scale-95 ${
          isOpen ? 'bg-slate-900 rotate-90' : 'bg-amber-500 hover:bg-amber-400 animate-bounce-subtle'
        }`}
      >
        {isOpen ? (
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <div className="relative">
             <span className="text-3xl">🤖</span>
             <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 border-2 border-white rounded-full animate-ping"></span>
          </div>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="absolute bottom-20 right-0 w-[380px] h-[550px] bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">
          {/* Header */}
          <div className="bg-slate-900 p-6 text-white flex items-center gap-4">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-2xl">🤖</div>
            <div>
              <h3 className="font-black tracking-tight text-sm uppercase italic">Safety Command</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span> Online
              </p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                  m.role === 'user' 
                    ? 'bg-amber-500 text-slate-900 font-bold rounded-tr-none' 
                    : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none'
                }`}>
                  {m.text || (isTyping && i === messages.length - 1 ? '...' : '')}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Suggestions */}
          {messages.length < 3 && (
            <div className="px-6 py-2 flex flex-wrap gap-2">
              {suggestions.map(s => (
                <button
                  key={s}
                  onClick={() => { setInput(s); setTimeout(() => handleSend(), 0); }}
                  className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-full hover:bg-slate-50 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-100">
            <div className="relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about thermal dietetics..."
                className="w-full pl-6 pr-14 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all shadow-inner"
              />
              <button
                type="submit"
                disabled={isTyping || !input.trim()}
                className="absolute right-2 w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center hover:bg-slate-800 disabled:opacity-50 transition-all active:scale-90 shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 3s ease-in-out infinite;
        }
      `}} />
    </div>
  );
};

export default SafetyChatbot;
