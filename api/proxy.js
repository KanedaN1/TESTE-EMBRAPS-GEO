// api/proxy.js
// Vercel Serverless Function to bypass CORS for Contele API

module.exports = async (req, res) => {
    // Pegar o endpoint que queremos acessar no Contele pela query string (ex: ?endpoint=/pois)
    const { endpoint } = req.query;

    if (!endpoint) {
        return res.status(400).json({ error: 'Endpoint is required' });
    }

    // A URL base da API do Contele
    const API_BASE = 'https://integration.contelege.com.br/v2';
    const targetUrl = `${API_BASE}${endpoint}`;

    // Pegar os cabeçalhos de autenticação que o nosso frontend enviou
    const authHeader = req.headers['authorization'];
    const apiKeyHeader = req.headers['x-api-key'];

    if (!authHeader || !apiKeyHeader) {
        return res.status(401).json({ error: 'Missing authentication headers' });
    }

    try {
        // Fazer a requisição para o servidor do Contele (Backend para Backend, sem bloqueio CORS)
        const response = await fetch(targetUrl, {
            method: 'GET',
            headers: {
                'Authorization': authHeader,
                'x-api-key': apiKeyHeader,
                'Content-Type': 'application/json'
            }
        });

        // Repassar os dados recebidos para o nosso painel
        const data = await response.json();
        
        // Retornar Status OK com os dados, permitindo CORS apenas para a nossa página
        res.status(response.status).json(data);

    } catch (error) {
        console.error('Proxy Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
