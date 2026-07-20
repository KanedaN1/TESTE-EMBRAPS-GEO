import axios from 'axios';

const TOMTOM_KEY = import.meta.env.VITE_TOMTOM_API_KEY;

export const getTrafficIncidents = async () => {
  if (!TOMTOM_KEY) {
    console.warn("TomTom API key is missing");
    return [];
  }
  
  try {
    // Bounding box para a Baixada Santista: minLon,minLat,maxLon,maxLat
    // Aproximadamente: -46.5, -24.2 (SW) até -46.1, -23.8 (NE)
    const bbox = '-46.5,-24.2,-46.1,-23.8';
    
    // Zoom 11
    const url = `https://api.tomtom.com/traffic/services/4/incidentDetails/s3/${bbox}/11/-1/json?key=${TOMTOM_KEY}`;
    
    const response = await axios.get(url);
    
    let jams = [];
    if (response.data && response.data.tm && response.data.tm.poi) {
      // Filtrar apenas engarrafamentos (iconCategory = 1 para Jam)
      jams = response.data.tm.poi.filter(incident => incident.ic === 1 || incident.ic === 11);
    }
    
    // Simulação de Engarrafamento na Avenida Ana Costa (Santos)
    const mockJam = {
      id: "mock_jam_ana_costa",
      p: { x: -46.3312, y: -23.9554 }, // Coordenadas aproximadas
      ic: 1,
      ty: 1, // Traffic jam
      d: "Engarrafamento Severo na Avenida Ana Costa",
      l: 1500 // Length em metros
    };
    
    return [...jams, mockJam];
  } catch (error) {
    console.error("Error fetching traffic data", error);
    return [];
  }
};
