import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { machinesAPI, sensorsAPI, predictionsAPI, reportsAPI } from '../utils/api';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Toast } from '../components/Toast';

const SENSOR_CONFIG = [
  { key: 'temperature', label: 'Temperature', unit: '°C', warnAt: 90, critAt: 110, color: '#f97316' },
  { key: 'vibration', label: 'Vibration', unit: 'mm/s', warnAt: 5, critAt: 8, color: '#8b5cf6' },
  { key: 'pressure', label: 'Pressure', unit: 'Bar', warnAt: null, critAt: null, color: '#06b6d4' },
  { key: 'current', label: 'Current', unit: 'A', warnAt: null, critAt: null, color: '#3b82f6' },
  { key: 'rpm', label: 'RPM', unit: 'rpm', warnAt: null, critAt: null, color: '#10b981' },
  { key: 'oil_level', label: 'Oil Level', unit: '%', warnAt: 40, critAt: 20, color: '#f59e0b' },
  { key: 'noise_level', label: 'Noise', unit: 'dB', warnAt: null, critAt: null, color: '#ec4899' },
];

function SensorCard({ config, value, isAnomaly }) {
  const isWarn = config.warnAt && value < config.warnAt && config.key === 'oil_level';
  const isCrit = config.critAt && value < config.critAt && config.key === 'oil_level';
  const isWarnHigh = config.warnAt && value > config.warnAt && config.key !== 'oil_level';
  const isCritHigh = config.critAt && value > config.critAt && config.key !== 'oil_level';
  const alert = isCrit || isCritHigh ? 'critical' : isWarn || isWarnHigh ? 'warn' : '';
  return (
    <div className={'sensor-item' + (isAnomaly ? ' anomaly' : '')} style={{borderTop: '2px solid ' + config.color}}>
      <div className="sensor-name">{config.label}</div>
      <div className="sensor-val" style={{color: alert === 'critical' ? 'var(--red)' : alert === 'warn' ? 'var(--yellow)' : 'var(--text)'}}>
        {value != null ? value.toFixed(1) : '—'}
      </div>
      <div className="sensor-unit">{config.unit} {isAnomaly && '⚠'}</div>
    </div>
  );
}

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{background:'#1a2236',border:'1px solid #1e3a5f',borderRadius:'8px',padding:'8px 12px',fontSize:'12px'}}>
      <p style={{color:'var(--text3)',marginBottom:'4px'}}>{new Date(label).toLocaleTimeString()}</p>
      {payload.map(p => <p key={p.dataKey} style={{color: p.color}}>{p.name}: {Number(p.value).toFixed(2)}</p>)}
    </div>
  );
};

export default function MachineDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState([]);
  const [chartSensor, setChartSensor] = useState('temperature');
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [predicting, setPredicting] = useState(false);
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const loadData = useCallback(async () => {
    try {
      const [sumRes, trendRes] = await Promise.all([
        machinesAPI.summary(id),
        import('../utils/api').then(m => m.analyticsAPI.sensorTrends(id, 12))
      ]);
      setSummary(sumRes.data);
      setTrends(trendRes.data.readings || []);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { loadData(); const t = setInterval(loadData, 15000); return () => clearInterval(t); }, [loadData]);

  const handleSimulate = async () => {
    setSimulating(true);
    try { await sensorsAPI.simulate(id); await loadData(); setToast({ message: 'Sensor reading simulated!', type: 'success' }); }
    catch { setToast({ message: 'Simulation failed.', type: 'error' }); }
    finally { setSimulating(false); }
  };

  const handlePredict = async () => {
    setPredicting(true);
    try { const r = await predictionsAPI.run(id); await loadData(); setToast({ message: 'Prediction complete! Failure probability: ' + r.data.failure_probability + '%', type: 'success' }); }
    catch(e) { setToast({ message: e.response?.data?.error || 'Prediction failed.', type: 'error' }); }
    finally { setPredicting(false); }
  };

  const downloadReport = (type) => {
    const url = type === 'pdf' ? reportsAPI.pdf(id) : reportsAPI.sensorCSV(id);
    const a = document.createElement('a'); a.href = 'http://localhost:8000' + url.replace('http://localhost:8000', '');
    a.href = url; a.download = ''; a.click();
  };

  if (loading) return <div className="loading-screen"><div className="spinner"></div><p>Loading machine data...</p></div>;
  if (!summary) return <div className="loading-screen"><p>Machine not found.</p></div>;

  const { machine, latest_reading, latest_prediction, active_alerts } = summary;
  const prob = latest_prediction?.failure_probability || 0;
  const probClass = prob > 70 ? 'high' : prob > 40 ? 'medium' : 'low';
  const chartData = trends.map(r => ({ ...r, time: new Date(r.timestamp).getTime() }));

  return (
    <div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <div className="page-header">
        <div>
          <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'4px'}}>
            <button onClick={() => navigate('/machines')} className="btn btn-ghost btn-sm">← Back</button>
            <h2>{machine.name}</h2>
            <span className={'badge ' + (machine.health_status === 'healthy' ? 'badge-green' : machine.health_status === 'warning' ? 'badge-yellow' : 'badge-red')}>
              <span className="dot"></span>{machine.health_status}
            </span>
          </div>
          <p>{machine.location} · {machine.machine_type}</p>
        </div>
        <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
          <button className="btn btn-ghost btn-sm" onClick={() => downloadReport('csv')}>↓ CSV</button>
          <button className="btn btn-ghost btn-sm" onClick={() => downloadReport('pdf')}>↓ PDF Report</button>
          <button className="btn btn-ghost" onClick={handleSimulate} disabled={simulating}>
            {simulating ? 'Simulating...' : '⚡ Simulate'}
          </button>
          <button className="btn btn-primary" onClick={handlePredict} disabled={predicting}>
            {predicting ? 'Running ML...' : '🧠 Run Prediction'}
          </button>
        </div>
      </div>

      <div className="page-body">
        <div className="stats-grid" style={{gridTemplateColumns:'repeat(4,1fr)'}}>
          <div className="stat-card blue">
            <div className="stat-label">Health Score</div>
            <div className="stat-value">{machine.health_score}</div>
            <div className="health-gauge" style={{marginTop:'6px'}}>
              <div className="gauge-bar"><div className={'gauge-fill ' + (machine.health_score >= 75 ? 'green' : machine.health_score >= 45 ? 'yellow' : 'red')} style={{width:machine.health_score+'%'}}></div></div>
            </div>
          </div>
          <div className="stat-card red">
            <div className="stat-label">Failure Probability</div>
            <div className="stat-value" style={{color: prob > 70 ? 'var(--red)' : prob > 40 ? 'var(--yellow)' : 'var(--green)'}}>{prob}%</div>
            <div className="prob-meter" style={{marginTop:'6px'}}><div className="prob-bar"><div className={'prob-fill ' + probClass} style={{width:prob+'%'}}></div></div></div>
          </div>
          <div className="stat-card yellow">
            <div className="stat-label">Active Alerts</div>
            <div className="stat-value">{active_alerts}</div>
            <div className="stat-sub">{active_alerts > 0 ? 'Requires attention' : 'All clear'}</div>
          </div>
          <div className="stat-card green">
            <div className="stat-label">Est. Days to Failure</div>
            <div className="stat-value">{latest_prediction?.estimated_days_to_failure ?? '—'}</div>
            <div className="stat-sub">{latest_prediction?.will_fail_within_7days ? '⚠ Within 7 days' : 'No imminent failure'}</div>
          </div>
        </div>

        <div className="tabs">
          {['overview','sensors','chart','predictions'].map(t => (
            <button key={t} className={'tab' + (activeTab===t?' active':'')} onClick={() => setActiveTab(t)}>
              {t.charAt(0).toUpperCase()+t.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="grid-2">
            <div className="card">
              <div className="card-header"><div className="card-title">AI Maintenance Recommendations</div></div>
              {(latest_prediction?.recommendations || []).length === 0 ? (
                <div className="empty-state"><p>Run a prediction to get AI recommendations.</p></div>
              ) : (latest_prediction.recommendations).map((rec, i) => (
                <div key={i} style={{display:'flex',gap:'10px',padding:'10px',background:'var(--bg3)',borderRadius:'8px',marginBottom:'8px',fontSize:'13px',color:'var(--text2)'}}>
                  <span style={{flexShrink:0}}>{rec.split(' ')[0]}</span>
                  <span>{rec.slice(rec.indexOf(' ')+1)}</span>
                </div>
              ))}
            </div>
            <div className="card">
              <div className="card-header"><div className="card-title">Machine Info</div></div>
              <table style={{width:'100%'}}>
                <tbody>
                  {[['Type', machine.machine_type],['Location', machine.location],['Status', machine.status],['Manufacturer', machine.manufacturer || '—'],['Model', machine.model_number || '—'],['Serial', machine.serial_number || '—'],['Installed', machine.install_date]].map(([k,v]) => (
                    <tr key={k}><td style={{color:'var(--text3)',width:'40%',fontSize:'12px',paddingLeft:0}}>{k}</td><td style={{fontWeight:'500',fontSize:'13px'}}>{v}</td></tr>
                  ))}
                </tbody>
              </table>
              {machine.description && <p style={{marginTop:'12px',fontSize:'12px',color:'var(--text2)',lineHeight:'1.5'}}>{machine.description}</p>}
            </div>
          </div>
        )}

        {activeTab === 'sensors' && (
          <div className="card">
            <div className="card-header">
              <div><div className="card-title">Live Sensor Readings</div>
              <div className="card-sub">{latest_reading ? 'Last updated: ' + new Date(latest_reading.timestamp).toLocaleString() : 'No data yet'}</div></div>
              <button className="btn btn-primary btn-sm" onClick={handleSimulate} disabled={simulating}>{simulating ? '...' : '⚡ Refresh'}</button>
            </div>
            <div className="sensor-grid">
              {SENSOR_CONFIG.map(cfg => (
                <SensorCard key={cfg.key} config={cfg} value={latest_reading?.[cfg.key]} isAnomaly={latest_reading?.is_anomaly} />
              ))}
            </div>
            {latest_reading?.is_anomaly && (
              <div style={{marginTop:'12px',padding:'10px 14px',background:'var(--red-bg)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:'8px',fontSize:'13px',color:'var(--red)'}}>
                ⚠ Anomaly detected — anomaly score: {latest_reading.anomaly_score?.toFixed(3)}
              </div>
            )}
          </div>
        )}

        {activeTab === 'chart' && (
          <div className="card">
            <div className="card-header">
              <div><div className="card-title">Sensor Trend — Last 12h</div></div>
              <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
                {SENSOR_CONFIG.map(cfg => (
                  <button key={cfg.key} className={'btn btn-sm ' + (chartSensor === cfg.key ? 'btn-primary' : 'btn-ghost')}
                    onClick={() => setChartSensor(cfg.key)} style={chartSensor===cfg.key?{background:cfg.color,borderColor:cfg.color}:{}}>
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="chart-wrap" style={{height:'280px'}}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{top:5,right:20,left:0,bottom:5}}>
                  <XAxis dataKey="time" type="number" domain={['dataMin','dataMax']} tickFormatter={t => new Date(t).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})} scale="time" />
                  <YAxis />
                  <Tooltip content={<ChartTooltip />} />
                  {trends.some(r => r.is_anomaly) && chartData.filter(r=>r.is_anomaly).map((r,i) => (
                    <ReferenceLine key={i} x={r.time} stroke="rgba(239,68,68,0.4)" strokeDasharray="3 3" />
                  ))}
                  <Line type="monotone" dataKey={chartSensor} stroke={SENSOR_CONFIG.find(c=>c.key===chartSensor)?.color || '#3b82f6'} dot={false} strokeWidth={2} name={SENSOR_CONFIG.find(c=>c.key===chartSensor)?.label} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div style={{fontSize:'11px',color:'var(--text3)',marginTop:'6px'}}>Red vertical lines indicate detected anomalies</div>
          </div>
        )}

        {activeTab === 'predictions' && (
          <div className="card">
            <div className="card-header">
              <div className="card-title">Contributing Factors</div>
              <button className="btn btn-primary btn-sm" onClick={handlePredict} disabled={predicting}>{predicting ? 'Running...' : '🧠 Run New Prediction'}</button>
            </div>
            {!latest_prediction ? (
              <div className="empty-state"><p>No predictions yet. Click "Run Prediction" to analyze this machine.</p></div>
            ) : (
              <div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'16px'}}>
                  <div style={{padding:'16px',background:'var(--bg3)',borderRadius:'10px',textAlign:'center'}}>
                    <div style={{fontSize:'11px',color:'var(--text3)',marginBottom:'6px',textTransform:'uppercase',letterSpacing:'0.06em'}}>Failure Probability</div>
                    <div style={{fontSize:'36px',fontWeight:'700',color:prob>70?'var(--red)':prob>40?'var(--yellow)':'var(--green)'}}>{prob}%</div>
                    <div className="prob-meter" style={{marginTop:'8px'}}><div className="prob-bar" style={{height:'10px'}}><div className={'prob-fill '+probClass} style={{width:prob+'%'}}></div></div></div>
                  </div>
                  <div style={{padding:'16px',background:'var(--bg3)',borderRadius:'10px',textAlign:'center'}}>
                    <div style={{fontSize:'11px',color:'var(--text3)',marginBottom:'6px',textTransform:'uppercase',letterSpacing:'0.06em'}}>Confidence Score</div>
                    <div style={{fontSize:'36px',fontWeight:'700',color:'var(--blue)'}}>{latest_prediction.confidence_score}%</div>
                    <div style={{fontSize:'12px',color:'var(--text3)',marginTop:'6px'}}>{latest_prediction.will_fail_within_7days ? '⚠ Will fail within 7 days' : '✓ No imminent failure'}</div>
                  </div>
                </div>
                <div className="card-title" style={{marginBottom:'10px'}}>Feature Importance</div>
                {Object.entries(latest_prediction.contributing_factors || {}).map(([feat, score]) => (
                  <div key={feat} style={{marginBottom:'8px'}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:'3px'}}>
                      <span style={{fontSize:'12px',color:'var(--text2)'}}>{feat.replace(/_/g,' ')}</span>
                      <span style={{fontSize:'12px',color:'var(--text)',fontWeight:'500'}}>{score}%</span>
                    </div>
                    <div className="gauge-bar"><div className="gauge-fill green" style={{width:score+'%',background:'var(--purple)'}}></div></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
