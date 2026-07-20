import React, { useState } from 'react';
import './OrganogramModal.css';

export default function OrganogramModal({ coordenadores, supervisores, postos, onClose }) {
  const [hidePostos, setHidePostos] = useState(false);
  const containerRef = React.useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  // Helpers
  const getSupervisoresDoCoordenador = (coordNome) => {
    return supervisores.filter(s => s.coordenador === coordNome);
  };

  const getPostosDoSupervisor = (supNome) => {
    return postos.filter(p => p.supervisorDiurno === supNome || p.supervisorNoturno === supNome);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setStartX(e.pageX - containerRef.current.offsetLeft);
    setScrollLeft(containerRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - containerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5; // Velocidade da rolagem
    containerRef.current.scrollLeft = scrollLeft - walk;
  };

  return (
    <div className="organogram-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="glass-panel organogram-modal-content">
        <div className="modal-header" style={{display:'flex', justifyContent:'space-between', marginBottom:'20px', alignItems:'center'}}>
          <h2 style={{color: 'var(--primary-blue)', margin: 0}}>Organograma Operacional</h2>
          <div className="modal-actions" style={{display:'flex', gap:'16px', alignItems:'center'}}>
            <label style={{display:'flex', alignItems:'center', gap:'8px', cursor:'pointer', color:'var(--text-dark)', fontWeight:'bold'}}>
              <input 
                type="checkbox" 
                checked={hidePostos} 
                onChange={(e) => setHidePostos(e.target.checked)} 
                style={{width: '18px', height: '18px'}}
              />
              Esconder Postos
            </label>
            <button className="action-btn print-btn" onClick={handlePrint}>🖨️ Imprimir (A4)</button>
            <button className="action-btn" onClick={onClose}>Fechar</button>
          </div>
        </div>

        <div 
          className="organogram-container" 
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
        >
          <div className="org-tree-wrapper">
            <div className="org-level org-root">
              <div className="org-box root-box">
                <h3>Diretoria de Operações</h3>
              </div>
            </div>

            <div className="org-lines-down" />

            {/* Nível Coordenadores */}
            <div className="org-level coord-level" style={{display:'flex', justifyContent:'center', gap:'32px'}}>
            {coordenadores.map(coord => {
              const sups = getSupervisoresDoCoordenador(coord.name);
              return (
                <div key={coord.id} className="org-branch" style={{display:'flex', flexDirection:'column', alignItems:'center'}}>
                  <div className="org-box coord-box">
                    <h4>{coord.name}</h4>
                    <span className="org-role">Coordenador</span>
                  </div>
                  
                  {sups.length > 0 && (
                    <>
                      <div className="org-lines-down-small" />
                      {/* Nível Supervisores vinculados a este coordenador */}
                      <div className="org-level sup-level" style={{display:'flex', gap:'16px'}}>
                        {sups.map(sup => {
                          const supName = sup.name || sup.firstName;
                          const postosSup = getPostosDoSupervisor(supName);
                          return (
                            <div key={sup.id} className="org-branch" style={{display:'flex', flexDirection:'column', alignItems:'center'}}>
                              <div className="org-box sup-box">
                                <h5>{supName}</h5>
                                <span className="org-role">Supervisor</span>
                              </div>
                              
                              {postosSup.length > 0 && !hidePostos && (
                                <>
                                  <div className="org-lines-down-small" />
                                  <div className="org-level postos-level">
                                    <div className="postos-list-box">
                                      {postosSup.map(p => (
                                        <div key={p.id} className="posto-item">
                                          <span className={`status-dot ${p.status?.toLowerCase()}`}></span>
                                          {p.nome}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
