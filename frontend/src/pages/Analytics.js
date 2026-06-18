import React, { useState, useEffect } from 'react';
import { analyticsAPI, machinesAPI } from '../utils/api';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#10b981','#f59e0b','#ef4444','#3b82f6','#8b5cf6','#06b6d4'];
const TT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{background:'#1a2236',border:'1px solid #1e3a5f',borderRadius:'8px',padding:'8px 12px',fontSize:'12px'}}>
      <p style={{color:'var(--text3)',marginBottom:'4px'}}>{label}</p>
      {payload.map(p => <p key={p.name} style={{color:p.color}}>{p.name}: {typeof p.value==='number'?p.value.toFixed(1):p.value}</p>)}
    </div>
  );
};

export default function Analytics() {
  const [dashboard, setDashboard] = useState(null);
  const [health, setHealth] = useState([]);
  const [trends, setTrends] = useState([]);
  const [sensorTrends, setSensorTrends] = useState([]);
  const [machines, setMachines] = useState([]);
  const [selectedMachine, setSelectedMachine] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      analyticsAPI.dashboard(),
      analyticsAPI.healthDistribution(),
      analyticsAPI.predictionTrends(14),
      machinesAPI.list()
    ]).then(([d, h, t, m]) => {
      setDashboard(d.data);
      setHealth(h.data.by_type || []);
      const tData = (t.data.predictions || []).reduce((acc, p) => {
        const day = new Date(p.predicted_at).toLocaleDateString('en', {month:'short',day:'numeric'});
        const existing = acc.find(a => a.date === day);
        if (existing) { existing.count++; existing.avg_prob = ((existing.avg_prob * (existing.count-1)) + p.failure_probability) / existing.count; }
        else acc.push({ date: day, count: 1, avg_prob: p.failure_probability });
        return acc;
      }, []);
      setTrends(tData);
      const ms = m.data.results || m.data;
      setMachines(ms);
      if (ms.length) setSelectedMachine(ms[0].id);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedMachine) return;
    analyticsAPI.sensorTrends(selectedMachine, 24).then(r => {
      const d = (r.data.readings || []).map(x => ({
        ...x,
        time: new Date(x.timestamp).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})
      }));
      setSensorTrends(d);
    });
  }, [selectedMachine]);

  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;

  const pieData = [
    { name: 'Healthy', value: dashboard?.machines?.healthy || 0 },
    { name: 'Warning', value: dashboard?.machines?.warning || 0 },
    { name: 'Critical', value: dashboard?.machines?.critical || 0 },
  ].filter(d => d.value > 0);

  const healthByType = health.map(h => ({ name: h.machine_type, healthy: h.healthy, warning: h.warning, critical: h.critical, avg: Math.round(h.avg_health || 0) }));

  return (
    <div>
      <div className="page-header"><div><h2>Analytics Dashboard</h2><p>Fleet health trends and performance insights</p></div></div>
      <div className="page-body">
        <div className="grid-2" style={{marginBottom:'16px'}}>
          <div className="card">
            <div className="card-header"><div className="card-title">Health Distribution</div><div className="card-sub">Current fleet status</div></div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({name,value})=>`${name}: ${value}`} labelLine={false}>
                  {pieData.map((_, i) => <Cell key={i} fill={['#10b981','#f59e0b','#ef4444'][i]}/>)}
                </Pie>
                <Tooltip contentStyle={{background:'#1a2236',border:'1px solid #1e3a5f',borderRadius:'8px',fontSize:'12px'}}/>
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <div className="card-header"><div className="card-title">Health by Machine Type</div></div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={healthByType} margin={{left:-20}}>
                <XAxis dataKey="name" tick={{fontSize:10,fill:'var(--text3)'}}/>
                <YAxis tick={{fontSize:10,fill:'var(--text3)'}}/>
                <Tooltip content={<TT/>}/>
                <Legend wrapperStyle={{fontSize:'11px'}}/>
                <Bar dataKey="healthy" fill="#10b981" stackId="a"/>
                <Bar dataKey="warning" fill="#f59e0b" stackId="a"/>
                <Bar dataKey="critical" fill="#ef4444" stackId="a" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card" style={{marginBottom:'16px'}}>
          <div className="card-header"><div className="card-title">Prediction Trends — Last 14 Days</div><div className="card-sub">Average failure probability over time</div></div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trends} margin={{left:-10,right:20}}>
              <XAxis dataKey="date" tick={{fontSize:10,fill:'var(--text3)'}}/>
              <YAxis tick={{fontSize:10,fill:'var(--text3)'}}/>
              <Tooltip content={<TT/>}/>
              <Legend wrapperStyle={{fontSize:'11px'}}/>
              <Line type="monotone" dataKey="avg_prob" stroke="#ef4444" name="Avg Failure %" strokeWidth={2} dot={{r:3}}/>
              <Line type="monotone" dataKey="count" stroke="#3b82f6" name="Predictions Run" strokeWidth={2} dot={{r:3}}/>
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-header">
            <div><div className="card-title">Multi-Sensor Trend Chart</div><div className="card-sub">24h history</div></div>
            <select className="form-input" style={{maxWidth:'200px'}} value={selectedMachine} onChange={e=>setSelectedMachine(e.target.value)}>
              {machines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'12px'}}>
            {[
              {key:'temperature',label:'Temperature (°C)',color:'#f97316'},
              {key:'vibration',label:'Vibration (mm/s)',color:'#8b5cf6'},
              {key:'pressure',label:'Pressure (Bar)',color:'#06b6d4'},
            ].map(cfg => (
              <div key={cfg.key}>
                <div style={{fontSize:'12px',fontWeight:'500',color:cfg.color,marginBottom:'6px'}}>{cfg.label}</div>
                <ResponsiveContainer width="100%" height={130}>
                  <LineChart data={sensorTrends} margin={{left:-25,right:5,top:5}}>
                    <XAxis dataKey="time" tick={{fontSize:9,fill:'var(--text3)'}} interval={Math.floor(sensorTrends.length/4)}/>
                    <YAxis tick={{fontSize:9,fill:'var(--text3)'}}/>
                    <Tooltip contentStyle={{background:'#1a2236',border:'1px solid #1e3a5f',borderRadius:'6px',fontSize:'11px'}}/>
                    <Line type="monotone" dataKey={cfg.key} stroke={cfg.color} dot={false} strokeWidth={1.5}/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
