import React, { useState, useEffect } from 'react';
import { alertsAPI, reportsAPI } from '../utils/api';
import { Toast } from '../components/Toast';

function SeverityIcon({ severity }) {
  const color = severity === 'critical' ? 'var(--red)' : severity === 'warning' ? 'var(--yellow)' : 'var(--blue)';
  return (
    <div className={'alert-icon ' + severity}>
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        {severity === 'critical'
          ? <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          : <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        }
      </svg>
    </div>
  );
}

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [filter, setFilter] = useState({ severity: '', status: 'active' });

  const load = async () => {
    const [aRes, sRes] = await Promise.all([
      alertsAPI.list({ severity: filter.severity, status: filter.status }),
      alertsAPI.summary()
    ]);
    setAlerts(aRes.data.results || aRes.data);
    setSummary(sRes.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const handleAction = async (id, action) => {
    try {
      if (action === 'acknowledge') await alertsAPI.acknowledge(id);
      else await alertsAPI.resolve(id);
      await load();
      setToast({ message: 'Alert ' + action + 'd.', type: 'success' });
    } catch { setToast({ message: 'Action failed.', type: 'error' }); }
  };

  const TYPE_LABELS = { threshold_breach:'Threshold Breach', anomaly_detected:'Anomaly Detected', failure_imminent:'Failure Imminent', maintenance_due:'Maintenance Due', health_degraded:'Health Degraded' };

  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;

  return (
    <div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <div className="page-header">
        <div><h2>Alert Center</h2><p>{summary.active || 0} active alerts</p></div>
        <button className="btn btn-ghost btn-sm" onClick={() => { const url = reportsAPI.alertsCSV(); const a = document.createElement('a'); a.href=url; a.download=''; a.click(); }}>
          ↓ Export CSV
        </button>
      </div>
      <div className="page-body">
        <div className="stats-grid" style={{gridTemplateColumns:'repeat(4,1fr)',marginBottom:'16px'}}>
          {[['Total', summary.total||0,'blue'],['Active', summary.active||0,'yellow'],['Critical', summary.critical||0,'red'],['Warning', summary.warning||0,'yellow']].map(([l,v,c]) => (
            <div key={l} className={'stat-card '+c}><div className="stat-label">{l}</div><div className="stat-value">{v}</div></div>
          ))}
        </div>

        <div className="card" style={{marginBottom:'14px',padding:'12px 16px'}}>
          <div style={{display:'flex',gap:'10px',flexWrap:'wrap'}}>
            <select className="form-input" style={{maxWidth:'160px'}} value={filter.status} onChange={e => setFilter(p=>({...p,status:e.target.value}))}>
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="resolved">Resolved</option>
            </select>
            <select className="form-input" style={{maxWidth:'160px'}} value={filter.severity} onChange={e => setFilter(p=>({...p,severity:e.target.value}))}>
              <option value="">All Severities</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>
          </div>
        </div>

        {alerts.length === 0 ? (
          <div className="empty-state" style={{paddingTop:'80px'}}>
            <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <p style={{fontSize:'15px',fontWeight:'500',color:'var(--text)',marginTop:'8px'}}>No alerts found</p>
            <p style={{marginTop:'4px'}}>All systems operating normally</p>
          </div>
        ) : alerts.map(a => (
          <div key={a.id} className={'alert-item ' + a.severity} style={{marginBottom:'8px'}}>
            <SeverityIcon severity={a.severity} />
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:'10px',flexWrap:'wrap'}}>
                <div>
                  <div style={{fontSize:'13px',fontWeight:'600',color:'var(--text)',marginBottom:'2px'}}>{a.title}</div>
                  <div style={{fontSize:'12px',color:'var(--text2)',marginBottom:'4px'}}>{a.message}</div>
                  <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                    <span className={'badge ' + (a.severity==='critical'?'badge-red':a.severity==='warning'?'badge-yellow':'badge-blue')}>{a.severity}</span>
                    <span className="badge badge-gray">{TYPE_LABELS[a.alert_type] || a.alert_type}</span>
                    <span style={{fontSize:'11px',color:'var(--text3)'}}>{a.machine_name}</span>
                    <span style={{fontSize:'11px',color:'var(--text3)'}}>{new Date(a.created_at).toLocaleString()}</span>
                  </div>
                </div>
                <div style={{display:'flex',gap:'6px',flexShrink:0}}>
                  {a.status === 'active' && (
                    <button className="btn btn-ghost btn-sm" onClick={() => handleAction(a.id,'acknowledge')}>Acknowledge</button>
                  )}
                  {a.status !== 'resolved' && (
                    <button className="btn btn-success btn-sm" onClick={() => handleAction(a.id,'resolve')}>Resolve</button>
                  )}
                  {a.status === 'resolved' && <span className="badge badge-green">Resolved</span>}
                  {a.status === 'acknowledged' && <span className="badge badge-blue">Acknowledged</span>}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
