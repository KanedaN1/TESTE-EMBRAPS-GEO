import axios from 'axios';

const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;
const conteleToken = import.meta.env.VITE_CONTELE_TOKEN;
const conteleApiKey = import.meta.env.VITE_CONTELE_API_KEY;

// Busca postos reais na API do Contele
export const fetchContelePlaces = async () => {
  try {
    const response = await axios.get('/api-contele/pois?perPage=1000', {
      headers: { 
        Authorization: conteleToken,
        'auth-token': conteleToken ? conteleToken.replace('Bearer ', '') : '',
        'x-api-key': conteleApiKey
      }
    });
    
    let data = response.data;
    let poisList = [];
    if (Array.isArray(data)) poisList = data;
    else if (data.data) poisList = data.data;
    else if (data.pois) poisList = data.pois;

    return poisList
      .filter(p => p.status !== 'deleted' && p.status !== 'inactive')
      .filter(p => (p.lat && p.lng) || (p.address && p.address.location && p.address.location.latitude))
      .map(p => {
        const latitude = p.lat || (p.address && p.address.location ? p.address.location.latitude : 0);
        const longitude = p.lng || (p.address && p.address.location ? p.address.location.longitude : 0);
        const bairroStr = (p.address && p.address.neighborhood) ? p.address.neighborhood : (p.neighborhood || p.district || p.city || 'Desconhecido');
        
        return {
          id: String(p.id || p.customId),
          nome: p.name || p.corporateName || p.fantasyName || 'Posto Sem Nome',
          bairro: bairroStr,
          lat: parseFloat(latitude),
          lng: parseFloat(longitude),
          isDayOnly: false,
          isNightOnly: false,
          hasComporta: false,
          daySupervisorId: null,
          nightSupervisorId: null,
          source: 'contele'
        };
      });
  } catch (error) {
    console.warn('Aviso: Erro ao buscar Contele Places API. Verifique credenciais no .env. Usando mockData fallback.', error);
    return [];
  }
};

// Busca usuários (supervisores) reais na API do Contele
export const fetchConteleUsers = async () => {
  try {
    const response = await axios.get('/api-contele/users?perPage=500', {
      headers: { 
        Authorization: conteleToken,
        'auth-token': conteleToken ? conteleToken.replace('Bearer ', '') : '',
        'x-api-key': conteleApiKey
      }
    });

    let data = response.data;
    let usersList = [];
    if (Array.isArray(data)) usersList = data;
    else if (data.data) usersList = data.data;
    else if (data.users) usersList = data.users;

    return usersList.map((u, index) => {
      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e'];
      const cor = colors[index % colors.length];

      return {
        id: String(u.id || u.customId || u.userId || u.name),
        nome: u.name || u.firstName || 'Supervisor Sem Nome',
        turno: 'diurno', 
        cor: cor
      };
    });
  } catch (error) {
    console.warn('Aviso: Erro ao buscar Contele Users API. Verifique credenciais no .env. Usando mockData fallback.', error);
    return [];
  }
};

export const fetchWeather = async (lat = -23.9608, lng = -46.3336) => {
  try {
    const response = await axios.get(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=precipitation,rain&daily=weather_code,precipitation_probability_max,precipitation_sum&timezone=America%2FSao_Paulo`);
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar clima:', error);
    return null;
  }
};

export const processAICommand = async (command, contextData) => {
  try {
    const { kpis, postos, currentMonth, pluviometer, weatherForecast, trafficData, supervisoresAtivos } = contextData;
    
    // Preparar resumo para economizar tokens
    const postosAlerta = postos ? postos.filter(p => p.status === 'Alerta' || p.status === 'Clima').map(p => ({ nome: p.nome, supervisor: p.supervisorDiurno, status: p.status })) : [];
    const postosComporta = postos ? postos.filter(p => p.comporta).map(p => ({ nome: p.nome, supervisor: p.supervisorDiurno })) : [];
    
    const compactContext = {
      mes: currentMonth,
      clima: {
        chuva_agora_mm: pluviometer,
        previsao_amanha: weatherForecast ? {
          probabilidade_chuva: weatherForecast.daily?.precipitation_probability_max?.[1],
          volume_chuva_mm: weatherForecast.daily?.precipitation_sum?.[1]
        } : null
      },
      transito: trafficData || "Sem incidentes relatados no momento.",
      gestao: {
        total_postos: kpis?.totalPostos || 0,
        supervisores_ativos: supervisoresAtivos || [],
        postos_em_alerta_ou_clima: postosAlerta,
        postos_com_comporta: postosComporta
      }
    };

    const prompt = `Você é o Analista operacional IA da Embraps Geo, um dashboard geoespacial focado em gestão de equipes, clima e trânsito na Baixada Santista.
Sua missão é dar respostas curtas, precisas e em português do Brasil, focadas em segurança, operação e logística.
Não liste todos os postos de uma vez, seja conciso.

CONTEXTO ATUAL DO SISTEMA:
${JSON.stringify(compactContext)}

O usuário pediu ou o sistema disparou o seguinte alerta/comando:
"${command}"

INSTRUÇÕES DE COMPORTAMENTO:
- REGRA DE OURO: SE A LISTA DE "postos_com_comporta" OU "postos_em_alerta" ESTIVER VAZIA, NÃO CITE NENHUM NOME. Fale apenas dos nomes exatos que aparecem no JSON.
- SEJA EXTREMAMENTE BREVE E OBJETIVO. Não crie frases longas.
- Formate a resposta usando OBRIGATORIAMENTE quebras de linha DUPLAS entre os tópicos para garantir o visual no chat.
- O formato deve seguir os tópicos que tiverem informações relevantes:

🚦 **Trânsito:** [Situação resumida]

⚠️ **Atenção:** [Apenas postos em alerta se existirem]

🌧️ **Clima:** [Situação do clima]

🛡️ **Comportas:** [Se houver previsão de chuva ou alerta de chuva, liste OBRIGATORIAMENTE de forma ordenada, visual e com bullets todos os postos com comporta e seus supervisores]
`;

    // Chamada usando o proxy do Vite para evitar problemas de CORS
    const response = await fetch(
      `/api-gemini/v1beta/models/gemini-3-flash-preview:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      }
    );
    
    if (!response.ok) {
      const errText = await response.text();
      console.error('Detalhe do erro Gemini:', errText);
      throw new Error(`Erro API Gemini: ${response.status}`);
    }
    
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Erro na IA:', error);
    return 'Desculpe, ocorreu um erro ao processar o comando via IA.';
  }
};

// =======================
// TOMTOM API SERVICES
// =======================
const TOMTOM_API_KEY = 'xy4ApeHYbU4NZ11HyiiWkFxFHJuvWYsN';

// Busca latitude e longitude baseada no endereço
export const geocodeAddress = async (address) => {
  try {
    const response = await axios.get(`https://api.tomtom.com/search/2/geocode/${encodeURIComponent(address)}.json?key=${TOMTOM_API_KEY}&limit=1&countrySet=BR`);
    if (response.data && response.data.results && response.data.results.length > 0) {
      const position = response.data.results[0].position;
      return { lat: position.lat, lng: position.lon };
    }
    return null;
  } catch (error) {
    console.error('Erro ao buscar geolocalização no TomTom:', error);
    return null;
  }
};

// Calcula rota em tempo real otimizada (evitando trânsito) passando por múltiplos pontos
export const getTomTomRoute = async (points) => {
  // points é um array de {lat, lng}
  if (!points || points.length < 2) return null;
  
  const waypoints = points.map(p => `${p.lat},${p.lng}`).join(':');
  
  try {
    const response = await axios.get(`https://api.tomtom.com/routing/1/calculateRoute/${waypoints}/json?key=${TOMTOM_API_KEY}&routeType=fastest&traffic=true&travelMode=car`);
    if (response.data && response.data.routes && response.data.routes.length > 0) {
      const route = response.data.routes[0];
      const routePoints = route.legs.flatMap(leg => leg.points.map(p => [p.latitude, p.longitude]));
      const summary = route.summary; // travelTimeInSeconds, trafficDelayInSeconds
      return { routePoints, summary };
    }
    return null;
  } catch (error) {
    console.error('Erro ao calcular rota no TomTom:', error);
    return null;
  }
};

export const fetchTomTomIncidents = async () => {
  try {
    // Bounding box para a Baixada Santista aproximada
    const bbox = "-46.6,-24.1,-46.1,-23.8";
    const response = await axios.get(`https://api.tomtom.com/traffic/services/5/incidentDetails?key=${TOMTOM_API_KEY}&bbox=${bbox}&fields={incidents{type,geometry{type,coordinates},properties{iconCategory,magnitudeOfDelay,events{description,code}}}}`);
    
    if (response.data && response.data.incidents) {
      const incidents = response.data.incidents;
      if (incidents.length === 0) return "Sem incidentes graves detectados na Baixada Santista.";
      
      const severos = incidents.filter(i => i.properties.magnitudeOfDelay >= 2).slice(0, 5); // delay moderado/severo
      if (severos.length === 0) return "Trânsito fluindo normalmente, apenas ocorrências menores.";
      
      return severos.map(i => {
        const desc = i.properties.events[0]?.description || 'Incidente de trânsito';
        return `- ${desc} (Atraso de nível ${i.properties.magnitudeOfDelay})`;
      }).join('\n');
    }
    return "Não foi possível obter os dados de trânsito.";
  } catch (error) {
    console.error('Erro ao buscar incidentes no TomTom:', error);
    return "Erro ao comunicar com a API de trânsito.";
  }
};
