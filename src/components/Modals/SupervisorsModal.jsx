import React from 'react';
import { BaseModal } from './BaseModal';

export const SupervisorsModal = ({ isOpen, onClose, posts }) => {
  if (!isOpen) return null;

  // Extrair supervisores únicos dos postos
  const uniqueSupervisors = Array.from(new Set(
    posts.flatMap(p => [p.supDay, p.supNight]).filter(s => s && s !== 'N/A')
  ));

  return (
    <BaseModal title="Gestão de Supervisores" onClose={onClose}>
      <div className="form-group">
        <p style={{ color: 'var(--color-foreground)', marginBottom: '8px' }}>
          Total de Supervisores Ativos: <strong>{uniqueSupervisors.length}</strong>
        </p>
        
        <div style={{ maxHeight: '200px', overflowY: 'auto', backgroundColor: 'var(--color-background)', padding: '8px', borderRadius: '4px' }}>
          {uniqueSupervisors.map((sup, index) => (
            <div key={index} style={{ padding: '8px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between' }}>
              <span>{sup}</span>
              <button className="btn btn-secondary" style={{ padding: '2px 8px', fontSize: '0.7rem' }}>Editar</button>
            </div>
          ))}
        </div>
      </div>

      <div className="modal-actions">
        <button className="btn btn-secondary" onClick={onClose}>Fechar</button>
      </div>
    </BaseModal>
  );
};
