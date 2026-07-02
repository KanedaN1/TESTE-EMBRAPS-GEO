import React, { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import Filters from './components/Filters';
import SidebarChat from './components/SidebarChat';
import MapComponent from './components/MapComponent';
import { postos as mockPostos, getDadosMensais, getTopOcorrencias, supervisors as mockSupervisors } from './services/mockData';
import { fetchWeather, fetchContelePlaces, fetchConteleUsers } from './services/apiServices';
import './index.css';

function App() {
  const [currentMonth, setCurrentMonth] = useState('Janeiro');
  const [filters, setFilters] = useState({ nome: '', supervisor: '', bairro: '', status: '' });
  
  // Toggles
  const [heatmapActive, setHeatmapActive] = useState(false);
  const [routeActive, setRouteActive] = useState(false);
  const [trafficActive, setTrafficActive] = useState(false);
  const [weatherActive, setWeatherActive] = useState(false);
  const [pluviometer, setPluviometer] = useState(0);
  const [conteleData, setConteleData] = useState([]);
  const [conteleUsers, setConteleUsers] = useState([]);
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSupModal, setShowSupModal] = useState(false);

  // Check APIs on mount
  useEffect(() => {
    const initData = async () => {
      const data = await fetchWeather();
      if (data && data.current && data.current.precipitation !== undefined) {
        setPluviometer(data.current.precipitation);
        if (data.current.precipitation > 0) setWeatherActive(true);
      } else {
        setWeatherActive(true); 
        setPluviometer(12.5); // mock tempestade
      }

      const [placesResponse, usersResponse] = await Promise.all([
        fetchContelePlaces(),
        fetchConteleUsers()
      ]);

      if (placesResponse && Array.isArray(placesResponse)) {
        setConteleData(placesResponse);
      }
      
      if (usersResponse && Array.isArray(usersResponse)) {
        setConteleUsers(usersResponse);
      }
    };
    initData();
  }, []);

  // Compute enriched postos with current month data and business rules
  const enrichedPostos = useMemo(() => {
    const basePostos = conteleData.length > 0 ? [...mockPostos, ...conteleData.filter(c => c.lat && c.lng).map(c => ({
      id: c.id || Math.random(),
      nome: c.name || c.nome,
      bairro: c.address?.neighborhood || 'Desconhecido',
      lat: c.lat,
      lng: c.lng,
      turno: '24h',
      supervisorDiurno: 'Contele',
      supervisorNoturno: 'Contele',
      comporta: false
    }))] : mockPostos;

    const monthlyData = getDadosMensais(currentMonth);
    const topOccurrences = getTopOcorrencias(currentMonth);

    return basePostos.map(posto => {
      const data = monthlyData.find(d => d.postoId === posto.id) || { faltas: 0, demissoes: 0, posVenda: 0 };
      
      let status = 'Operacional'; // Verde
      
      // Regra de Alerta (Vermelho)
      const isTopFaltas = topOccurrences.topFaltas.includes(posto.id);
      const isTopDemissoes = topOccurrences.topDemissoes.includes(posto.id);
      if (isTopFaltas || isTopDemissoes || data.posVenda > 0) {
        status = 'Alerta';
      }

      // Regra de Clima (Azul) - Se weatherActive e tem comporta
      if (weatherActive && posto.comporta) {
        status = 'Clima';
      }

      return { ...posto, ...data, status };
    });
  }, [currentMonth, weatherActive]);

  // Apply filters
  const filteredPostos = useMemo(() => {
    return enrichedPostos.filter(p => {
      const matchNome = p.nome.toLowerCase().includes(filters.nome.toLowerCase());
      const matchSup = p.supervisorDiurno.toLowerCase().includes(filters.supervisor.toLowerCase()) || 
                       p.supervisorNoturno.toLowerCase().includes(filters.supervisor.toLowerCase());
      const matchBairro = p.bairro.toLowerCase().includes(filters.bairro.toLowerCase());
      const matchStatus = filters.status ? p.status === filters.status : true;

      return matchNome && matchSup && matchBairro && matchStatus;
    });
  }, [enrichedPostos, filters]);

  // Compute KPIs
  const kpis = useMemo(() => {
    const totalPostos = enrichedPostos.length;
    let faltas = 0;
    let demissoes = 0;
    let posVenda = 0;

    enrichedPostos.forEach(p => {
      faltas += p.faltas;
      demissoes += p.demissoes;
      posVenda += p.posVenda;
    });

    return { totalPostos, faltas, demissoes, posVenda };
  }, [enrichedPostos]);

  return (
    <div className="app-container">
      <div className="main-content">
        <Header 
          currentMonth={currentMonth} 
          setCurrentMonth={setCurrentMonth} 
          kpis={kpis} 
          pluviometer={pluviometer}
        />
        
        <Filters 
          onFilterChange={setFilters}
          heatmapActive={heatmapActive}
          onToggleHeatmap={() => setHeatmapActive(!heatmapActive)}
          routeActive={routeActive}
          onToggleSupervisorRoute={() => setRouteActive(!routeActive)}
          onSimulateTraffic={() => setTrafficActive(!trafficActive)}
          onAddPosto={() => setShowAddModal(true)}
          onOpenSupervisors={() => setShowSupModal(true)}
          supervisores={conteleUsers.length > 0 ? conteleUsers : mockSupervisors}
        />
        
        <MapComponent 
          postos={filteredPostos} 
          heatmapActive={heatmapActive}
          routeActive={routeActive}
          trafficActive={trafficActive}
          weatherActive={weatherActive}
        />
      </div>

      <SidebarChat contextData={{ currentMonth, kpis, postos: enrichedPostos }} />

      {/* Modals Mock */}
      {showAddModal && (
        <div style={modalOverlayStyle}>
          <div className="glass-panel" style={modalContentStyle}>
            <h2 style={{color: 'var(--primary-blue)', marginBottom: '16px'}}>Adicionar Posto</h2>
            <input type="text" placeholder="Nome do Posto" className="filter-input" style={{width:'100%', marginBottom:'8px'}} />
            <input type="text" placeholder="Lat, Lng" className="filter-input" style={{width:'100%', marginBottom:'16px'}} />
            <div style={{display:'flex', gap:'8px', justifyContent:'flex-end'}}>
              <button className="action-btn" onClick={() => setShowAddModal(false)}>Cancelar</button>
              <button className="action-btn active" onClick={() => setShowAddModal(false)}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {showSupModal && (
        <div style={modalOverlayStyle}>
          <div className="glass-panel" style={modalContentStyle}>
            <h2 style={{color: 'var(--primary-blue)', marginBottom: '16px'}}>Supervisores</h2>
            <ul style={{listStyle:'none', padding:0, marginBottom:'16px', color:'var(--text-dark)', maxHeight: '300px', overflowY: 'auto'}}>
              {conteleUsers.length > 0 ? (
                conteleUsers.map(u => (
                  <li key={u.id} style={{padding:'8px', borderBottom:'1px solid rgba(0,0,0,0.1)'}}>
                    {u.name || u.firstName || 'Supervisor'} {u.lastName || ''} - {u.profileName || u.role || 'Geral'}
                  </li>
                ))
              ) : (
                mockSupervisors.map(u => (
                  <li key={u.id} style={{padding:'8px', borderBottom:'1px solid rgba(0,0,0,0.1)'}}>
                    {u.name} - Mock
                  </li>
                ))
              )}
            </ul>
            <button className="action-btn" onClick={() => setShowSupModal(false)}>Fechar</button>
          </div>
        </div>
      )}
    </div>
  );
}

const modalOverlayStyle = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
  display: 'flex', alignItems: 'center', justifyContent: 'center'
};

const modalContentStyle = {
  padding: '24px', width: '400px', backgroundColor: 'rgba(255,255,255,0.95)'
};

export default App;
