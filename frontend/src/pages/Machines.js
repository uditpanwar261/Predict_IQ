import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { machinesAPI } from '../utils/api';
import { Toast } from '../components/Toast';

const TYPES = ['motor','pump','compressor','conveyor','turbine','generator','hvac','robot'];
const TYPE_LABELS = {motor:'Electric Motor',pump:'Pump',compressor:'Compressor',conveyor:'Conveyor Belt',turbine:'Turbine',generator:'Generator',hvac:'HVAC System',robot:'Industrial Robot'};

function HealthBadge({ status, score }) {
  const cls = status === 'healthy' ? 'badge-green' : status === 'warning' ? 'badge-yellow' : 'badge-red';
  return <span className={'badge ' + cls}><span className="dot"></span>{status} ({score})</span>;
}

function MachineModal({ machine, onClose, onSave }) {
  const isEdit = !!machine?.id;
  const [form, setForm] = useState(machine || { name:'', machine_type:'motor', location:'', manufacturer:'', model_number:'', serial_number:'', install_date: new Date().toISOString().split('T')[0], status:'active', description:'' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = k => e => setForm(p => ({...p, [k]: e.target.value}));

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      if (isEdit) await machinesAPI.update(machine.id, form);
      else await machinesAPI.create(form);
      onSave();
    } catch (err) {
      setError(Object.values(err.response?.data || {}).flat().join(' ') || 'Failed to save machine.');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 style={{fontSize:'15px',fontWeight:'600'}}>{isEdit ? 'Edit Machine' : 'Add New Machine'}</h3>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text2)',fontSize:'18px'}}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="error-msg">{error}</div>}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
              <div className="form-group" style={{gridColumn:'1/-1'}}>
                <label className="form-label">Machine Name *</label>
                <input className="form-input" value={form.name} onChange={set('name')} placeholder="Compressor Unit A1" required />
              </div>
              <div className="form-group">
                <label className="form-label">Type *</label>
                <select className="form-input" value={form.machine_type} onChange={set('machine_type')} required>
                  {TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-input" value={form.status} onChange={set('status')}>
                  <option value="active">Active</option>
                  <option value="maintenance">Under Maintenance</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="form-group" style={{gridColumn:'1/-1'}}>
                <label className="form-label">Location *</label>
                <input className="form-input" value={form.location} onChange={set('location')} placeholder="Plant Floor - Zone A" required />
              </div>
              <div className="form-group">
                <label className="form-label">Manufacturer</label>
                <input className="form-input" value={form.manufacturer} onChange={set('manufacturer')} placeholder="Siemens AG" />
              </div>
              <div className="form-group">
                <label className="form-label">Model Number</label>
                <input className="form-input" value={form.model_number} onChange={set('model_number')} placeholder="M-2400X" />
              </div>
              <div className="form-group">
                <label className="form-label">Serial Number</label>
                <input className="form-input" value={form.serial_number} onChange={set('serial_number')} placeholder="SN-XXXX-YYYY" />
              </div>
              <div className="form-group">
                <label className="form-label">Install Date *</label>
                <input className="form-input" type="date" value={form.install_date} onChange={set('install_date')} required />
              </div>
              <div className="form-group" style={{gridColumn:'1/-1'}}>
                <label className="form-label">Description</label>
                <textarea className="form-input" value={form.description} onChange={set('description')} rows={2} placeholder="Optional notes..." style={{resize:'vertical'}} />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Machine'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Machines() {
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [filter, setFilter] = useState({ status: '', type: '', search: '' });
  const navigate = useNavigate();

  const load = () => machinesAPI.list().then(r => { setMachines(r.data.results || r.data); setLoading(false); });
  useEffect(() => { load(); }, []);

  const handleDelete = async (id, name) => {
    if (!window.confirm('Delete ' + name + '? This cannot be undone.')) return;
    try { await machinesAPI.delete(id); await load(); setToast({ message: 'Machine deleted.', type: 'success' }); }
    catch { setToast({ message: 'Failed to delete machine.', type: 'error' }); }
  };

  const handleSave = async () => { setModal(null); await load(); setToast({ message: 'Machine saved successfully!', type: 'success' }); };

  const filtered = machines.filter(m => {
    if (filter.status && m.status !== filter.status) return false;
    if (filter.type && m.machine_type !== filter.type) return false;
    if (filter.search && !m.name.toLowerCase().includes(filter.search.toLowerCase()) && !m.location.toLowerCase().includes(filter.search.toLowerCase())) return false;
    return true;
  });

  if (loading) return <div className="loading-screen"><div className="spinner"></div><p>Loading machines...</p></div>;

  return (
    <div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      {modal && <MachineModal machine={modal === true ? null : modal} onClose={() => setModal(null)} onSave={handleSave} />}
      <div className="page-header">
        <div><h2>Machine Management</h2><p>{machines.length} machines registered</p></div>
        <button className="btn btn-primary" onClick={() => setModal(true)}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
          Add Machine
        </button>
      </div>
      <div className="page-body">
        <div className="card" style={{marginBottom:'16px',padding:'14px 16px'}}>
          <div style={{display:'flex',gap:'10px',flexWrap:'wrap'}}>
            <input className="form-input" placeholder="Search machines..." value={filter.search}
              onChange={e => setFilter(p => ({...p, search: e.target.value}))} style={{maxWidth:'220px'}} />
            <select className="form-input" value={filter.status} onChange={e => setFilter(p => ({...p, status: e.target.value}))} style={{maxWidth:'160px'}}>
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="maintenance">Maintenance</option>
              <option value="inactive">Inactive</option>
            </select>
            <select className="form-input" value={filter.type} onChange={e => setFilter(p => ({...p, type: e.target.value}))} style={{maxWidth:'180px'}}>
              <option value="">All Types</option>
              {TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
            </select>
          </div>
        </div>

        <div className="machines-grid">
          {filtered.map(m => (
            <div key={m.id} className={'machine-card ' + m.health_status} onClick={() => navigate('/machines/' + m.id)}>
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'10px'}}>
                <div>
                  <div style={{fontSize:'14px',fontWeight:'600',color:'var(--text)',marginBottom:'2px'}}>{m.name}</div>
                  <div style={{fontSize:'11px',color:'var(--text3)'}}>{TYPE_LABELS[m.machine_type]} · {m.location}</div>
                </div>
                <div style={{display:'flex',gap:'6px'}} onClick={e => e.stopPropagation()}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setModal(m)} title="Edit">
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(m.id, m.name)} title="Delete">
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                  </button>
                </div>
              </div>
              <div style={{marginBottom:'10px'}}>
                <HealthBadge status={m.health_status} score={m.health_score} />
              </div>
              <div className="health-gauge" style={{marginBottom:'10px'}}>
                <div className="gauge-bar">
                  <div className={'gauge-fill ' + (m.health_score >= 75 ? 'green' : m.health_score >= 45 ? 'yellow' : 'red')} style={{width: m.health_score + '%'}}></div>
                </div>
                <span style={{fontSize:'12px',color:'var(--text2)',minWidth:'32px'}}>{m.health_score}%</span>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:'11px',color:'var(--text3)'}}>
                <span>Installed: {m.install_date}</span>
                <span className={'badge ' + (m.status === 'active' ? 'badge-green' : 'badge-gray')}>{m.status}</span>
              </div>
            </div>
          ))}
        </div>
        {filtered.length === 0 && <div className="empty-state"><p>No machines match your filters.</p></div>}
      </div>
    </div>
  );
}
