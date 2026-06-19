// Serviço de Abstração do Banco de Dados (db.js)
// Centraliza todas as chamadas de leitura e escrita de dados usando promessas.
// Se no futuro for conectado a um banco de dados real, apenas este arquivo precisa ser modificado.

class DatabaseService {
    // Simula atraso de rede (ex: 80ms) para garantir comportamento assíncrono realista
    static _delay(ms = 80) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Inicializa o banco de dados no LocalStorage se estiver vazio ou versão antiga
    static async init() {
        await this._delay(50);
        const version = localStorage.getItem('geo_santos_db_version');
        if (!localStorage.getItem('geo_santos_initialized') || version !== '3.1') {
            await this.resetToDefault();
        }
    }

    // Restaura os dados padrão do data.js
    static async resetToDefault() {
        await this._delay(100);
        localStorage.setItem('geo_santos_supervisores', JSON.stringify(window.DEFAULT_DATA.supervisores));
        localStorage.setItem('geo_santos_postos', JSON.stringify(window.DEFAULT_DATA.postos));
        localStorage.setItem('geo_santos_ocorrencias', JSON.stringify(window.DEFAULT_DATA.ocorrencias));
        localStorage.setItem('geo_santos_db_version', '3.1');
        localStorage.setItem('geo_santos_initialized', 'true');
    }

    // --- MÉTODOS DE SUPERVISORES ---
    static async getSupervisores() {
        await this._delay(40);
        const data = localStorage.getItem('geo_santos_supervisores');
        return data ? JSON.parse(data) : [];
    }

    static async getSupervisorById(id) {
        const supervisors = await this.getSupervisores();
        return supervisors.find(s => s.id === id) || null;
    }

    // --- MÉTODOS DE POSTOS ---
    static async getPosts() {
        await this._delay(60);
        const data = localStorage.getItem('geo_santos_postos');
        const posts = data ? JSON.parse(data) : [];
        // Retornar apenas postos ativos (não excluídos logicamente, ou podemos fazer exclusão física)
        return posts.filter(p => p.ativo !== false);
    }

    static async getPostById(id) {
        const posts = await this.getPosts();
        return posts.find(p => p.id === id) || null;
    }

    static async addPost(post) {
        await this._delay(100);
        const data = localStorage.getItem('geo_santos_postos');
        const posts = data ? JSON.parse(data) : [];
        
        // Gerar ID sequencial
        const ids = posts.map(p => parseInt(p.id.replace('P', ''))).filter(n => !isNaN(n));
        const maxId = ids.length > 0 ? Math.max(...ids) : 0;
        const newId = `P${maxId + 1}`;
        
        const newPost = {
            id: newId,
            nome: post.nome,
            lat: parseFloat(post.lat),
            lng: parseFloat(post.lng),
            bairro: post.bairro || 'Não especificado',
            daySupervisorId: post.daySupervisorId || null,
            nightSupervisorId: post.nightSupervisorId || null,
            isDayOnly: post.isDayOnly || false,
            isNightOnly: post.isNightOnly || false,
            hasComporta: post.hasComporta || false,
            ativo: true
        };

        posts.push(newPost);
        localStorage.setItem('geo_santos_postos', JSON.stringify(posts));
        return newPost;
    }

    static async updatePost(updatedPost) {
        await this._delay(100);
        const data = localStorage.getItem('geo_santos_postos');
        let posts = data ? JSON.parse(data) : [];
        
        posts = posts.map(p => p.id === updatedPost.id ? { ...p, ...updatedPost } : p);
        localStorage.setItem('geo_santos_postos', JSON.stringify(posts));
        return updatedPost;
    }

    static async deletePost(id) {
        await this._delay(100);
        const data = localStorage.getItem('geo_santos_postos');
        let posts = data ? JSON.parse(data) : [];
        
        // Exclusão física ou lógica (marcando como inativo)
        // Usaremos exclusão lógica para não quebrar referências históricas de ocorrências imediatamente
        posts = posts.map(p => p.id === id ? { ...p, ativo: false } : p);
        localStorage.setItem('geo_santos_postos', JSON.stringify(posts));
        return true;
    }

    // --- MÉTODOS DE OCORRÊNCIAS (ALERTAS) ---
    static async getIncidents() {
        await this._delay(50);
        const data = localStorage.getItem('geo_santos_ocorrencias');
        return data ? JSON.parse(data) : [];
    }

    static async addIncident(incident) {
        await this._delay(90);
        const data = localStorage.getItem('geo_santos_ocorrencias');
        const incidents = data ? JSON.parse(data) : [];

        // Gerar ID sequencial
        const ids = incidents.map(o => parseInt(o.id.replace('O', ''))).filter(n => !isNaN(n));
        const maxId = ids.length > 0 ? Math.max(...ids) : 0;
        const newId = `O${maxId + 1}`;

        const newIncident = {
            id: newId,
            postId: incident.postId,
            tipo: incident.tipo, // 'falta', 'demissao', 'os', 'observacao'
            colaborador: incident.colaborador || '',
            detalhes: incident.detalhes || '',
            supervisorId: incident.supervisorId || null,
            data: incident.data || new Date().toISOString().split('T')[0],
            status: 'pendente', // 'pendente', 'resolvido'
            severidade: incident.severidade || 'media' // 'alta', 'media', 'baixa'
        };

        incidents.unshift(newIncident); // Adiciona no início da lista (mais recentes primeiro)
        localStorage.setItem('geo_santos_ocorrencias', JSON.stringify(incidents));
        return newIncident;
    }

    static async resolveIncident(id) {
        await this._delay(80);
        const data = localStorage.getItem('geo_santos_ocorrencias');
        let incidents = data ? JSON.parse(data) : [];

        incidents = incidents.map(o => o.id === id ? { ...o, status: 'resolvido' } : o);
        localStorage.setItem('geo_santos_ocorrencias', JSON.stringify(incidents));
        return true;
    }

    static async deleteIncident(id) {
        await this._delay(80);
        const data = localStorage.getItem('geo_santos_ocorrencias');
        let incidents = data ? JSON.parse(data) : [];

        incidents = incidents.filter(o => o.id !== id);
        localStorage.setItem('geo_santos_ocorrencias', JSON.stringify(incidents));
        return true;
    }

    // --- MÉTODOS DE BACKUP ---
    static async exportBackup() {
        const supervisores = await this.getSupervisores();
        const postos = await this.getPosts();
        const ocorrencias = await this.getIncidents();

        return JSON.stringify({
            supervisores,
            postos,
            ocorrencias,
            exportedAt: new Date().toISOString()
        }, null, 2);
    }

    static async importBackup(jsonString) {
        try {
            await this._delay(150);
            const backup = JSON.parse(jsonString);
            
            if (!backup.supervisores || !backup.postos || !backup.ocorrencias) {
                throw new Error("Formato de backup inválido. Chaves essenciais ausentes.");
            }

            localStorage.setItem('geo_santos_supervisores', JSON.stringify(backup.supervisores));
            localStorage.setItem('geo_santos_postos', JSON.stringify(backup.postos));
            localStorage.setItem('geo_santos_ocorrencias', JSON.stringify(backup.ocorrencias));
            localStorage.setItem('geo_santos_initialized', 'true');
            return true;
        } catch (e) {
            console.error("Erro ao importar backup:", e);
            throw new Error("Falha na importação: Arquivo corrompido ou inválido.");
        }
    }
}

window.DatabaseService = DatabaseService;
