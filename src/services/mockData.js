export const supervisors = [
  { id: 1, name: 'João Silva' },
  { id: 2, name: 'Maria Souza' },
  { id: 3, name: 'Carlos Santos' },
  { id: 4, name: 'Ana Oliveira' },
];

export const postos = [
  {
    id: 101,
    nome: 'Condomínio Acapulco',
    bairro: 'Guarujá',
    lat: -23.978,
    lng: -46.185,
    turno: 'Diurno',
    supervisorDiurno: 'João Silva',
    supervisorNoturno: 'Maria Souza',
    comporta: true,
  },
  {
    id: 102,
    nome: 'Shopping Praia Mar',
    bairro: 'Aparecida (Santos)',
    lat: -23.974,
    lng: -46.309,
    turno: '24h',
    supervisorDiurno: 'Carlos Santos',
    supervisorNoturno: 'Carlos Santos',
    comporta: false,
  },
  {
    id: 103,
    nome: 'Edifício Blue Coast',
    bairro: 'Gonzaga (Santos)',
    lat: -23.968,
    lng: -46.331,
    turno: 'Noturno',
    supervisorDiurno: 'Ana Oliveira',
    supervisorNoturno: 'João Silva',
    comporta: true,
  },
  {
    id: 104,
    nome: 'Residencial Itararé',
    bairro: 'São Vicente',
    lat: -23.966,
    lng: -46.375,
    turno: '24h',
    supervisorDiurno: 'Maria Souza',
    supervisorNoturno: 'Ana Oliveira',
    comporta: false,
  },
  {
    id: 105,
    nome: 'Galpão Cubatão',
    bairro: 'Jardim Casqueiro',
    lat: -23.887,
    lng: -46.401,
    turno: 'Diurno',
    supervisorDiurno: 'Carlos Santos',
    supervisorNoturno: 'João Silva',
    comporta: true,
  },
  {
    id: 106,
    nome: 'Pátio Praia Grande',
    bairro: 'Boqueirão (PG)',
    lat: -24.004,
    lng: -46.415,
    turno: '24h',
    supervisorDiurno: 'Ana Oliveira',
    supervisorNoturno: 'Maria Souza',
    comporta: true,
  },
];

// Dados mensais para simular a Planilha Diária
export const planilhaMensal = {
  Janeiro: [
    { postoId: 101, faltas: 1, demissoes: 0, posVenda: 0 },
    { postoId: 102, faltas: 5, demissoes: 1, posVenda: 2 }, // Alerta
    { postoId: 103, faltas: 0, demissoes: 0, posVenda: 0 },
    { postoId: 104, faltas: 2, demissoes: 0, posVenda: 0 },
    { postoId: 105, faltas: 0, demissoes: 0, posVenda: 0 },
    { postoId: 106, faltas: 8, demissoes: 2, posVenda: 0 }, // Alerta
  ],
  Fevereiro: [
    { postoId: 101, faltas: 0, demissoes: 0, posVenda: 0 },
    { postoId: 102, faltas: 1, demissoes: 0, posVenda: 0 },
    { postoId: 103, faltas: 6, demissoes: 0, posVenda: 1 }, // Alerta
    { postoId: 104, faltas: 0, demissoes: 0, posVenda: 0 },
    { postoId: 105, faltas: 2, demissoes: 1, posVenda: 0 }, // Alerta
    { postoId: 106, faltas: 0, demissoes: 0, posVenda: 0 },
  ],
};

export const getDadosMensais = (mes) => {
  return planilhaMensal[mes] || [];
};

export const getTopOcorrencias = (mes) => {
  const dados = getDadosMensais(mes);
  const faltasSort = [...dados].sort((a, b) => b.faltas - a.faltas);
  const demissoesSort = [...dados].sort((a, b) => b.demissoes - a.demissoes);
  
  // No mock atual (poucos postos), top 2 em vez de top 10 para o visual ficar dinâmico
  return {
    topFaltas: faltasSort.slice(0, 2).filter(d => d.faltas > 0).map(d => d.postoId),
    topDemissoes: demissoesSort.slice(0, 2).filter(d => d.demissoes > 0).map(d => d.postoId),
  };
};
