import axios from 'axios';

const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;
const conteleToken = import.meta.env.VITE_CONTELE_TOKEN;

// Busca postos reais na API do Contele
export const fetchContelePlaces = async () => {
  try {
    const response = await axios.get('/api-contele/v1/places', {
      headers: { Authorization: conteleToken }
    });
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar Contele Places API:', error);
    return null;
  }
};

// Busca usuários (supervisores) reais na API do Contele
export const fetchConteleUsers = async () => {
  try {
    const response = await axios.get('/api-contele/v1/users', {
      headers: { Authorization: conteleToken }
    });
    return response.data;
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
