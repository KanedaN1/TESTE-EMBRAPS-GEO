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
    const response = await axios.get(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=precipitation,rain&timezone=America%2FSao_Paulo`);
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar clima:', error);
    return null;
  }
};

export const processAICommand = async (command, contextData) => {
  try {
    const prompt = `Você é um assistente de IA focado no dashboard geoespacial "Embraps Geo".
Os dados atuais do sistema são:
${JSON.stringify(contextData).substring(0, 1500)} // Truncado para limite

O usuário pediu o seguinte: "${command}"
Responda de forma clara, profissional, focada em segurança e operação. Máx 3 parágrafos.`;

    // Chamada usando o proxy do Vite para evitar problemas de CORS
    const response = await fetch(
      `/api-gemini/v1beta/models/gemini-flash-latest:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );
    
    if (!response.ok) {
      throw new Error(`Erro na API Gemini: ${response.status}`);
    }
    
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Erro na IA:', error);
    return 'Desculpe, ocorreu um erro ao processar o comando via IA (Falha de Comunicação ou CORS).';
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
      const routePoints = response.data.routes[0].legs.flatMap(leg => leg.points.map(p => [p.latitude, p.longitude]));
      return routePoints;
    }
    return null;
  } catch (error) {
    console.error('Erro ao calcular rota no TomTom:', error);
    return null;
  }
};
