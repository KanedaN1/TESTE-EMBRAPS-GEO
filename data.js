// Banco de Dados Inicial e Gerador de Dados - Santos/SP
// Este arquivo gera a carga inicial de postos, supervisores e ocorrências para o painel.

const SUPERVISORES = [
    // 13 Supervisores Diurnos
    { id: 'SD1', nome: 'Carlos Silva', turno: 'diurno', cor: '#3b82f6' },
    { id: 'SD2', nome: 'Marcos Souza', turno: 'diurno', cor: '#10b981' },
    { id: 'SD3', nome: 'Ricardo Alves', turno: 'diurno', cor: '#8b5cf6' },
    { id: 'SD4', nome: 'Thiago Oliveira', turno: 'diurno', cor: '#f59e0b' },
    { id: 'SD5', nome: 'Fernando Santos', turno: 'diurno', cor: '#ec4899' },
    { id: 'SD6', nome: 'André Costa', turno: 'diurno', cor: '#14b8a6' },
    { id: 'SD7', nome: 'Rodrigo Lima', turno: 'diurno', cor: '#f97316' },
    { id: 'SD8', nome: 'Fábio Ramos', turno: 'diurno', cor: '#06b6d4' },
    { id: 'SD9', nome: 'Marcelo Vieira', turno: 'diurno', cor: '#a855f7' },
    { id: 'SD10', nome: 'Daniel Gomes', turno: 'diurno', cor: '#eab308' },
    { id: 'SD11', nome: 'Bruno Rocha', turno: 'diurno', cor: '#6366f1' },
    { id: 'SD12', nome: 'Gustavo Barbosa', turno: 'diurno', cor: '#adfa1d' },
    { id: 'SD13', nome: 'Alexandre Melo', turno: 'diurno', cor: '#22c55e' },

    // 4 Supervisores Noturnos
    { id: 'SN1', nome: 'Maurício Nobre', turno: 'noturno', cor: '#ef4444' },
    { id: 'SN2', nome: 'Renato Cardoso', turno: 'noturno', cor: '#d946ef' },
    { id: 'SN3', nome: 'Cláudio Ferreira', turno: 'noturno', cor: '#06b6d4' },
    { id: 'SN4', nome: 'Roberto Nascimento', turno: 'noturno', cor: '#fbbf24' }
];

const BAIRROS_SANTOS = [
    { nome: 'Gonzaga', centro: [-23.965, -46.335], raio: 0.008, tipo: 'comercial' },
    { nome: 'Boqueirão', centro: [-23.968, -46.325], raio: 0.008, tipo: 'comercial' },
    { nome: 'Centro', centro: [-23.935, -46.325], raio: 0.009, tipo: 'comercial' },
    { nome: 'Valongo', centro: [-23.932, -46.332], raio: 0.006, tipo: 'industrial' },
    { nome: 'Ponta da Praia', centro: [-23.980, -46.300], raio: 0.010, tipo: 'residencial' },
    { nome: 'Aparecida', centro: [-23.972, -46.312], raio: 0.008, tipo: 'residencial' },
    { nome: 'Embaré', centro: [-23.970, -46.318], raio: 0.008, tipo: 'residencial' },
    { nome: 'Campo Grande', centro: [-23.960, -46.340], raio: 0.008, tipo: 'residencial' },
    { nome: 'Marapé', centro: [-23.960, -46.348], raio: 0.008, tipo: 'residencial' },
    { nome: 'José Menino', centro: [-23.970, -46.355], raio: 0.007, tipo: 'residencial' },
    { nome: 'Areia Branca', centro: [-23.945, -46.365], raio: 0.012, tipo: 'misto' },
    { nome: 'Castelo', centro: [-23.940, -46.375], raio: 0.008, tipo: 'misto' },
    { nome: 'Saboó', centro: [-23.930, -46.350], raio: 0.008, tipo: 'industrial' },
    { nome: 'Vila Mathias', centro: [-23.948, -46.330], raio: 0.008, tipo: 'misto' },
    { nome: 'Vila Nova', centro: [-23.938, -46.320], raio: 0.006, tipo: 'misto' },
    { nome: 'Encruzilhada', centro: [-23.952, -46.326], raio: 0.007, tipo: 'misto' }
];

const NOMES_POSTOS = {
    comercial: [
        'Miramar Shopping', 'Praiamar Shopping', 'Shopping Pátio Iporanga', 'Supermercado Pão de Açúcar', 
        'Supermercado Extra', 'Carrefour Conselheiro', 'Sondinha Supermercados', 'Agência Itaú', 
        'Agência Bradesco', 'Banco do Brasil', 'Santander Centro', 'Lojas Americanas Centro', 
        'Magazines Luiza Gonzaga', 'Clínica Médica Gonzaga', 'Centro Comercial Gonzaga', 
        'Galeria Miramar', 'Restaurante Orla', 'Hotel Mendes Plaza', 'Hotel Parque Balneário'
    ],
    industrial: [
        'Porto de Santos Gate 1', 'Porto de Santos Gate 2', 'Porto de Santos Gate 3', 'Porto de Santos Gate 4',
        'Cais do Saboó Armazém 5', 'Cais do Saboó Armazém 8', 'Terminal Ter निरंतर', 'Terminal de Grãos Valongo',
        'Terminal de Contêineres Ponta da Praia', 'Bandeirantes Logística', 'Pátio de Triagem Valongo',
        'Armazém Alfandegado', 'Garagem Viação Piracicabana', 'Oficina Ferroviária Valongo',
        'Pátio Logístico Saboó', 'Terminal Químico Alemoa', 'Distribuidora de Combustíveis Saboó'
    ],
    residencial: [
        'Condomínio Vista Mar', 'Condomínio Praiamar', 'Condomínio Santos Dumont', 'Edifício Ana Costa',
        'Residencial Boqueirão', 'Condomínio Embaré Executive', 'Edifício Ponta da Praia Plaza',
        'Condomínio Castell Di Maria', 'Residencial Gonzaga Beach', 'Edifício José Menino Palace',
        'Condomínio Marapé Park', 'Residencial Jardim da Orla', 'Condomínio Sol da Manhã',
        'Residencial Aparecida Premium', 'Edifício Conselheiro Nébias', 'Condomínio Verde Mar'
    ],
    misto: [
        'Liceu Santista', 'Colégio Stella Maris', 'Campus Unisanta', 'Campus Unilus', 'Campus Unimes',
        'Santa Casa de Santos', 'Hospital Beneficência Portuguesa', 'Hospital Ana Costa', 'UPA Central',
        'Farmácia Droga Raia Conselheiro', 'Farmácia Drogasil Vila Mathias', 'Posto Ipiranga Vila Mathias',
        'Posto Shell Gonzaga', 'Academia Bluefit Vila Mathias', 'Academia SmartFit Gonzaga',
        'Teatro Municipal de Santos', 'Estádio Urbano Caldeira (Vila Belmiro)', 'Clube Regatas Vasco da Gama'
    ]
};

// Gerador pseudo-aleatório com semente (para gerar os mesmos postos sempre na primeira carga)
function seedRandom(seed) {
    var x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}

function gerarPostosIniciais() {
    const postos = [];
    let idCounter = 1;
    let seed = 12345;

    // Distribuir 360 postos entre os bairros
    BAIRROS_SANTOS.forEach(bairro => {
        const numPostosBairro = 360 / BAIRROS_SANTOS.length;
        
        for (let i = 0; i < numPostosBairro; i++) {
            const rLat = (seedRandom(seed++) - 0.5) * bairro.raio;
            const rLng = (seedRandom(seed++) - 0.5) * bairro.raio;
            const lat = bairro.centro[0] + rLat;
            const lng = bairro.centro[1] + rLng;
            
            const nomesCategoria = NOMES_POSTOS[bairro.tipo];
            const nomeIndex = Math.floor(seedRandom(seed++) * nomesCategoria.length);
            const nomeBase = nomesCategoria[nomeIndex];
            const nomeFinal = `${nomeBase} ${i + 1}`;
            
            const daySup = SUPERVISORES.filter(s => s.turno === 'diurno')[Math.floor(seedRandom(seed++) * 13)];
            const nightSup = SUPERVISORES.filter(s => s.turno === 'noturno')[Math.floor(seedRandom(seed++) * 4)];
            
            const isDayOnly = seedRandom(seed++) > 0.8;
            const hasComporta = seedRandom(seed++) > 0.85; // ~15% chance
            const telefone = hasComporta ? `(13) 9${Math.floor(80000000 + seedRandom(seed++) * 19999999)}` : null;
            
            postos.push({
                id: `P${idCounter++}`,
                nome: nomeFinal,
                bairro: bairro.nome,
                lat: lat,
                lng: lng,
                daySupervisorId: daySup.id,
                nightSupervisorId: isDayOnly ? null : nightSup.id,
                isDayOnly: isDayOnly,
                isNightOnly: false,
                hasComporta: hasComporta,
                telefone: telefone,
                ativo: true
            });
        }
    });
    
    return postos;
}

function gerarOcorrenciasIniciais(postos) {
    const ocorrencias = [];
    let idCounter = 1;
    let seed = 999;
    
    const hoje = new Date();
    
    // Gerar 1100 faltas (espalhadas nos últimos 30 dias)
    for (let i = 0; i < 1100; i++) {
        // Criar tendência: alguns postos têm MAIS faltas
        const power = Math.pow(seedRandom(seed++), 2); // Distorcer a probabilidade (Concentrar faltas em alguns postos)
        const postoIndex = Math.floor(power * postos.length);
        const posto = postos[postoIndex];
        
        let diasAtras = Math.floor(seedRandom(seed++) * 30);
        if (seedRandom(seed++) > 0.3) {
            diasAtras = Math.floor(seedRandom(seed++) * 7); // 70% das ocorrências na última semana
        }
        
        const dataOcc = new Date(hoje);
        dataOcc.setDate(dataOcc.getDate() - diasAtras);
        
        ocorrencias.push({
            id: `O${idCounter++}`,
            postId: posto.id,
            tipo: 'falta',
            colaborador: 'Colaborador Faltante',
            detalhes: 'Falta sem justificativa registrada.',
            supervisorId: posto.daySupervisorId,
            data: dataOcc.toISOString().split('T')[0],
            status: diasAtras < 2 ? 'pendente' : 'resolvido', // Ativas apenas as muito recentes
            severidade: 'alta'
        });
    }

    // Gerar 100 demissões
    for (let i = 0; i < 100; i++) {
        const posto = postos[Math.floor(seedRandom(seed++) * postos.length)];
        let diasAtras = Math.floor(seedRandom(seed++) * 30);
        if (seedRandom(seed++) > 0.3) diasAtras = Math.floor(seedRandom(seed++) * 7);
        
        const dataOcc = new Date(hoje);
        dataOcc.setDate(dataOcc.getDate() - diasAtras);
        
        ocorrencias.push({
            id: `O${idCounter++}`,
            postId: posto.id,
            tipo: 'demissao',
            colaborador: 'Colaborador Desligado',
            detalhes: 'Aviso prévio / Desligamento / Posto Descoberto',
            supervisorId: posto.daySupervisorId,
            data: dataOcc.toISOString().split('T')[0],
            status: diasAtras < 5 ? 'pendente' : 'resolvido',
            severidade: 'alta'
        });
    }

    // Gerar 100 admissões
    for (let i = 0; i < 100; i++) {
        const posto = postos[Math.floor(seedRandom(seed++) * postos.length)];
        const diasAtras = Math.floor(seedRandom(seed++) * 30);
        const dataOcc = new Date(hoje);
        dataOcc.setDate(dataOcc.getDate() - diasAtras);
        
        ocorrencias.push({
            id: `O${idCounter++}`,
            postId: posto.id,
            tipo: 'admissao',
            colaborador: 'Novo Colaborador',
            detalhes: 'Entrada para cobertura de vaga',
            supervisorId: posto.daySupervisorId,
            data: dataOcc.toISOString().split('T')[0],
            status: 'resolvido', // Admissão entra já resolvida geralmente
            severidade: 'baixa'
        });
    }

    return ocorrencias;
}

const mockPostos = gerarPostosIniciais();
const mockOcorrencias = gerarOcorrenciasIniciais(mockPostos);

// Exportar para escopo global do navegador
window.DEFAULT_DATA = {
    supervisores: SUPERVISORES,
    postos: mockPostos,
    ocorrencias: mockOcorrencias
};

