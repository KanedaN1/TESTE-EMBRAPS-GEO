import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_KEY || '');

export const sendGeminiPrompt = async (prompt, contextData) => {
  if (!GEMINI_KEY) {
    return "Erro: Chave da API do Gemini não configurada.";
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const systemPrompt = `Você é o assistente virtual do Embraps Geo, um dashboard geoespacial da Baixada Santista.
Sua função é ajudar os supervisores analisando os dados operacionais, clima e trânsito.
Responda de forma clara e objetiva, focando na utilidade operacional.

DADOS DE CONTEXTO ATUAIS:
${JSON.stringify(contextData, null, 2)}

Seja prestativo e use os dados de contexto para responder as perguntas do usuário.`;

    const result = await model.generateContent([
      systemPrompt,
      `Usuário: ${prompt}`
    ]);

    return result.response.text();
  } catch (error) {
    console.error("Erro na integração com Gemini", error);
    return `Erro da IA: ${error.message || 'Falha ao processar solicitação.'}`;
  }
};
