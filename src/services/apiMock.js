export const mockPosts = [
  { id: 1, name: "Posto Central Santos", lat: -23.9554, lng: -46.3312, neighborhood: "Centro", shift: "Diurno/Noturno", supDay: "João", supNight: "Maria", comporta: true },
  { id: 2, name: "Condomínio Praia Grande", lat: -24.0116, lng: -46.4118, neighborhood: "Boqueirão", shift: "Diurno/Noturno", supDay: "Carlos", supNight: "Pedro", comporta: false },
  { id: 3, name: "Galpão SV", lat: -23.9631, lng: -46.3919, neighborhood: "Vila Margarida", shift: "Diurno", supDay: "João", supNight: "N/A", comporta: true },
  { id: 4, name: "Edifício Guarujá", lat: -23.9934, lng: -46.2564, neighborhood: "Enseada", shift: "Noturno", supDay: "N/A", supNight: "Maria", comporta: false },
  { id: 5, name: "Posto Gonzaga", lat: -23.9678, lng: -46.3331, neighborhood: "Gonzaga", shift: "Diurno/Noturno", supDay: "Carlos", supNight: "Maria", comporta: true },
  { id: 6, name: "Shopping Santos", lat: -23.9723, lng: -46.3275, neighborhood: "Aparecida", shift: "Diurno/Noturno", supDay: "João", supNight: "Pedro", comporta: false },
  { id: 7, name: "Escola SV", lat: -23.9525, lng: -46.3811, neighborhood: "Itararé", shift: "Diurno", supDay: "Carlos", supNight: "N/A", comporta: true },
  { id: 8, name: "Porto Santos", lat: -23.9312, lng: -46.3114, neighborhood: "Macuco", shift: "Diurno/Noturno", supDay: "João", supNight: "Maria", comporta: true },
  { id: 9, name: "Terminal PG", lat: -24.0234, lng: -46.4251, neighborhood: "Vila Mirim", shift: "Diurno/Noturno", supDay: "Carlos", supNight: "Pedro", comporta: false },
  { id: 10, name: "Condomínio Astúrias", lat: -24.0089, lng: -46.3012, neighborhood: "Astúrias", shift: "Diurno/Noturno", supDay: "João", supNight: "Maria", comporta: true },
  { id: 11, name: "Hospital Santos", lat: -23.9456, lng: -46.3221, neighborhood: "Vila Mathias", shift: "Diurno/Noturno", supDay: "Carlos", supNight: "Pedro", comporta: false },
  { id: 12, name: "Fábrica Cubatão", lat: -23.8867, lng: -46.4278, neighborhood: "Centro", shift: "Diurno/Noturno", supDay: "João", supNight: "Maria", comporta: true },
  { id: 13, name: "Praça Itanhaém", lat: -24.1834, lng: -46.7865, neighborhood: "Centro", shift: "Diurno/Noturno", supDay: "Carlos", supNight: "Maria", comporta: false }
];

export const mockSpreadsheet = [
  { postId: 1, absences: 5, dismissals: 1, postSales: 0 }, // Faltas altas
  { postId: 2, absences: 0, dismissals: 0, postSales: 2 }, // Pos venda negativo
  { postId: 3, absences: 2, dismissals: 5, postSales: 0 }, // Demissoes altas
  { postId: 4, absences: 0, dismissals: 0, postSales: 0 }, // Operacional (Verde)
  { postId: 5, absences: 8, dismissals: 0, postSales: 0 }, // Faltas altas
  { postId: 6, absences: 0, dismissals: 0, postSales: 0 }, // Operacional
  { postId: 7, absences: 1, dismissals: 0, postSales: 0 }, // Faltas baixa (fora top 10 se houver muitos)
  { postId: 8, absences: 0, dismissals: 2, postSales: 0 }, // Demissoes medias
  { postId: 9, absences: 0, dismissals: 0, postSales: 0 }, // Operacional
  { postId: 10, absences: 3, dismissals: 1, postSales: 0 }, // Mediano
  { postId: 11, absences: 0, dismissals: 0, postSales: 0 }, // Operacional
  { postId: 12, absences: 0, dismissals: 0, postSales: 0 }, // Operacional
  { postId: 13, absences: 0, dismissals: 0, postSales: 0 }  // Operacional
];

export const getPosts = async () => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(mockPosts), 500);
  });
};

export const getDailySpreadsheet = async (month) => {
  // Simular busca de planilha para o mês (retornando o mesmo mock para fins de teste)
  return new Promise((resolve) => {
    setTimeout(() => resolve(mockSpreadsheet), 500);
  });
};
