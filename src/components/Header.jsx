import React, { useState } from 'react';
import { Calendar, Users, AlertTriangle, UserMinus, ThumbsDown, CloudRain, Edit2, Check, X } from 'lucide-react';
import logo from '../../assets/img/logo.png';

export default function Header({ currentMonth, setCurrentMonth, kpis, pluviometer, globalKpis = { faltas: 0, demissoes: 0, posVenda: 0 }, setGlobalKpis }) {
  const months = ['Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const [editing, setEditing] = useState(false);
  const [tempKpis, setTempKpis] = useState(globalKpis);

  const startEditing = () => {
    setTempKpis(globalKpis);
    setEditing(true);
  };

  const saveEditing = () => {
    setGlobalKpis(tempKpis);
    setEditing(false);
  };

  return (
    <div className="header glass-panel animate-fade-in">
      <div className="header-title" style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
        <img src={logo} alt="Embraps Geo Logo" style={{ height: '70px', objectFit: 'contain' }} />
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start', paddingLeft: '50px' }}>
          <span style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--primary-blue)', letterSpacing: '2px' }}>G.E.O</span>
        </div>
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
            {editing ? (
              <input type="number" className="filter-input" style={{width: '70px', padding: '4px', marginTop: '4px', fontSize: '1rem'}} value={tempKpis.faltas} onChange={e => setTempKpis({...tempKpis, faltas: Number(e.target.value)})} />
            ) : (
              <span className="kpi-value" style={{ color: kpis.faltas > 5 ? 'var(--danger)' : 'var(--primary-blue)'}}>{kpis.faltas}</span>
            )}
          </div>
          <div className="kpi-card">
            <span className="kpi-title"><UserMinus size={12} style={{display:'inline', marginRight:'4px'}}/> Demissões</span>
            {editing ? (
              <input type="number" className="filter-input" style={{width: '70px', padding: '4px', marginTop: '4px', fontSize: '1rem'}} value={tempKpis.demissoes} onChange={e => setTempKpis({...tempKpis, demissoes: Number(e.target.value)})} />
            ) : (
              <span className="kpi-value" style={{ color: kpis.demissoes > 0 ? 'var(--danger)' : 'var(--primary-blue)'}}>{kpis.demissoes}</span>
            )}
          </div>
          <div className="kpi-card">
            <span className="kpi-title"><ThumbsDown size={12} style={{display:'inline', marginRight:'4px'}}/> Pós-Venda Neg.</span>
            {editing ? (
              <input type="number" className="filter-input" style={{width: '70px', padding: '4px', marginTop: '4px', fontSize: '1rem'}} value={tempKpis.posVenda} onChange={e => setTempKpis({...tempKpis, posVenda: Number(e.target.value)})} />
            ) : (
              <span className="kpi-value" style={{ color: kpis.posVenda > 0 ? 'var(--danger)' : 'var(--primary-blue)'}}>{kpis.posVenda}</span>
            )}
          </div>
          <div className="kpi-card">
            <span className="kpi-title"><CloudRain size={12} style={{display:'inline', marginRight:'4px'}}/> Chuva (mm/h)</span>
            <span className="kpi-value" style={{ color: pluviometer > 5 ? 'var(--secondary-blue)' : 'var(--primary-blue)'}}>
              {pluviometer} mm/h
            </span>
          </div>

          <div style={{display: 'flex', alignItems: 'center', marginLeft: '8px'}}>
            {editing ? (
              <div style={{display: 'flex', gap: '4px'}}>
                <button className="action-btn active" onClick={saveEditing} style={{padding: '8px'}} title="Salvar"><Check size={16} /></button>
                <button className="action-btn" onClick={() => setEditing(false)} style={{padding: '8px'}} title="Cancelar"><X size={16} /></button>
              </div>
            ) : (
              <button className="action-btn" onClick={startEditing} style={{padding: '8px'}} title="Editar KPIs"><Edit2 size={16} /></button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
