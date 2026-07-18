import React, { useState } from 'react';
import { Filter, Map as MapIcon, Route, ClipboardList, Edit, Users, Car, Printer } from 'lucide-react';

export default function Filters({ 
  onFilterChange, 
  onToggleHeatmap, 
  heatmapActive,
  onToggleSupervisorRoute,
  routeActive,
  onSimulateTraffic,
  onAddPosto,
  onOpenSupervisors,
  onPrint,
  supervisores = [],
  loadingRoute = false,
  onToggleTvMode
}) {
  const [filterState, setFilterState] = useState({
    nome: '',
    supervisor: '',
    bairro: '',
    status: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newFilters = { ...filterState, [name]: value };
    setFilterState(newFilters);
    onFilterChange(newFilters);
  };

  return (
    <div className="filters-bar glass-panel animate-fade-in" style={{ animationDelay: '0.1s' }}>
      
      {/* Group 1: Search & Filters */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
        <Filter size={20} color="var(--primary-blue)" />
        
        <input 
          type="text" 
          name="nome" 
          placeholder="Nome do Posto" 
          className="filter-input"
          value={filterState.nome}
          onChange={handleChange}
        />
        <select 
          name="supervisor" 
          className="filter-input"
          value={filterState.supervisor}
          onChange={handleChange}
        >
          <option value="">Supervisor (Todos)</option>
          {supervisores.map(sup => {
            const nome = sup.name || sup.firstName || '';
            return (
              <option key={sup.id} value={nome}>{nome}</option>
            );
          })}
        </select>
        <input 
          type="text" 
          name="bairro" 
          placeholder="Bairro" 
          className="filter-input"
          value={filterState.bairro}
          onChange={handleChange}
        />
        
        <select name="status" className="filter-input" value={filterState.status} onChange={handleChange}>
          <option value="">Status (Todos)</option>
          <option value="Operacional">Operacional (Verde)</option>
          <option value="Alerta">Alerta (Vermelho)</option>
          <option value="Clima">Clima (Azul)</option>
        </select>
      </div>

      {/* Group 2: Map Actions */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button className={`action-btn ${heatmapActive ? 'active' : ''}`} onClick={onToggleHeatmap}>
          <MapIcon size={16} /> Mapa de Calor
        </button>
        
        <button className={`action-btn ${routeActive ? 'active' : ''}`} onClick={onToggleSupervisorRoute} disabled={loadingRoute}>
          <Route size={16} /> {loadingRoute ? 'Calculando...' : 'Rota Inteligente'}
        </button>

        <button className="action-btn" onClick={onSimulateTraffic} title="Simular engarrafamentos (TomTom API)">
          <Car size={16} /> Trânsito (TomTom)
        </button>
      </div>

      {/* Group 3: Manage Actions */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button className="action-btn" onClick={onAddPosto} title="Gerenciar todos os postos">
          <ClipboardList size={16} /> Postos
        </button>
        <button className="action-btn" onClick={onOpenSupervisors}>
          <Users size={16} /> Supervisores
        </button>
        <button className="action-btn" onClick={onPrint} title="Imprimir escalas em PDF/A4">
          <Printer size={16} /> Imprimir
        </button>
        <button className="action-btn active" onClick={onToggleTvMode} title="Entrar no Modo Tela Cheia (TV)">
          📺 Modo TV
        </button>
      </div>

    </div>
  );
}
