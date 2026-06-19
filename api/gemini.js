// api/gemini.js
// Vercel Serverless Function to securely connect to Gemini API

module.exports = async (req, res) => {
    // Permitir apenas requisições POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // A chave de API agora vem das variáveis de ambiente secretas da Vercel
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ 
            error: 'GEMINI_API_KEY is not configured in Vercel Environment Variables.' 
        });
    }

    try {
        const payload = req.body; // Pega o payload enviado pelo frontend

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const err = await response.json();
            return res.status(response.status).json({ error: err.error?.message || 'Erro do Gemini' });
        }

        const data = await response.json();
        res.status(200).json(data);

    } catch (error) {
        console.error('Gemini Proxy Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
