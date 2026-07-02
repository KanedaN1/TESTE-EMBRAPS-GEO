import React from 'react';
import { Calendar, Users, AlertTriangle, UserMinus, ThumbsDown, CloudRain } from 'lucide-react';

export default function Header({ currentMonth, setCurrentMonth, kpis, pluviometer }) {
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho'];

  return (
    <div className="header glass-panel animate-fade-in">
      <div className="header-title">
        <h1>Embraps Geo</h1>
      </div>
      
      <div className="header-controls">
        <div className="month-selector">
          <select 
            value={currentMonth} 
            onChange={(e) => setCurrentMonth(e.target.value)}
          >
            {months.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        <div className="kpi-container">
          <div className="kpi-card">
            <span className="kpi-title"><Users size={12} style={{display:'inline', marginRight:'4px'}}/> Postos Ativos</span>
            <span className="kpi-value">{kpis.totalPostos}</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-title"><AlertTriangle size={12} style={{display:'inline', marginRight:'4px'}}/> Faltas Totais</span>
            <span className="kpi-value" style={{ color: kpis.faltas > 5 ? 'var(--danger)' : 'var(--primary-blue)'}}>
              {kpis.faltas}
            </span>
          </div>
          <div className="kpi-card">
            <span className="kpi-title"><UserMinus size={12} style={{display:'inline', marginRight:'4px'}}/> Demissões</span>
            <span className="kpi-value" style={{ color: kpis.demissoes > 0 ? 'var(--danger)' : 'var(--primary-blue)'}}>
              {kpis.demissoes}
            </span>
          </div>
          <div className="kpi-card">
            <span className="kpi-title"><ThumbsDown size={12} style={{display:'inline', marginRight:'4px'}}/> Pós-Venda Neg.</span>
            <span className="kpi-value" style={{ color: kpis.posVenda > 0 ? 'var(--danger)' : 'var(--primary-blue)'}}>
              {kpis.posVenda}
            </span>
          </div>
          <div className="kpi-card">
            <span className="kpi-title"><CloudRain size={12} style={{display:'inline', marginRight:'4px'}}/> Chuva (mm/h)</span>
            <span className="kpi-value" style={{ color: pluviometer > 5 ? 'var(--secondary-blue)' : 'var(--primary-blue)'}}>
              {pluviometer} mm/h
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
