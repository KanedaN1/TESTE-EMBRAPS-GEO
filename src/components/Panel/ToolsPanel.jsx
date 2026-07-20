import React from 'react';
import './ToolsPanel.css';
import { Plus, AlertTriangle, Users, Map as MapIcon, Link } from 'lucide-react';

export const ToolsPanel = ({ 
  filters, 
  setFilters, 
  heatmapActive, 
  setHeatmapActive,
  routeSupervisor,
  setRouteSupervisor,
  onAddPost,
  onRegisterIncident,
  onToggleSupervisors
}) => {
  return (
    <div className="tools-panel">
      <div className="panel-section">
        <h3 className="panel-title">Filtros de Mapa</h3>
        <div className="filters-group">
          <input 
            type="text" 
            className="input-field" 
            placeholder="Nome do Posto"
            value={filters.name}
            onChange={e => setFilters({...filters, name: e.target.value})}
          />
          <input 
            type="text" 
            className="input-field" 
            placeholder="Supervisor"
            value={filters.supervisor}
            onChange={e => setFilters({...filters, supervisor: e.target.value})}
          />
          <input 
            type="text" 
            className="input-field" 
            placeholder="Bairro"
            value={filters.neighborhood}
            onChange={e => setFilters({...filters, neighborhood: e.target.value})}
          />
          <select 
            className="input-field"
            value={filters.status}
            onChange={e => setFilters({...filters, status: e.target.value})}
          >
            <option value="">Todos os Status</option>
            <option value="Operacional">Operacional</option>
            <option value="Alerta">Alerta (Vermelho)</option>
            <option value="Chuva">Atenção Climática (Azul)</option>
          </select>
        </div>
      </div>

      <div className="panel-section">
        <h3 className="panel-title">Controles Visuais</h3>
        <div className="actions-group">
          <button 
            className={`btn ${heatmapActive ? 'btn-active' : 'btn-secondary'}`}
            onClick={() => setHeatmapActive(!heatmapActive)}
            title="Mapa de Calor de Ocorrências"
          >
            <MapIcon size={16} /> Calor
          </button>
          <button 
            className={`btn ${routeSupervisor ? 'btn-active' : 'btn-secondary'}`}
            onClick={() => setRouteSupervisor(!routeSupervisor)}
            title={routeSupervisor ? "Desativar rota de supervisor" : "Conectar postos do supervisor filtrado"}
          >
            <Link size={16} /> Rota Sup.
          </button>
        </div>
      </div>

      <div className="panel-section">
        <h3 className="panel-title">Operações</h3>
        <div className="actions-group">
          <button className="btn btn-secondary" onClick={onToggleSupervisors}>
            <Users size={16} /> Supervisores
          </button>
          <button className="btn btn-secondary" onClick={onRegisterIncident}>
            <AlertTriangle size={16} /> Registrar Ocorrência
          </button>
          <button className="btn" onClick={onAddPost}>
            <Plus size={16} /> Novo Posto
          </button>
        </div>
      </div>
    </div>
  );
};
