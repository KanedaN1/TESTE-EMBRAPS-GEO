import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, User } from 'lucide-react';
import { processAICommand } from '../services/apiServices';

export default function SidebarChat({ contextData }) {
  const [messages, setMessages] = useState([
    { id: 1, type: 'ai', text: 'Olá! Sou o Analista operacional IA. Monitoro postos, clima e trânsito. Como posso ajudar?' }
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

  // Automações da IA
  useEffect(() => {
    // 1. Alerta Automático a cada 2 horas (Clima amanhã / Mudanças)
    const checkWeatherInterval = async () => {
      try {
        const aiResponse = await processAICommand('Analise a previsão do tempo para amanhã e hoje. Informe mudanças rápidas ou tempestades. Indique também de forma breve quais regiões da baixada santista seriam mais afetadas.', contextRef.current);
        setMessages(prev => [...prev, { id: Date.now(), type: 'ai', text: `🌤️ Atualização de Clima (2h):\n${aiResponse}` }]);
      } catch(e) { console.error(e); }
    };

    // 2. Alerta Automático a cada 3 horas (Trânsito TomTom)
    const checkTrafficInterval = async () => {
      try {
        const aiResponse = await processAICommand('Verifique os incidentes de trânsito atuais e informe se há engarrafamentos ou trânsito alto na cidade.', contextRef.current);
        setMessages(prev => [...prev, { id: Date.now(), type: 'ai', text: `🚗 Atualização de Trânsito (3h):\n${aiResponse}` }]);
      } catch(e) { console.error(e); }
    };

    const wTimer = setInterval(checkWeatherInterval, 7200000); // 2 horas
    const tTimer = setInterval(checkTrafficInterval, 10800000); // 3 horas

    return () => {
      clearInterval(wTimer);
      clearInterval(tTimer);
    };
  }, []);

  // 3. Sensor de Chuva em Tempo Real (Dispara quando pluviômetro > 0)
  const prevRainRef = useRef(0);
  useEffect(() => {
    if (contextData?.pluviometer > 0 && prevRainRef.current === 0) {
      const triggerRainAlert = async () => {
        try {
          const aiResponse = await processAICommand('O sensor pluviométrico acabou de identificar chuva. Informe o clima e alerte os postos específicos que possuem comporta para terem atenção.', contextRef.current);
          setMessages(prev => [...prev, { id: Date.now(), type: 'ai', text: `🌧️ ALERTA DE CHUVA:\n${aiResponse}` }]);
        } catch(e) { console.error(e); }
      };
      triggerRainAlert();
    }
    if (contextData?.pluviometer !== undefined) {
      prevRainRef.current = contextData.pluviometer;
    }
  }, [contextData?.pluviometer]);

  // 4. Acionamento do Botão de Rota Inteligente
  const prevRouteRef = useRef(false);
  useEffect(() => {
    if (contextData?.routeActive && !prevRouteRef.current) {
      const triggerRouteAlert = async () => {
        try {
          const delay = contextData.routeSummary?.trafficDelayInSeconds || 0;
          let extraInfo = delay > 0 ? `A rota tem um atraso estimado de ${Math.round(delay/60)} minutos devido ao trânsito.` : 'A rota parece fluir bem, sem grandes atrasos.';
          const aiResponse = await processAICommand(`Uma Rota Inteligente com partida da Embraps acabou de ser acionada para os postos do supervisor selecionado. ${extraInfo} Sugira se o supervisor deve ter atenção a engarrafamentos ou postos problemáticos no caminho.`, contextRef.current);
          setMessages(prev => [...prev, { id: Date.now(), type: 'ai', text: `📍 ROTA ACIONADA:\n${aiResponse}` }]);
        } catch(e) { console.error(e); }
      };
      triggerRouteAlert();
    }
    if (contextData?.routeActive !== undefined) {
      prevRouteRef.current = contextData.routeActive;
    }
  }, [contextData?.routeActive, contextData?.routeSummary]);

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
        <Bot size={24} color="var(--primary-blue)" /> Analista operacional IA
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
