// conteleService.js
// Serviço de Sincronização em Tempo Real com a API do Contele Equipes

class ConteleService {
    static API_BASE = 'https://integration.contelege.com.br/v2';
    static DEFAULT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjbGllbnRJZCI6IjZmYWIzMThlLWE3NTgtNDU1MC05NGEwLTIxMWVmM2Q0YWMwMCIsImNyZWF0ZWRBdCI6IjIwMjYtMDYtMTlUMTc6MTU6MDguNDQ2WiIsImlkIjoiZmEyZDZlMjEtMTdiZS00NTE3LTgyYTktMmE5NWJjN2QyZTMxIiwiaXNzIjoiY29udGVsZS1nZS1hcGkiLCJ1c2VySWQiOiI1MDE3YzdiZC1hMmI5LTRjYTUtYjA4ZS02MjE4NjIyZjRiZTkiLCJjb250ZXh0IjoiY2dlIiwic2NvcGVzIjpbInYwOnJlZnVuZHM6d3JpdGUiLCJ2MDp0YXNrczpzY2hlZHVsZSIsInYwOnRhc2tzOnJlc2NoZWR1bGUiLCJ2MDp0YXNrczphbGxvd0ZhckNoZWNraW4iLCJ2MDp0YXNrczphbGxvd0ZhckNoZWNrb3V0IiwidjA6dGFza3M6YWxsb3dDbGllbnRUcmFuc2ZlckZyb21TdG9jayIsInYwOmZvcm1zOmdsb2JhbEhpc3RvcnkiLCJ2MDp0YWdnaW5nOmNyZWF0ZSIsInYwOnRhZ2dpbmc6ZGVsZXRlIiwidjA6dGFnZ2luZzpyZWFkIiwidjA6dGFnOnJlYWQiXSwidXNlclR5cGUiOiJhZG1pbiIsImlhdCI6MTc4MTg4OTMwOH0.VAAsl8WWhUmfAx5vgunY4QBH8347Ptg8JjDGcFTaf-Q';
    static DEFAULT_KEY = 'B9e7U8hqVw6oMrVHYrbVk5PbSfZnv3Pv8cw4hDg5';

    // Recupera credenciais (usa do localStorage se existir, senão usa padrão)
    static getCredentials() {
        return {
            token: localStorage.getItem('contele_token') || this.DEFAULT_TOKEN,
            apiKey: localStorage.getItem('contele_api_key') || this.DEFAULT_KEY
        };
    }

    // Faz a chamada HTTP genérica com Timeout
    static async fetchAPI(endpoint) {
        const creds = this.getCredentials();
        const headers = {
            'Authorization': `Bearer ${creds.token}`,
            'x-api-key': creds.apiKey,
            'Content-Type': 'application/json'
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 segundos de timeout para garantir que consultas maiores não caiam

        try {
            // Agora chamamos o NOSSO servidor na Vercel, e ele repassa para o Contele
            const proxyUrl = `/api/proxy?endpoint=${encodeURIComponent(endpoint)}`;
            const response = await fetch(proxyUrl, { 
                headers,
                signal: controller.signal 
            });
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                console.error(`Contele API Error (${endpoint}):`, response.statusText);
                return null;
            }
            return await response.json();
        } catch (error) {
            clearTimeout(timeoutId);
            console.warn(`Contele API Connection Error or Timeout (${endpoint}):`, error);
            return null;
        }
    }

    // Buscar Usuários (Supervisores)
    static async getSupervisores() {
        const data = await this.fetchAPI('/users?perPage=500');
        if (!data) return [];
        
        let usersList = [];
        if (Array.isArray(data)) usersList = data;
        else if (data.data) usersList = data.data;
        else if (data.users) usersList = data.users;

        return usersList.map((u, index) => {
            // Distribuir cores dinamicamente
            const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e'];
            const cor = colors[index % colors.length];

            return {
                id: String(u.id || u.customId || u.userId || u.name),
                nome: u.name || u.firstName || 'Supervisor Sem Nome',
                // O Contele não tem "turno", vamos assumir diurno por padrão ou tentar inferir.
                turno: 'diurno', 
                cor: cor
            };
        });
    }

    // Buscar Locais (Postos)
    static async getPosts() {
        // Pega até 1000 locais para cobrir a maioria dos casos
        const data = await this.fetchAPI('/pois?perPage=1000');
        if (!data) return [];

        let poisList = [];
        if (Array.isArray(data)) poisList = data;
        else if (data.data) poisList = data.data;
        else if (data.pois) poisList = data.pois;

        return poisList
            .filter(p => p.status !== 'deleted' && p.status !== 'inactive') // Remove postos antigos/excluídos
            .filter(p => (p.lat && p.lng) || (p.address && p.address.location && p.address.location.latitude)) // Só locais posicionados
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
    }

    // Buscar Tarefas (Visitas)
    static async getTasks() {
        // Buscar tarefas de hoje
        const hoje = new Date().toISOString().split('T')[0];
        const data = await this.fetchAPI(`/tasks?initialDate=${hoje}&finalDate=${hoje}&perPage=500`);
        if (!data) return [];

        let tasksList = [];
        if (Array.isArray(data)) tasksList = data;
        else if (data.data) tasksList = data.data;
        else if (data.tasks) tasksList = data.tasks;

        return tasksList;
    }
}

window.ConteleService = ConteleService;
