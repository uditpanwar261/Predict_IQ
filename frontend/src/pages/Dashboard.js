import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyticsAPI, sensorsAPI } from '../utils/api';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

function StatCard({ label, value, sub, color, icon }) {
  return (
    <div className={'stat-card ' + color}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
      <div className="stat-icon">{icon}</div>
    </div>
  );
}

const HEALTH_COLORS = { healthy: '#10b981', warning: '#f59e0b', critical: '#ef4444' };

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const navigate = useNavigate();

  const load = () => analyticsAPI.dashboard().then(r => { setData(r.data); setLoading(false); });

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, []);

  const handleSimulateAll = async () => {
    setSimulating(true);
    try { await sensorsAPI.simulateAll(); await load(); } finally { setSimulating(false); }
  };

  if (loading) return <div className="loading-screen"><div className="spinner"></div><p>Loading dashboard...</p></div>;

  const machines = data?.machines || {};
  const alerts = data?.alerts || {};
  const pieData = [
    { name: 'Healthy', value: machines.healthy || 0 },
    { name: 'Warning', value: machines.warning || 0 },
    { name: 'Critical', value: machines.critical || 0 },
  ].filter(d => d.value > 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p>Real-time fleet health overview</p>
        </div>
        <button className="btn btn-primary" onClick={handleSimulateAll} disabled={simulating}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
          {simulating ? 'Simulating...' : 'Simulate All Sensors'}
        </button>
      </div>
      <div className="page-body">
        <div className="stats-grid">
          <StatCard label="Total Machines" value={machines.total || 0} sub="Across all locations" color="blue"
            icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" width="32" height="32"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>}
          />
          <StatCard label="Avg Health Score" value={data?.average_health_score + '%'} sub={machines.healthy + ' machines healthy'} color="green"
            icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" width="32" height="32"><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>}
          />
          <StatCard label="Active Alerts" value={alerts.active || 0} sub={alerts.critical + ' critical'} color="red"
            icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" width="32" height="32"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>}
          />
          <StatCard label="Predictions Today" value={data?.predictions_today || 0} sub="ML inference runs" color="blue"
            icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" width="32" height="32"><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>}
          />
        </div>

        <div className="grid-2" style={{marginBottom:'16px'}}>
          <div className="card">
            <div className="card-header">
              <div><div className="card-title">Fleet Health Distribution</div><div className="card-sub">By status</div></div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:'20px'}}>
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                    {pieData.map((d, i) => <Cell key={i} fill={HEALTH_COLORS[d.name.toLowerCase()]} />)}
                  </Pie>
                  <Tooltip contentStyle={{background:'#1a2236',border:'1px solid #1e3a5f',borderRadius:'8px',color:'#e8f0fe',fontSize:'12px'}}/>
                </PieChart>
              </ResponsiveContainer>
              <div style={{flex:1}}>
                {[['Healthy', machines.healthy, '#10b981'], ['Warning', machines.warning, '#f59e0b'], ['Critical', machines.critical, '#ef4444']].map(([l,v,c]) => (
                  <div key={l} style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'10px'}}>
                    <div style={{width:'10px',height:'10px',borderRadius:'50%',background:c,flexShrink:0}}></div>
                    <span style={{fontSize:'13px',color:'var(--text2)',flex:1}}>{l}</span>
                    <span style={{fontSize:'16px',fontWeight:'600',color:'var(--text)'}}>{v || 0}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div><div className="card-title">High Risk Machines</div><div className="card-sub">Top failure probability</div></div>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/predictions')}>View all</button>
            </div>
            {(data?.high_risk_machines || []).length === 0 ? (
              <div className="empty-state"><p>No high-risk machines detected</p></div>
            ) : (data?.high_risk_machines || []).map(m => (
              <div key={m.machine_id} onClick={() => navigate('/machines/' + m.machine_id)}
                style={{display:'flex',alignItems:'center',gap:'12px',padding:'10px',borderRadius:'8px',cursor:'pointer',marginBottom:'6px',background:'var(--bg3)'}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:'13px',fontWeight:'500',color:'var(--text)',marginBottom:'4px'}}>{m.machine_name}</div>
                  <div className="prob-meter">
                    <div className="prob-bar">
                      <div className={'prob-fill ' + (m.failure_probability > 70 ? 'high' : m.failure_probability > 45 ? 'medium' : 'low')}
                        style={{width: m.failure_probability + '%'}}></div>
                    </div>
                  </div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:'18px',fontWeight:'700',color: m.failure_probability > 70 ? 'var(--red)' : 'var(--yellow)'}}>{m.failure_probability}%</div>
                  {m.will_fail_soon && <div style={{fontSize:'10px',color:'var(--red)'}}>FAIL SOON</div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div><div className="card-title">Recent Alerts</div><div className="card-sub">Active issues requiring attention</div></div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/alerts')}>View all</button>
          </div>
          {(data?.recent_alerts || []).length === 0 ? (
            <div className="empty-state"><svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg><p>No active alerts — all systems normal</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Machine</th><th>Alert</th><th>Severity</th><th>Time</th></tr></thead>
                <tbody>
                  {(data?.recent_alerts || []).map(a => (
                    <tr key={a.id}>
                      <td style={{fontWeight:'500'}}>{a.machine_name}</td>
                      <td style={{color:'var(--text2)'}}>{a.title}</td>
                      <td><span className={'badge badge-' + (a.severity === 'critical' ? 'red' : a.severity === 'warning' ? 'yellow' : 'blue')}><span className="dot"></span>{a.severity}</span></td>
                      <td style={{color:'var(--text3)',fontSize:'12px'}}>{new Date(a.created_at).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
