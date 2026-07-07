import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, User } from 'lucide-react';
import { processAICommand } from '../services/apiServices';

export default function SidebarChat({ contextData }) {
  const [messages, setMessages] = useState([
    { id: 1, type: 'ai', text: 'Olá! Sou a IA do Embraps Geo. Monitoro postos, clima e trânsito. Como posso ajudar?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const contextRef = useRef(contextData);
  useEffect(() => {
    contextRef.current = contextData;
  }, [contextData]);

  // Alerta Automático a cada 2 horas (e um inicial em 15s para demonstração)
  useEffect(() => {
    const checkWeather = async () => {
      try {
        const aiResponse = await processAICommand(
          'Analise a previsão do tempo para as próximas 24h na Baixada Santista e faça um alerta rápido recomendando verificar os postos com comporta se houver chuva.', 
          contextRef.current
        );
        const msg = {
          id: Date.now(),
          type: 'ai',
          text: `⚠️ Alerta Automático (Clima 2h): ${aiResponse}`
        };
        setMessages(prev => [...prev, msg]);
      } catch(e) {
        console.error(e);
      }
    };

    const initialTimer = setTimeout(checkWeather, 15000); // Demo inicial
    const interval = setInterval(checkWeather, 7200000); // 2 horas

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, []);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = { id: Date.now(), type: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const aiResponse = await processAICommand(userMsg.text, contextData);
      setMessages(prev => [...prev, { id: Date.now()+1, type: 'ai', text: aiResponse }]);
    } catch (err) {
      setMessages(prev => [...prev, { id: Date.now()+1, type: 'ai', text: 'Erro ao processar comunicação com Gemini API.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sidebar glass-panel animate-fade-in" style={{ animationDelay: '0.2s' }}>
      <div className="sidebar-title">
        <Bot size={24} color="var(--primary-blue)" /> IA Embraps
      </div>

      <div className="chat-window">
        {messages.map(msg => (
          <div key={msg.id} className={`chat-message ${msg.type}`}>
            {msg.type === 'ai' && <Bot size={16} style={{ flexShrink: 0, marginTop: '2px' }} />}
            <span>{msg.text}</span>
          </div>
        ))}
        {loading && (
          <div className="chat-message ai">
            Digitando...
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <form className="chat-input-container" onSubmit={handleSend}>
        <input 
          type="text" 
          placeholder="Ex: Cruzamento de trânsito..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
        />
        <button type="submit" disabled={loading}>
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
