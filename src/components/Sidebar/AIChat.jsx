import React, { useState, useEffect } from 'react';
import './AIChat.css';
import { Bot, Send } from 'lucide-react';
import { sendGeminiPrompt } from '../../services/geminiApi';

export const AIChat = ({ contextData }) => {
  const [messages, setMessages] = useState([
    { id: 1, type: 'ai', text: 'Olá! Sou o assistente Embraps Geo. Como posso ajudar na análise hoje?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Proactive weather check loop (every 4 hours, mocked as 4 minutes for test or just one-off)
  useEffect(() => {
    const checkWeather = () => {
      const { weather } = contextData;
      if (weather && weather.dailyForecast && weather.dailyForecast.length > 1) {
        // Just simulating the AI proactively checking tomorrow's weather
        const tomorrowCode = weather.dailyForecast[1]; 
        const isBadWeather = [65, 82, 95, 96, 99].includes(tomorrowCode);
        
        if (isBadWeather) {
          setMessages(prev => [...prev, {
            id: Date.now(),
            type: 'system',
            text: '⚠️ Alerta Climático Proativo: Previsão de chuvas fortes/tempestade para amanhã na Baixada Santista. Verifique os postos com comporta!'
          }]);
        }
      }
    };

    // Run once after 5 seconds to simulate the cron
    const timer = setTimeout(checkWeather, 5000);
    
    // In a real app: setInterval(checkWeather, 4 * 60 * 60 * 1000);
    return () => clearTimeout(timer);
  }, [contextData.weather]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { id: Date.now(), type: 'user', text: userMsg }]);
    setLoading(true);

    const aiResponse = await sendGeminiPrompt(userMsg, contextData);
    
    setMessages(prev => [...prev, { id: Date.now() + 1, type: 'ai', text: aiResponse }]);
    setLoading(false);
  };

  return (
    <div className="sidebar-chat">
      <div className="chat-header">
        <Bot size={20} /> IA Embraps Geo
      </div>
      
      <div className="chat-messages">
        {messages.map(msg => (
          <div key={msg.id} className={`message ${msg.type}`}>
            {msg.text}
          </div>
        ))}
        {loading && <div className="message ai">Analisando dados...</div>}
      </div>

      <div className="chat-input-container">
        <input
          type="text"
          className="input-field"
          placeholder="Ex: Cruzamento de Trânsito"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && handleSend()}
          disabled={loading}
        />
        <button className="btn" onClick={handleSend} disabled={loading}>
          <Send size={16} />
        </button>
      </div>
    </div>
  );
};
