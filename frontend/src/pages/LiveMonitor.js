import React, { useState, useEffect } from 'react';
import { sensorsAPI, machinesAPI } from '../utils/api';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#ec4899'];

export default function LiveMonitor() {
  const [machines, setMachines] = useState([]);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [readings, setReadings] = useState([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [interval_s, setIntervalS] = useState(10);

  useEffect(() => { machinesAPI.list().then(r => { const ms = r.data.results || r.data; setMachines(ms); if (ms.length) setSelectedMachine(ms[0].id); }); }, []);

  const loadReadings = async (mid) => {
    if (!mid) return;
    const r = await sensorsAPI.readings({ machine: mid, limit: 60 });
    setReadings((r.data.results || r.data).reverse());
  };

  const simulateAndLoad = async () => {
    if (!selectedMachine) return;
    setRefreshing(true);
    try { await sensorsAPI.simulate(selectedMachine); await loadReadings(selectedMachine); }
    finally { setRefreshing(false); }
  };

  useEffect(() => { if (selectedMachine) loadReadings(selectedMachine); }, [selectedMachine]);

  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(() => simulateAndLoad(), interval_s * 1000);
    return () => clearInterval(t);
  }, [autoRefresh, selectedMachine, interval_s]);

  const latest = readings[readings.length - 1];
  const chartData = readings.map(r => ({ ...r, time: new Date(r.timestamp).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'}) }));

  const sensors = [
    { key:'temperature', label:'Temperature', unit:'°C', color:'#f97316' },
    { key:'vibration', label:'Vibration', unit:'mm/s', color:'#8b5cf6' },
    { key:'pressure', label:'Pressure', unit:'Bar', color:'#06b6d4' },
    { key:'current', label:'Current', unit:'A', color:'#3b82f6' },
    { key:'rpm', label:'RPM', unit:'rpm', color:'#10b981' },
    { key:'oil_level', label:'Oil Level', unit:'%', color:'#f59e0b' },
  ];

  return (
    <div>
      <div className="page-header">
        <div><h2>Live Sensor Monitor</h2><p>Real-time IoT data simulation with auto-refresh</p></div>
        <div style={{display:'flex',gap:'8px',alignItems:'center',flexWrap:'wrap'}}>
          <select className="form-input" style={{maxWidth:'200px'}} value={selectedMachine || ''} onChange={e => setSelectedMachine(Number(e.target.value))}>
            {machines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <select className="form-input" style={{maxWidth:'130px'}} value={interval_s} onChange={e => setIntervalS(Number(e.target.value))}>
            <option value={5}>Every 5s</option>
            <option value={10}>Every 10s</option>
            <option value={30}>Every 30s</option>
            <option value={60}>Every 60s</option>
          </select>
          <button className={'btn ' + (autoRefresh ? 'btn-success' : 'btn-ghost')} onClick={() => setAutoRefresh(p => !p)}>
            {autoRefresh ? '⏸ Pause' : '▶ Auto Refresh'}
          </button>
          <button className="btn btn-primary" onClick={simulateAndLoad} disabled={refreshing}>
            {refreshing ? <span className="spinner" style={{width:'14px',height:'14px'}}></span> : '⚡'} Simulate
          </button>
        </div>
      </div>
      <div className="page-body">
        {autoRefresh && (
          <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'12px',padding:'8px 14px',background:'rgba(16,185,129,0.08)',border:'1px solid rgba(16,185,129,0.2)',borderRadius:'8px',fontSize:'12px',color:'var(--green)'}}>
            <div className="dot pulse" style={{background:'var(--green)',width:'8px',height:'8px'}}></div>
            Auto-refreshing every {interval_s}s — simulating virtual IoT sensors
          </div>
        )}

        <div className="sensor-grid" style={{marginBottom:'16px'}}>
          {sensors.map(s => {
            const val = latest?.[s.key];
            const isAnomaly = latest?.is_anomaly;
            return (
              <div key={s.key} className={'sensor-item' + (isAnomaly ? ' anomaly' : '')} style={{borderTop:'2px solid '+s.color}}>
                <div className="sensor-name">{s.label}</div>
                <div className="sensor-val" style={{color: s.color}}>
                  {val != null ? val.toFixed(1) : '—'}
                </div>
                <div className="sensor-unit">{s.unit}</div>
                {isAnomaly && <div style={{fontSize:'10px',color:'var(--red)',marginTop:'3px'}}>ANOMALY</div>}
              </div>
            );
          })}
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px'}}>
          {[
            {key:'temperature', label:'Temperature Trend', unit:'°C', color:'#f97316'},
            {key:'vibration', label:'Vibration Trend', unit:'mm/s', color:'#8b5cf6'},
            {key:'pressure', label:'Pressure Trend', unit:'Bar', color:'#06b6d4'},
            {key:'oil_level', label:'Oil Level Trend', unit:'%', color:'#f59e0b'},
          ].map(cfg => (
            <div key={cfg.key} className="card">
              <div className="card-header">
                <div className="card-title" style={{color:cfg.color}}>{cfg.label}</div>
                <span style={{fontSize:'11px',color:'var(--text3)'}}>{cfg.unit}</span>
              </div>
              <div style={{height:'150px'}}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{top:0,right:10,left:-20,bottom:0}}>
                    <XAxis dataKey="time" tick={{fontSize:9,fill:'var(--text3)'}} interval="preserveStartEnd" />
                    <YAxis tick={{fontSize:9,fill:'var(--text3)'}} />
                    <Tooltip contentStyle={{background:'#1a2236',border:'1px solid #1e3a5f',borderRadius:'6px',fontSize:'11px'}} />
                    <Line type="monotone" dataKey={cfg.key} stroke={cfg.color} dot={false} strokeWidth={1.5} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>

        <div className="card" style={{marginTop:'14px'}}>
          <div className="card-header"><div className="card-title">Recent Readings Log</div><span style={{fontSize:'11px',color:'var(--text3)'}}>{readings.length} readings</span></div>
          <div className="table-wrap" style={{maxHeight:'280px',overflowY:'auto'}}>
            <table>
              <thead><tr><th>Time</th><th>Temp °C</th><th>Vibr mm/s</th><th>Pres Bar</th><th>Curr A</th><th>RPM</th><th>Oil %</th><th>Status</th></tr></thead>
              <tbody>
                {[...readings].reverse().slice(0,30).map((r,i) => (
                  <tr key={i}>
                    <td style={{fontFamily:'monospace',fontSize:'11px'}}>{new Date(r.timestamp).toLocaleTimeString()}</td>
                    <td>{r.temperature?.toFixed(1)}</td>
                    <td>{r.vibration?.toFixed(2)}</td>
                    <td>{r.pressure?.toFixed(1)}</td>
                    <td>{r.current?.toFixed(1)}</td>
                    <td>{r.rpm?.toFixed(0)}</td>
                    <td>{r.oil_level?.toFixed(1)}</td>
                    <td>{r.is_anomaly ? <span className="badge badge-red"><span className="dot"></span>anomaly</span> : <span className="badge badge-green"><span className="dot"></span>normal</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
