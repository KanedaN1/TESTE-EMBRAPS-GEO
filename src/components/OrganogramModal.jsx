import React from 'react';
import './OrganogramModal.css';

export default function OrganogramModal({ coordenadores, supervisores, postos, onClose }) {
  // Helpers
  const getSupervisoresDoCoordenador = (coordNome) => {
    return supervisores.filter(s => s.coordenador === coordNome);
  };

  const getPostosDoSupervisor = (supNome) => {
    return postos.filter(p => p.supervisorDiurno === supNome || p.supervisorNoturno === supNome);
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="glass-panel organogram-modal-content">
        <div className="modal-header" style={{display:'flex', justifyContent:'space-between', marginBottom:'20px'}}>
          <h2 style={{color: 'var(--primary-blue)'}}>Organograma Operacional</h2>
          <button className="action-btn" onClick={onClose}>Fechar</button>
        </div>

        <div className="organogram-container">
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
                              
                              {postosSup.length > 0 && (
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
  );
}
