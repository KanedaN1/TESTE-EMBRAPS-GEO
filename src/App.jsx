import React, { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import Filters from './components/Filters';
import SidebarChat from './components/SidebarChat';
import MapComponent from './components/MapComponent';
import { postos as mockPostos, getDadosMensais, getTopOcorrencias, supervisors as mockSupervisors } from './services/mockData';
import { fetchWeather, fetchContelePlaces, fetchConteleUsers, geocodeAddress, getTomTomRoute } from './services/apiServices';
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
  
  // Novos estados para criação manual
  const [customPostos, setCustomPostos] = useState([]);
  const [customSupervisores, setCustomSupervisores] = useState([]);
  const [tomTomRouteCoords, setTomTomRouteCoords] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(false);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSupModal, setShowSupModal] = useState(false);

  // Form states
  const [newPosto, setNewPosto] = useState({ nome: '', address: '', comporta: false, supervisor: '', telefone: '' });
  const [newSup, setNewSup] = useState({ nome: '', turno: 'Diurno' });

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

  const allSupervisores = useMemo(() => {
    const base = conteleUsers.length > 0 ? conteleUsers : mockSupervisors;
    return [...base, ...customSupervisores];
  }, [conteleUsers, customSupervisores]);

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
      comporta: false,
      telefone: ''
    }))] : mockPostos;

    const allPostos = [...basePostos, ...customPostos];
    const monthlyData = getDadosMensais(currentMonth);
    const topOccurrences = getTopOcorrencias(currentMonth);

    return allPostos.map(posto => {
      const data = monthlyData.find(d => d.postoId === posto.id) || { faltas: 0, demissoes: 0, posVenda: 0 };
      
      let status = 'Operacional'; // Verde
      
      // Regra de Alerta (Vermelho)
      const isTopFaltas = topOccurrences.topFaltas.includes(posto.id);
      const isTopDemissoes = topOccurrences.topDemissoes.includes(posto.id);
      if (isTopFaltas || isTopDemissoes || data.posVenda > 0) {
        status = 'Alerta';
      }

      // Regra de Clima (Azul) - Se weatherActive (chuva forte) e tem comporta
      if (weatherActive && posto.comporta) {
        status = 'Clima';
      }

      return { ...posto, ...data, status };
    });
  }, [currentMonth, weatherActive, conteleData, customPostos]);

  // Apply filters
  const filteredPostos = useMemo(() => {
    return enrichedPostos.filter(p => {
      const matchNome = p.nome.toLowerCase().includes(filters.nome.toLowerCase());
      const supD = p.supervisorDiurno || '';
      const supN = p.supervisorNoturno || '';
      const matchSup = supD.toLowerCase().includes(filters.supervisor.toLowerCase()) || 
                       supN.toLowerCase().includes(filters.supervisor.toLowerCase());
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
      faltas += p.faltas || 0;
      demissoes += p.demissoes || 0;
      posVenda += p.posVenda || 0;
    });

    return { totalPostos, faltas, demissoes, posVenda };
  }, [enrichedPostos]);

  // TomTom Route Handler
  const handleToggleRoute = async () => {
    if (routeActive) {
      setRouteActive(false);
      setTomTomRouteCoords(null);
      return;
    }
    
    setLoadingRoute(true);
    // Ponto de Partida: Embraps
    const embrapsCoord = await geocodeAddress("Praça Coronel Fernando Prestes 18, Macuco, Santos, SP");
    const startPoint = embrapsCoord || { lat: -23.9608, lng: -46.3336 }; 
    
    // Filtra postos visíveis para a rota
    const points = [startPoint, ...filteredPostos.map(p => ({ lat: p.lat, lng: p.lng }))];
    
    if (points.length > 1) {
      // Limita a 150 waypoints (limite TomTom Routing)
      const route = await getTomTomRoute(points.slice(0, 150));
      if (route) {
        setTomTomRouteCoords(route);
        setRouteActive(true);
      } else {
        alert("Não foi possível calcular a rota. Verifique a chave da API ou tente com menos postos.");
      }
    } else {
      alert("Nenhum posto filtrado para traçar rota.");
    }
    setLoadingRoute(false);
  };

  const handleSavePosto = async () => {
    let lat = -23.9608, lng = -46.3336; // Default
    if (newPosto.address) {
       const coords = await geocodeAddress(newPosto.address);
       if (coords) { lat = coords.lat; lng = coords.lng; }
       else alert("Endereço não encontrado, usando coordenadas padrão.");
    }
    const created = {
      id: Date.now(),
      nome: newPosto.nome || 'Novo Posto',
      bairro: newPosto.address || 'Adicionado Manualmente',
      lat: lat,
      lng: lng,
      turno: '24h',
      supervisorDiurno: newPosto.supervisor,
      supervisorNoturno: newPosto.supervisor,
      comporta: newPosto.comporta,
      telefone: newPosto.telefone,
      faltas: 0, demissoes: 0, posVenda: 0
    };
    setCustomPostos([...customPostos, created]);
    setShowAddModal(false);
    setNewPosto({ nome: '', address: '', comporta: false, supervisor: '', telefone: '' });
  };

  const handleSaveSup = () => {
    if(!newSup.nome) return;
    setCustomSupervisores([...customSupervisores, { id: Date.now(), name: newSup.nome, turno: newSup.turno }]);
    setNewSup({ nome: '', turno: 'Diurno' });
  };

  const handleDeleteSup = (id) => {
    setCustomSupervisores(customSupervisores.filter(s => s.id !== id));
  };

  const printEscalas = () => {
    window.print();
  };

  return (
    <>
      <div className="app-container no-print">
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
            onToggleSupervisorRoute={handleToggleRoute}
            onSimulateTraffic={() => setTrafficActive(!trafficActive)}
            onAddPosto={() => setShowAddModal(true)}
            onOpenSupervisors={() => setShowSupModal(true)}
            onPrint={printEscalas}
            supervisores={allSupervisores}
            loadingRoute={loadingRoute}
          />
          
          <MapComponent 
            postos={filteredPostos} 
            heatmapActive={heatmapActive}
            routeActive={routeActive}
            tomTomRouteCoords={tomTomRouteCoords}
            trafficActive={trafficActive}
            weatherActive={weatherActive}
          />
        </div>

        <SidebarChat contextData={{ currentMonth, kpis, postos: enrichedPostos }} />

        {/* Modal Adicionar Posto */}
        {showAddModal && (
          <div style={modalOverlayStyle}>
            <div className="glass-panel" style={modalContentStyle}>
              <h2 style={{color: 'var(--primary-blue)', marginBottom: '16px'}}>Adicionar Posto</h2>
              <input type="text" placeholder="Nome do Posto" value={newPosto.nome} onChange={e => setNewPosto({...newPosto, nome: e.target.value})} className="filter-input" style={{width:'100%', marginBottom:'8px'}} />
              <input type="text" placeholder="Endereço (Gera Lat/Lng automático)" value={newPosto.address} onChange={e => setNewPosto({...newPosto, address: e.target.value})} className="filter-input" style={{width:'100%', marginBottom:'8px'}} />
              <input type="text" placeholder="Telefone do posto" value={newPosto.telefone} onChange={e => setNewPosto({...newPosto, telefone: e.target.value})} className="filter-input" style={{width:'100%', marginBottom:'8px'}} />
              
              <select className="filter-input" style={{width:'100%', marginBottom:'8px'}} value={newPosto.supervisor} onChange={e => setNewPosto({...newPosto, supervisor: e.target.value})}>
                <option value="">Selecione o Supervisor Responsável</option>
                {allSupervisores.map(s => <option key={s.id} value={s.name || s.firstName}>{s.name || s.firstName}</option>)}
              </select>

              <label style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'16px', color:'var(--text-dark)'}}>
                <input type="checkbox" checked={newPosto.comporta} onChange={e => setNewPosto({...newPosto, comporta: e.target.checked})} />
                Possui comporta?
              </label>

              <div style={{display:'flex', gap:'8px', justifyContent:'flex-end'}}>
                <button className="action-btn" onClick={() => setShowAddModal(false)}>Cancelar</button>
                <button className="action-btn active" onClick={handleSavePosto}>Salvar</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Supervisores */}
        {showSupModal && (
          <div style={modalOverlayStyle}>
            <div className="glass-panel" style={{...modalContentStyle, width: '500px'}}>
              <h2 style={{color: 'var(--primary-blue)', marginBottom: '16px'}}>Gestão de Supervisores</h2>
              
              {/* Add Supervisor Form */}
              <div style={{display:'flex', gap:'8px', marginBottom:'16px'}}>
                <input type="text" placeholder="Nome do Supervisor" value={newSup.nome} onChange={e=>setNewSup({...newSup, nome: e.target.value})} className="filter-input" style={{flex: 1}} />
                <select value={newSup.turno} onChange={e=>setNewSup({...newSup, turno: e.target.value})} className="filter-input">
                  <option value="Diurno">Diurno</option>
                  <option value="Noturno">Noturno</option>
                </select>
                <button className="action-btn active" onClick={handleSaveSup}>Criar</button>
              </div>

              <ul style={{listStyle:'none', padding:0, marginBottom:'16px', color:'var(--text-dark)', maxHeight: '300px', overflowY: 'auto'}}>
                {allSupervisores.map(u => {
                  const nome = u.name || u.firstName || 'Supervisor';
                  const postosResp = enrichedPostos.filter(p => p.supervisorDiurno === nome || p.supervisorNoturno === nome).length;
                  const isCustom = customSupervisores.some(cs => cs.id === u.id);
                  return (
                    <li key={u.id} style={{padding:'8px', borderBottom:'1px solid rgba(0,0,0,0.1)', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                      <div>
                        <strong>{nome}</strong> ({u.turno || u.role || 'Geral'}) <br/>
                        <small>{postosResp} postos atribuídos</small>
                      </div>
                      {isCustom && (
                        <button className="action-btn" style={{color:'var(--danger)', borderColor:'var(--danger)'}} onClick={() => handleDeleteSup(u.id)}>Excluir</button>
                      )}
                    </li>
                  )
                })}
              </ul>
              <div style={{display:'flex', justifyContent:'flex-end'}}>
                <button className="action-btn" onClick={() => setShowSupModal(false)}>Fechar</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Renderização Exclusiva para Impressão */}
      <div className="print-container print-only">
        {allSupervisores.map(sup => {
          const supName = sup.name || sup.firstName;
          const postosSup = enrichedPostos.filter(p => p.supervisorDiurno === supName || p.supervisorNoturno === supName);
          
          if(postosSup.length === 0) return null; // Não imprime supervisor sem postos

          return (
            <div key={sup.id} className="print-page">
              <div className="print-header">
                <h2>Escala de Supervisor: {supName}</h2>
                <p>Turno: {sup.turno || 'Geral'} | Total de Postos: {postosSup.length}</p>
                <hr />
              </div>
              <div className="print-postos-grid">
                {postosSup.map(p => (
                  <div key={p.id} className="print-posto-card">
                    <h3>{p.nome}</h3>
                    <p><strong>Bairro:</strong> {p.bairro}</p>
                    <p><strong>Telefone:</strong> {p.telefone || 'N/A'}</p>
                    <p><strong>Comporta:</strong> {p.comporta ? 'Sim' : 'Não'}</p>
                    <p><strong>Status:</strong> {p.status}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

const modalOverlayStyle = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
  display: 'flex', alignItems: 'center', justifyContent: 'center'
};

const modalContentStyle = {
  padding: '24px', width: '400px', backgroundColor: 'rgba(255,255,255,0.95)',
  borderRadius: '16px'
};

export default App;
