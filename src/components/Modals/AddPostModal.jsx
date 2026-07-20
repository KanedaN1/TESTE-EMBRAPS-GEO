import React, { useState } from 'react';
import { BaseModal } from './BaseModal';

export const AddPostModal = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    lat: '',
    lng: '',
    neighborhood: '',
    shift: 'Diurno/Noturno',
    supDay: '',
    supNight: '',
    comporta: false
  });

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!formData.name || !formData.lat || !formData.lng) {
      alert("Preencha os campos obrigatórios (Nome, Lat, Lng).");
      return;
    }
    
    onSave({
      ...formData,
      id: Date.now(), // ID gerado para MVP local
      lat: parseFloat(formData.lat),
      lng: parseFloat(formData.lng)
    });
    
    onClose();
  };

  return (
    <BaseModal title="Adicionar Novo Posto" onClose={onClose}>
      <div className="form-group">
        <label>Nome do Posto *</label>
        <input 
          className="input-field" 
          value={formData.name} 
          onChange={e => setFormData({...formData, name: e.target.value})} 
        />
      </div>
      
      <div style={{ display: 'flex', gap: '12px' }}>
        <div className="form-group" style={{ flex: 1 }}>
          <label>Latitude *</label>
          <input 
            type="number" step="0.0001" className="input-field" 
            value={formData.lat} onChange={e => setFormData({...formData, lat: e.target.value})} 
          />
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label>Longitude *</label>
          <input 
            type="number" step="0.0001" className="input-field" 
            value={formData.lng} onChange={e => setFormData({...formData, lng: e.target.value})} 
          />
        </div>
      </div>

      <div className="form-group">
        <label>Bairro</label>
        <input 
          className="input-field" 
          value={formData.neighborhood} 
          onChange={e => setFormData({...formData, neighborhood: e.target.value})} 
        />
      </div>

      <div className="form-group">
        <label>Comporta Local?</label>
        <select 
          className="input-field" 
          value={formData.comporta ? "sim" : "nao"} 
          onChange={e => setFormData({...formData, comporta: e.target.value === "sim"})}
        >
          <option value="nao">Não</option>
          <option value="sim">Sim</option>
        </select>
      </div>

      <div className="modal-actions">
        <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn" onClick={handleSubmit}>Salvar Posto</button>
      </div>
    </BaseModal>
  );
};
