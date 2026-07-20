import React from 'react';
import './Header.css';

const months = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const Header = ({ currentMonth, setCurrentMonth, kpis }) => {
  return (
    <header className="header">
      <div className="header-left">
        <h1 className="logo">Embraps Geo</h1>
        <select 
          className="month-selector"
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
          <span className="kpi-title">Total de Postos</span>
          <span className="kpi-value">{kpis.totalPosts}</span>
        </div>
        <div className={`kpi-card ${kpis.totalAbsences > 0 ? 'kpi-red' : ''}`}>
          <span className="kpi-title">Faltas Totais</span>
          <span className="kpi-value">{kpis.totalAbsences}</span>
        </div>
        <div className={`kpi-card ${kpis.totalDismissals > 0 ? 'kpi-red' : ''}`}>
          <span className="kpi-title">Demissões</span>
          <span className="kpi-value">{kpis.totalDismissals}</span>
        </div>
        <div className={`kpi-card ${kpis.totalPostSales > 0 ? 'kpi-red' : ''}`}>
          <span className="kpi-title">Pós-venda Neg.</span>
          <span className="kpi-value">{kpis.totalPostSales}</span>
        </div>
      </div>
    </header>
  );
};
