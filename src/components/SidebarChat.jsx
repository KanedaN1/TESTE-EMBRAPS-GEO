import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, User, Volume2, VolumeX } from 'lucide-react';
import { processAICommand } from '../services/apiServices';

export default function SidebarChat({ contextData }) {
  const [messages, setMessages] = useState([
    { id: 1, type: 'ai', text: 'Olá! Sou o Analista operacional IA. Monitoro postos, clima e trânsito na Baixada Santista. Como posso ajudar?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const chatEndRef = useRef(null);

  const isMutedRef = useRef(isMuted);
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  const audioRef = useRef(null);
  const audioTimerRef = useRef(null);

  // Função para tocar o som de radar (bloop) por até 13 segundos
  const playRadarSound = () => {
    if (isMutedRef.current) return;

    if (audioTimerRef.current) {
      clearTimeout(audioTimerRef.current);
      audioTimerRef.current = null;
    }

    try {
      if (!audioRef.current) {
        audioRef.current = new Audio('/radar.mp3');
      }
      const audio = audioRef.current;
      audio.currentTime = 0;

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          // Limita a reprodução a 13 segundos exatamente
          audioTimerRef.current = setTimeout(() => {
            audio.pause();
            audio.currentTime = 0;
          }, 13000);
        }).catch(() => {
          // Fallback para som sintetizado se radar.mp3 ainda não foi colocado na pasta public
          playSynthRadarBloop();
        });
      }
    } catch (e) {
      playSynthRadarBloop();
    }
  };

  // Som sintetizado de radar (bloop) via Web Audio API caso o arquivo MP3 não exista
  const playSynthRadarBloop = () => {
    if (isMutedRef.current) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      let bloopCount = 0;
      const intervalId = setInterval(() => {
        if (bloopCount >= 6 || isMutedRef.current) {
          clearInterval(intervalId);
          try { ctx.close(); } catch(e){}
          return;
        }
        bloopCount++;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      }, 2000);

      audioTimerRef.current = setTimeout(() => {
        clearInterval(intervalId);
        try { ctx.close(); } catch(e){}
      }, 13000);
    } catch (e) {}
  };

  const checkAndTriggerSound = (text) => {
    if (!text) return;
    const lower = text.toLowerCase();
    if (lower.includes('comporta') || lower.includes('alerta de chuva') || lower.includes('chuva')) {
      playRadarSound();
    }
  };

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
        const aiResponse = await processAICommand('Analise a previsão do tempo para amanhã e hoje na Baixada Santista. Informe mudanças rápidas ou tempestades. Indique as cidades/regiões afetadas. Se houver previsão de chuva forte, liste OBRIGATORIAMENTE os postos com comporta agrupando por cidade/bairro para alertá-los antecipadamente.', contextRef.current);
        setMessages(prev => [...prev, { id: Date.now(), type: 'ai', text: `🌤️ Atualização de Clima (2h):\n${aiResponse}` }]);
        checkAndTriggerSound(aiResponse);
      } catch(e) { console.error(e); }
    };

    // 2. Alerta Automático a cada 3 horas (Trânsito TomTom)
    const checkTrafficInterval = async () => {
      try {
        const aiResponse = await processAICommand('Verifique os incidentes de trânsito atuais e informe se há engarrafamentos ou trânsito alto nas cidades da Baixada Santista.', contextRef.current);
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
          const aiResponse = await processAICommand('O sensor pluviométrico acabou de identificar chuva na Baixada Santista. Informe o clima atual e faça uma listagem visual e ordenada (com bullet points) por cidade/bairro de TODOS os postos que possuem comporta para alertá-los imediatamente.', contextRef.current);
          setMessages(prev => [...prev, { id: Date.now(), type: 'ai', text: `🌧️ ALERTA DE CHUVA NA BAIXADA SANTISTA:\n${aiResponse}` }]);
          playRadarSound();
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

  // 5. Acionamento do Botão de Mapa de Calor
  const prevHeatmapRef = useRef(false);
  useEffect(() => {
    if (contextData?.heatmapActive && !prevHeatmapRef.current) {
      const triggerHeatmapAlert = async () => {
        try {
          const postosAlerta = (contextData.postos || []).filter(p => p.status === 'Alerta');
          const bairrosCount = {};
          postosAlerta.forEach(p => {
            const bairro = p.bairro || 'Desconhecido';
            bairrosCount[bairro] = (bairrosCount[bairro] || 0) + 1;
          });
          
          let bairroMaisCritico = 'Nenhum';
          let maxCount = 0;
          for (const [bairro, count] of Object.entries(bairrosCount)) {
            if (count > maxCount) {
              maxCount = count;
              bairroMaisCritico = bairro;
            }
          }
          
          const msg = `O mapa de calor acaba de ser ativado. Analise e informe que o bairro com maior concentração de postos em alerta é "${bairroMaisCritico}" com ${maxCount} posto(s) afetado(s). Dê dicas breves sobre ações para o supervisor dessa região.`;
          const aiResponse = await processAICommand(msg, contextRef.current);
          setMessages(prev => [...prev, { id: Date.now(), type: 'ai', text: `🔥 ANÁLISE DE CALOR:\n${aiResponse}` }]);
        } catch(e) { console.error(e); }
      };
      triggerHeatmapAlert();
    }
    if (contextData?.heatmapActive !== undefined) {
      prevHeatmapRef.current = contextData.heatmapActive;
    }
  }, [contextData?.heatmapActive, contextData?.postos]);

  const handleSend = async (e, customInput = null) => {
    if (e) e.preventDefault();
    const textToSend = customInput || input;
    if (!textToSend.trim()) return;

    const userMsg = { id: Date.now(), type: 'user', text: textToSend };
    setMessages(prev => [...prev, userMsg]);
    if (!customInput) setInput('');
    setLoading(true);

    try {
      const aiResponse = await processAICommand(userMsg.text, contextData);
      setMessages(prev => [...prev, { id: Date.now()+1, type: 'ai', text: aiResponse }]);
      checkAndTriggerSound(aiResponse);
    } catch (err) {
      setMessages(prev => [...prev, { id: Date.now()+1, type: 'ai', text: 'Erro ao processar comunicação com Gemini API.' }]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    "Como esta o clima na Baixada Santista?",
    "Quais postos tem comporta por cidade?",
    "Resumo de alertas de hoje",
    "Onde o trânsito está pior?"
  ];

  return (
    <div className="sidebar glass-panel animate-fade-in" style={{ animationDelay: '0.2s' }}>
      <div className="sidebar-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bot size={24} color="var(--primary-blue)" /> Analista operacional IA
        </div>
        <button
          type="button"
          onClick={() => setIsMuted(!isMuted)}
          title={isMuted ? "Som Mudo (clique para ativar som de radar)" : "Som Ativo (clique para silenciar)"}
          style={{
            background: isMuted ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
            border: `1px solid ${isMuted ? 'var(--danger)' : 'var(--success)'}`,
            color: isMuted ? 'var(--danger)' : 'var(--success)',
            borderRadius: '20px',
            padding: '4px 10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '0.78rem',
            fontWeight: '600',
            transition: 'all 0.2s ease'
          }}
        >
          {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          <span>{isMuted ? 'Mudo' : 'Som On'}</span>
        </button>
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

      <div className="chat-suggestions">
        {suggestions.map((sug, idx) => (
          <button 
            key={idx} 
            className="chat-suggestion-chip" 
            onClick={() => handleSend(null, sug)}
            disabled={loading}
          >
            {sug}
          </button>
        ))}
      </div>

      <form className="chat-input-container" onSubmit={(e) => handleSend(e)}>
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
