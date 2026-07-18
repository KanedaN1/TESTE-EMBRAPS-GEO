import React, { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import Filters from './components/Filters';
import SidebarChat from './components/SidebarChat';
import MapComponent from './components/MapComponent';
import OrganogramModal from './components/OrganogramModal';
import { postos as mockPostos, getDadosMensais, getTopOcorrencias, supervisors as mockSupervisors } from './services/mockData';
import { fetchWeather, fetchContelePlaces, fetchConteleUsers, geocodeAddress, getTomTomRoute } from './services/apiServices';
import './index.css';

import { useFirestoreSync } from './services/useFirestoreSync';

const defaultCoordenadores = [

const defaultCoordenadores = [
  { id: 1, name: 'Coordenador 1' },
  { id: 2, name: 'Coordenador 2' },
  { id: 3, name: 'Coordenador 3' },
  { id: 4, name: 'Coordenador 4' }
];

function App() {
  const [currentMonth, setCurrentMonth] = useState('Julho');
  const [filters, setFilters] = useState({ nome: '', supervisor: '', bairro: '', status: '' });
  
  const [heatmapActive, setHeatmapActive] = useState(false);
  const [routeActive, setRouteActive] = useState(false);
  const [trafficActive, setTrafficActive] = useState(false);
  const [weatherActive, setWeatherActive] = useState(false);
  const [pluviometer, setPluviometer] = useState(0);
  
  const [conteleData, setConteleData] = useState([]);
  const [conteleUsers, setConteleUsers] = useState([]);
  
  // Estados Persistentes (Firestore)
  const [customPostos, setCustomPostos] = useFirestoreSync('customPostos', []);
  const [postosOverrides, setPostosOverrides] = useFirestoreSync('postosOverrides', {});
  const [customSupervisores, setCustomSupervisores] = useFirestoreSync('customSupervisores', []);
  const [supervisoresOverrides, setSupervisoresOverrides] = useFirestoreSync('supervisoresOverrides', {});
  const [deletedSupervisores, setDeletedSupervisores] = useFirestoreSync('deletedSupervisores', []);
  const [coordenadores, setCoordenadores] = useFirestoreSync('coordenadores', defaultCoordenadores);
  const [globalKpis, setGlobalKpis] = useFirestoreSync('globalKpis', { faltas: 0, demissoes: 0, posVenda: 0 });

  // Modo TV
  const [isTvMode, setIsTvMode] = useState(false);

  const toggleTvMode = async () => {
    if (!document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen();
        setIsTvMode(true);
      } catch (err) {
        console.error("Erro ao entrar em tela cheia", err);
      }
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
        setIsTvMode(false);
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => setIsTvMode(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);
  
  const [tomTomRouteCoords, setTomTomRouteCoords] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(false);

  // Modals
  const [showPostosModal, setShowPostosModal] = useState(false);
  const [showEditPostoModal, setShowEditPostoModal] = useState(false);
  const [showSupModal, setShowSupModal] = useState(false);
  const [showCoordModal, setShowCoordModal] = useState(false);
  const [showOrganogramModal, setShowOrganogramModal] = useState(false);

  // Form states
  const [editingPosto, setEditingPosto] = useState(null);
  const [newSup, setNewSup] = useState({ nome: '', turno: 'Diurno', coordenador: '' });
  const [newCoord, setNewCoord] = useState('');
  const [expandedSupId, setExpandedSupId] = useState(null);
  const [editingCoord, setEditingCoord] = useState(null); // {id, name}
  const [editingSup, setEditingSup] = useState(null); // {id, coordenador}
  const [postosModalFilterSup, setPostosModalFilterSup] = useState('');

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setShowPostosModal(false);
        setShowEditPostoModal(false);
        setShowSupModal(false);
        setShowCoordModal(false);
        setShowOrganogramModal(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  useEffect(() => {
    const initData = async () => {
      const data = await fetchWeather();
      if (data && data.current && data.current.precipitation !== undefined) {
        setPluviometer(data.current.precipitation);
        if (data.current.precipitation > 0) setWeatherActive(true);
      } else {
        setWeatherActive(true); 
        setPluviometer(12.5);
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

  // Removido useEffects de saveLocal (agora tratado pelo useFirestoreSync)

  const allSupervisores = useMemo(() => {
    const base = conteleUsers.length > 0 ? conteleUsers : mockSupervisors;
    // Filter out empty names and map them properly
    const mappedBase = base
      .filter(u => u.firstName || u.name || u.nome)
      .map(u => ({...u, name: u.firstName || u.name || u.nome}));
      
    // Combine base and custom, then filter out deleted ones
    const combined = [...mappedBase, ...customSupervisores].map(u => {
      if (supervisoresOverrides[u.id]) {
        return { ...u, ...supervisoresOverrides[u.id] };
      }
      return u;
    });
    return combined.filter(u => !deletedSupervisores.includes(u.id));
  }, [conteleUsers, customSupervisores, supervisoresOverrides, deletedSupervisores]);

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

    const allPostosBase = [...basePostos, ...customPostos];
    const monthlyData = getDadosMensais(currentMonth);
    const topOccurrences = getTopOcorrencias(currentMonth);
    const now = Date.now();
    const seteDias = 7 * 24 * 60 * 60 * 1000;

    return allPostosBase.map(posto => {
      const override = postosOverrides[posto.id] || {};
      const merged = { ...posto, ...override };

      const mockData = monthlyData.find(d => d.postoId === merged.id) || { faltas: 0, demissoes: 0, posVenda: 0 };
      
      merged.faltas = merged.faltasMensais !== undefined ? merged.faltasMensais : mockData.faltas;
      merged.demissoes = merged.demissoesMensais !== undefined ? merged.demissoesMensais : mockData.demissoes;
      merged.posVenda = merged.posVendaMensais !== undefined ? merged.posVendaMensais : mockData.posVenda;
      
      let status = 'Operacional'; // Verde
      let isAlerta = topOccurrences.topFaltas.includes(merged.id) || topOccurrences.topDemissoes.includes(merged.id) || merged.posVenda > 0;
      
      if (merged.alertaManual) {
         if (now - merged.alertaData <= seteDias) {
           isAlerta = true;
         }
      }

      if (isAlerta) status = 'Alerta';
      if (weatherActive && merged.comporta) status = 'Clima';

      return { ...merged, status };
    });
  }, [currentMonth, weatherActive, conteleData, customPostos, postosOverrides]);

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

  const kpis = useMemo(() => {
    return { 
      totalPostos: enrichedPostos.length, 
      faltas: globalKpis.faltas, 
      demissoes: globalKpis.demissoes, 
      posVenda: globalKpis.posVenda 
    };
  }, [enrichedPostos.length, globalKpis]);

  const handleToggleRoute = async () => {
    if (routeActive) { setRouteActive(false); setTomTomRouteCoords(null); return; }
    setLoadingRoute(true);
    const embrapsCoord = await geocodeAddress("Praça Cel. Fernando Prestes, 18 - Macuco, Santos - SP");
    const startPoint = embrapsCoord || { lat: -23.9608, lng: -46.3336 }; 
    const points = [startPoint, ...filteredPostos.map(p => ({ lat: p.lat, lng: p.lng }))];
    
    if (points.length > 1) {
      const route = await getTomTomRoute(points.slice(0, 150));
      if (route) { setTomTomRouteCoords(route); setRouteActive(true); }
      else alert("Falha na rota TomTom. Verifique API.");
    } else alert("Nenhum posto filtrado.");
    setLoadingRoute(false);
  };

  const handleSavePosto = async () => {
    if (editingPosto.isNew) {
      let lat = -23.9608, lng = -46.3336;
      if (editingPosto.address) {
         const coords = await geocodeAddress(editingPosto.address);
         if (coords) { lat = coords.lat; lng = coords.lng; }
      }
      const created = {
        id: Date.now(),
        nome: editingPosto.nome || 'Novo Posto',
        bairro: editingPosto.address || 'Manual',
        lat, lng, turno: '24h',
        supervisorDiurno: editingPosto.supervisor,
        supervisorNoturno: editingPosto.supervisor,
        comporta: editingPosto.comporta,
        telefone: editingPosto.telefone,
        faltasMensais: parseInt(editingPosto.faltasMensais) || 0,
        demissoesMensais: parseInt(editingPosto.demissoesMensais) || 0,
        posVendaMensais: parseInt(editingPosto.posVendaMensais) || 0,
        alertaManual: editingPosto.temAlertaSemanal,
        alertaData: editingPosto.temAlertaSemanal ? Date.now() : null
      };
      setCustomPostos([...customPostos, created]);
    } else {
      // Editando existente
      const overrides = {
        nome: editingPosto.nome,
        comporta: editingPosto.comporta,
        supervisorDiurno: editingPosto.supervisor,
        supervisorNoturno: editingPosto.supervisor,
        faltasMensais: parseInt(editingPosto.faltasMensais) || 0,
        demissoesMensais: parseInt(editingPosto.demissoesMensais) || 0,
        posVendaMensais: parseInt(editingPosto.posVendaMensais) || 0,
        alertaManual: editingPosto.temAlertaSemanal,
        alertaData: editingPosto.temAlertaSemanal ? Date.now() : null
      };
      setPostosOverrides({ ...postosOverrides, [editingPosto.id]: overrides });
    }
    setShowEditPostoModal(false);
  };

  const handleDeletePosto = (id) => {
    if (window.confirm("Deseja ocultar/excluir este posto?")) {
      setCustomPostos(customPostos.filter(p => p.id !== id));
      setPostosOverrides({ ...postosOverrides, [id]: { isDeleted: true } });
    }
  };

  const openEditPosto = (posto) => {
    const isNovo = !posto.id;
    setEditingPosto({
      isNew: isNovo,
      id: posto.id,
      nome: posto.nome || '',
      address: posto.bairro || '',
      telefone: posto.telefone || '',
      supervisor: posto.supervisorDiurno || '',
      comporta: posto.comporta || false,
      faltasMensais: posto.faltas !== undefined ? posto.faltas : 0,
      demissoesMensais: posto.demissoes !== undefined ? posto.demissoes : 0,
      posVendaMensais: posto.posVenda !== undefined ? posto.posVenda : 0,
      temAlertaSemanal: !!posto.alertaManual
    });
    setShowEditPostoModal(true);
  };

  const handleSaveSup = () => {
    if(!newSup.nome) return;
    setCustomSupervisores([{ 
      id: Date.now(), name: newSup.nome, turno: newSup.turno, coordenador: newSup.coordenador 
    }, ...customSupervisores]); // Add to top
    setNewSup({ nome: '', turno: 'Diurno', coordenador: '' });
  };

  const handleDeleteSup = (id) => {
    // Add to deleted list (works for both custom and API)
    setDeletedSupervisores([...deletedSupervisores, id]);
  };

  const handleSaveCoord = () => {
    if (editingCoord) {
      setCoordenadores(coordenadores.map(c => c.id === editingCoord.id ? editingCoord : c));
      setEditingCoord(null);
    } else if (newCoord) {
      setCoordenadores([...coordenadores, { id: Date.now(), name: newCoord }]);
      setNewCoord('');
    }
  };

  const handleDeleteCoord = (id) => {
    if (window.confirm("Deseja realmente excluir este coordenador?")) {
      setCoordenadores(coordenadores.filter(c => c.id !== id));
    }
  };

  const printEscalas = () => window.print();

  return (
    <>
      <div className={`app-container no-print ${isTvMode ? 'tv-mode' : ''}`}>
        <div className="main-content">
          {!isTvMode && <Header currentMonth={currentMonth} setCurrentMonth={setCurrentMonth} kpis={kpis} pluviometer={pluviometer} globalKpis={globalKpis} setGlobalKpis={setGlobalKpis} />}
          
          {!isTvMode && (
            <Filters 
              onFilterChange={setFilters}
              heatmapActive={heatmapActive}
              onToggleHeatmap={() => setHeatmapActive(!heatmapActive)}
              routeActive={routeActive}
              onToggleSupervisorRoute={handleToggleRoute}
              onSimulateTraffic={() => setTrafficActive(!trafficActive)}
              onAddPosto={() => setShowPostosModal(true)}
              onOpenSupervisors={() => setShowSupModal(true)}
              onPrint={printEscalas}
              supervisores={allSupervisores}
              loadingRoute={loadingRoute}
              onToggleTvMode={toggleTvMode}
            />
          )}
          
          <MapComponent 
            postos={filteredPostos.filter(p => !p.isDeleted)} 
            heatmapActive={heatmapActive}
            routeActive={routeActive}
            tomTomRouteCoords={tomTomRouteCoords}
            trafficActive={trafficActive}
            weatherActive={weatherActive}
            onEditPosto={!isTvMode ? openEditPosto : null} // Disable edit in TV mode
          />

          {isTvMode && (
            <button 
              onClick={toggleTvMode} 
              style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 9999, padding: '10px 20px', borderRadius: '30px', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', cursor: 'pointer', backdropFilter: 'blur(10px)' }}
            >
              Sair da Tela Cheia (ESC)
            </button>
          )}
        </div>

        {!isTvMode && <SidebarChat contextData={{ currentMonth, kpis, postos: enrichedPostos }} />}

        {/* Modal Postos (Listagem Geral) */}
        {showPostosModal && (
          <div style={modalOverlayStyle} onClick={(e) => e.target === e.currentTarget && setShowPostosModal(false)}>
            <div className="glass-panel" style={{...modalContentStyle, width: '600px', maxHeight:'80vh', display:'flex', flexDirection:'column'}}>
              <div style={{display:'flex', justifyContent:'space-between', marginBottom:'16px'}}>
                <h2 style={{color: 'var(--primary-blue)'}}>Gestão de Postos</h2>
                <div>
                  <button className="action-btn active" onClick={() => openEditPosto({})}>+ Novo Posto</button>
                </div>
              </div>

              <div style={{marginBottom: '16px'}}>
                <select 
                  className="filter-input" 
                  style={{width: '100%', marginBottom: '0'}} 
                  value={postosModalFilterSup} 
                  onChange={(e) => setPostosModalFilterSup(e.target.value)}
                >
                  <option value="">Todos os Supervisores</option>
                  {allSupervisores.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </div>

              <div style={{overflowY: 'auto', flex: 1, paddingRight:'8px'}}>
                {enrichedPostos
                  .filter(p => !p.isDeleted)
                  .filter(p => !postosModalFilterSup || p.supervisorDiurno === postosModalFilterSup || p.supervisorNoturno === postosModalFilterSup)
                  .map(p => (
                  <div key={p.id} style={{padding:'8px', borderBottom:'1px solid rgba(0,0,0,0.1)', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <div>
                      <strong>{p.nome}</strong> <span style={{fontSize:'0.8rem', color:'gray'}}>- {p.bairro}</span>
                      <div style={{fontSize:'0.8rem'}}>Sup: {p.supervisorDiurno} | Comporta: {p.comporta?'Sim':'Não'}</div>
                    </div>
                    <div style={{display:'flex', gap:'8px'}}>
                      <button className="action-btn" onClick={() => openEditPosto(p)}>Editar</button>
                      <button className="action-btn" style={{color:'var(--danger)', borderColor:'var(--danger)'}} onClick={() => handleDeletePosto(p.id)}>Excluir</button>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{display:'flex', justifyContent:'flex-end', marginTop:'16px'}}>
                <button className="action-btn" onClick={() => setShowPostosModal(false)}>Fechar</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Editar/Criar Posto */}
        {showEditPostoModal && editingPosto && (
          <div style={modalOverlayStyle} onClick={(e) => e.target === e.currentTarget && setShowEditPostoModal(false)}>
            <div className="glass-panel" style={{...modalContentStyle, width: '450px', maxHeight:'90vh', overflowY:'auto'}}>
              <h2 style={{color: 'var(--primary-blue)', marginBottom: '16px'}}>{editingPosto.isNew ? 'Criar Posto' : 'Editar Posto'}</h2>
              
              <label className="form-label">Nome do Posto</label>
              <input type="text" value={editingPosto.nome} onChange={e => setEditingPosto({...editingPosto, nome: e.target.value})} className="filter-input" style={inputStyle} />
              
              {editingPosto.isNew && (
                <>
                  <label className="form-label">Endereço (Gera Lat/Lng)</label>
                  <input type="text" value={editingPosto.address} onChange={e => setEditingPosto({...editingPosto, address: e.target.value})} className="filter-input" style={inputStyle} />
                </>
              )}
              
              <label className="form-label">Supervisor Responsável</label>
              <select className="filter-input" style={inputStyle} value={editingPosto.supervisor} onChange={e => setEditingPosto({...editingPosto, supervisor: e.target.value})}>
                <option value="">Nenhum</option>
                {allSupervisores.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>

              <label style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'16px', color:'var(--text-dark)'}}>
                <input type="checkbox" checked={editingPosto.comporta} onChange={e => setEditingPosto({...editingPosto, comporta: e.target.checked})} />
                <strong>Possui comporta?</strong> (Fica AZUL na chuva)
              </label>

              <div style={{borderTop:'1px solid #ccc', margin:'16px 0', paddingTop:'16px'}}>
                <h4 style={{color:'var(--danger)', marginBottom:'8px'}}>Alertas e Ocorrências</h4>
                <label style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'16px', color:'var(--text-dark)'}}>
                  <input type="checkbox" checked={editingPosto.temAlertaSemanal} onChange={e => setEditingPosto({...editingPosto, temAlertaSemanal: e.target.checked})} />
                  Marcar Alerta Vermelho (Faltas/Demissões semanais ou Pós-venda ruim). <i>Dura 7 dias.</i>
                </label>

                <div style={{display:'flex', gap:'8px'}}>
                  <div style={{flex:1}}>
                    <label className="form-label">Faltas (Mês)</label>
                    <input type="number" min="0" value={editingPosto.faltasMensais} onChange={e => setEditingPosto({...editingPosto, faltasMensais: e.target.value})} className="filter-input" style={inputStyle} />
                  </div>
                  <div style={{flex:1}}>
                    <label className="form-label">Demissões (Mês)</label>
                    <input type="number" min="0" value={editingPosto.demissoesMensais} onChange={e => setEditingPosto({...editingPosto, demissoesMensais: e.target.value})} className="filter-input" style={inputStyle} />
                  </div>
                  <div style={{flex:1}}>
                    <label className="form-label">Pós-venda (Mês)</label>
                    <input type="number" min="0" value={editingPosto.posVendaMensais} onChange={e => setEditingPosto({...editingPosto, posVendaMensais: e.target.value})} className="filter-input" style={inputStyle} />
                  </div>
                </div>
              </div>

              <div style={{display:'flex', gap:'8px', justifyContent:'flex-end'}}>
                <button className="action-btn" onClick={() => setShowEditPostoModal(false)}>Cancelar</button>
                <button className="action-btn active" onClick={handleSavePosto}>Salvar</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Supervisores e Coordenadores */}
        {showSupModal && (
          <div style={modalOverlayStyle} onClick={(e) => e.target === e.currentTarget && setShowSupModal(false)}>
            <div className="glass-panel" style={{...modalContentStyle, width: '600px', maxHeight:'90vh', overflowY:'auto'}}>
              <div style={{display:'flex', justifyContent:'space-between', marginBottom:'16px'}}>
                <h2 style={{color: 'var(--primary-blue)'}}>Gestão Operacional</h2>
                <div style={{display:'flex', gap:'8px'}}>
                  <button className="action-btn" onClick={() => setShowCoordModal(true)}>Coordenadores</button>
                  <button className="action-btn active" onClick={() => setShowOrganogramModal(true)}>Organograma</button>
                </div>
              </div>
              
              <div style={{display:'flex', gap:'8px', marginBottom:'16px'}}>
                <input type="text" placeholder="Novo Supervisor" value={newSup.nome} onChange={e=>setNewSup({...newSup, nome: e.target.value})} className="filter-input" style={{flex: 1}} />
                <select value={newSup.coordenador} onChange={e=>setNewSup({...newSup, coordenador: e.target.value})} className="filter-input" style={{width:'150px'}}>
                  <option value="">Sem Coord.</option>
                  {coordenadores.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
                <button className="action-btn active" onClick={handleSaveSup}>Criar</button>
              </div>

              <ul style={{listStyle:'none', padding:0, color:'var(--text-dark)'}}>
                {allSupervisores.map(u => {
                  const nome = u.name;
                  const postosResp = enrichedPostos.filter(p => !p.isDeleted && (p.supervisorDiurno === nome || p.supervisorNoturno === nome)).length;
                  const isCustom = customSupervisores.some(cs => cs.id === u.id);
                  return (
                    <li key={u.id} style={{padding:'8px', borderBottom:'1px solid rgba(0,0,0,0.1)', display:'flex', flexDirection:'column'}}>
                      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <div style={{cursor: 'pointer', flex: 1}} onClick={() => setExpandedSupId(expandedSupId === u.id ? null : u.id)}>
                          <strong>{nome}</strong> <span style={{fontSize:'0.8rem'}}>({u.coordenador ? `Coord: ${u.coordenador}` : 'Sem Coord'})</span> <br/>
                          <small style={{color:'var(--primary-blue)'}}>{postosResp} postos atribuídos</small>
                        </div>
                        
                        {editingSup?.id === u.id ? (
                          <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
                            <select 
                              className="filter-input" 
                              style={{width:'120px', marginBottom: 0}}
                              value={editingSup.coordenador} 
                              onChange={(e) => setEditingSup({...editingSup, coordenador: e.target.value})}
                            >
                              <option value="">Sem Coord.</option>
                              {coordenadores.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                            </select>
                            <button className="action-btn active" onClick={(e) => {
                              e.stopPropagation();
                              setSupervisoresOverrides({...supervisoresOverrides, [u.id]: { ...supervisoresOverrides[u.id], coordenador: editingSup.coordenador }});
                              setEditingSup(null);
                            }}>Salvar</button>
                            <button className="action-btn" onClick={(e) => { e.stopPropagation(); setEditingSup(null); }}>Cancelar</button>
                          </div>
                        ) : (
                          <div style={{display:'flex', gap:'8px'}}>
                            <button className="action-btn" onClick={(e) => { e.stopPropagation(); setEditingSup({ id: u.id, coordenador: u.coordenador || '' }); }}>✎ Editar</button>
                            <button className="action-btn" style={{color:'var(--danger)', borderColor:'var(--danger)'}} onClick={(e) => { e.stopPropagation(); handleDeleteSup(u.id); }}>Excluir</button>
                          </div>
                        )}
                      </div>
                      
                      {expandedSupId === u.id && (
                        <div style={{marginTop: '8px', padding: '8px', background: 'rgba(59,130,246,0.1)', borderRadius: '8px'}}>
                          {postosResp > 0 ? (
                            <ul style={{listStyle:'disc', paddingLeft:'20px', fontSize:'0.85rem'}}>
                              {enrichedPostos.filter(p => !p.isDeleted && (p.supervisorDiurno === nome || p.supervisorNoturno === nome)).map(p => (
                                <li key={p.id}>{p.nome}</li>
                              ))}
                            </ul>
                          ) : <span style={{fontSize:'0.85rem', color:'var(--text-light)'}}>Nenhum posto atribuído.</span>}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
              <div style={{display:'flex', justifyContent:'flex-end', marginTop:'16px'}}>
                <button className="action-btn" onClick={() => setShowSupModal(false)}>Fechar</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Coordenadores */}
        {showCoordModal && (
          <div style={modalOverlayStyle} onClick={(e) => e.target === e.currentTarget && setShowCoordModal(false)}>
            <div className="glass-panel" style={{...modalContentStyle, width: '400px'}}>
              <h2 style={{color: 'var(--primary-blue)', marginBottom: '16px'}}>Coordenadores</h2>
              
              <div style={{display:'flex', gap:'8px', marginBottom:'16px'}}>
                <input type="text" placeholder="Novo Coordenador" value={newCoord} onChange={e=>setNewCoord(e.target.value)} className="filter-input" style={{flex: 1}} />
                <button className="action-btn active" onClick={handleSaveCoord}>Adicionar</button>
              </div>

              {coordenadores.map(c => (
                <div key={c.id} style={{display:'flex', gap:'8px', marginBottom:'8px'}}>
                  {editingCoord?.id === c.id ? (
                    <>
                      <input type="text" value={editingCoord.name} onChange={e=>setEditingCoord({...editingCoord, name:e.target.value})} className="filter-input" style={{flex:1}} />
                      <button className="action-btn active" onClick={handleSaveCoord}>OK</button>
                    </>
                  ) : (
                    <>
                      <span style={{flex:1, alignSelf:'center'}}>{c.name}</span>
                      <button className="action-btn" onClick={() => setEditingCoord(c)}>Editar</button>
                      <button className="action-btn" style={{color:'var(--danger)', borderColor:'var(--danger)'}} onClick={() => handleDeleteCoord(c.id)}>Excluir</button>
                    </>
                  )}
                </div>
              ))}
              <div style={{display:'flex', justifyContent:'flex-end', marginTop:'16px'}}>
                <button className="action-btn" onClick={() => setShowCoordModal(false)}>Voltar</button>
              </div>
            </div>
          </div>
        )}

        {showOrganogramModal && (
          <OrganogramModal 
            coordenadores={coordenadores}
            supervisores={allSupervisores}
            postos={enrichedPostos.filter(p => !p.isDeleted)}
            onClose={() => setShowOrganogramModal(false)}
          />
        )}
      </div>

      <div className="print-container print-only">
        {/* Lógica de Impressão (Mantida) */}
        {allSupervisores.map(sup => {
          const supName = sup.name;
          const postosSup = enrichedPostos.filter(p => !p.isDeleted && (p.supervisorDiurno === supName || p.supervisorNoturno === supName));
          if(postosSup.length === 0) return null;
          return (
            <div key={sup.id} className="print-page">
              <div className="print-header">
                <h2>Escala: {supName}</h2>
                <hr />
              </div>
              <div className="print-postos-grid">
                {postosSup.map(p => (
                  <div key={p.id} className="print-posto-card">
                    <h3>{p.nome}</h3>
                    <p>Status: {p.status}</p>
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
  padding: '24px', backgroundColor: 'rgba(255,255,255,0.95)',
  borderRadius: '16px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
};

const inputStyle = { width:'100%', marginBottom:'12px' };

export default App;
