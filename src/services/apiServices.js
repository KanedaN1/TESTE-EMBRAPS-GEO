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
    console.error('Erro ao buscar Contele Places API:', error);
    return null;
  }
};

// Busca usuários (supervisores) reais na API do Contele
export const fetchConteleUsers = async () => {
  try {
    const response = await axios.get('/api-contele/users?perPage=500', {
      headers: { 
        Authorization: conteleToken,
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
    console.error('Erro ao buscar Contele Users API:', error);
    return null;
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

    const response = await axios.post(
      `/api-gemini/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
      {
        contents: [{ parts: [{ text: prompt }] }]
      }
    );
    
    return response.data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Erro na IA:', error);
    return 'Desculpe, ocorreu um erro ao processar o comando via IA (Falha de Comunicação ou CORS).';
  }
};
