import React, { useState } from 'react';
import api from '../utils/api';

const FIELDS = [
  { key: 'temperature', label: 'Temperature',  unit: '°C',   min: 0,   max: 300,   step: 0.1, placeholder: 'e.g. 75.5',  icon: '🌡️', hint: 'Normal: 40–85 °C' },
  { key: 'vibration',   label: 'Vibration',    unit: 'mm/s', min: 0,   max: 50,    step: 0.01,placeholder: 'e.g. 2.8',   icon: '📳', hint: 'Normal: 0–4 mm/s' },
  { key: 'pressure',    label: 'Pressure',     unit: 'Bar',  min: 0,   max: 100,   step: 0.1, placeholder: 'e.g. 6.2',   icon: '💨', hint: 'Normal: 3–15 Bar' },
  { key: 'current',     label: 'Current',      unit: 'A',    min: 0,   max: 200,   step: 0.1, placeholder: 'e.g. 15.0',  icon: '⚡', hint: 'Normal: 5–30 A' },
  { key: 'rpm',         label: 'RPM',          unit: 'rpm',  min: 0,   max: 10000, step: 1,   placeholder: 'e.g. 1450',  icon: '🔄', hint: 'Normal: 800–3000 rpm' },
  { key: 'oil_level',   label: 'Oil Level',    unit: '%',    min: 0,   max: 100,   step: 0.1, placeholder: 'e.g. 82.0',  icon: '🔧', hint: 'Normal: 50–100 %' },
  { key: 'noise_level', label: 'Noise Level',  unit: 'dB',   min: 0,   max: 150,   step: 0.1, placeholder: 'e.g. 72.0',  icon: '🔊', hint: 'Normal: 50–85 dB' },
];

const DEMO_CASES = [
  { label: 'Healthy Machine',  color: '#10b981', values: { temperature: 67.2, vibration: 2.1, pressure: 6.3, current: 14.8, rpm: 1460, oil_level: 87.0, noise_level: 71.5 } },
  { label: 'Warning State',    color: '#f59e0b', values: { temperature: 85.4, vibration: 4.8, pressure: 5.1, current: 19.2, rpm: 1370, oil_level: 58.0, noise_level: 80.3 } },
  { label: 'Critical Failure', color: '#ef4444', values: { temperature: 118.0, vibration: 9.2, pressure: 3.1, current: 29.5, rpm: 1150, oil_level: 18.0, noise_level: 95.0 } },
];

function GaugeMeter({ value, max = 100 }) {
  const pct = Math.min(100, (value / max) * 100);
  const color = value < 30 ? '#10b981' : value < 60 ? '#f59e0b' : '#ef4444';
  const r = 54, circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width="140" height="90" viewBox="0 0 140 90">
      <path d="M 14 76 A 56 56 0 0 1 126 76" fill="none" stroke="#1e3a5f" strokeWidth="10" strokeLinecap="round" />
      <path d="M 14 76 A 56 56 0 0 1 126 76" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
        strokeDasharray={`${(pct/100) * 175.9} 175.9`} style={{transition:'stroke-dasharray 0.7s ease'}} />
      <text x="70" y="68" textAnchor="middle" fill="white" fontSize="22" fontWeight="700" fontFamily="monospace">{Math.round(value)}%</text>
      <text x="70" y="82" textAnchor="middle" fill="#8ba4c7" fontSize="9">failure probability</text>
    </svg>
  );
}

export default function Predictions() {
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }));
    setErrors(p => { const n = {...p}; delete n[k]; return n; });
  };

  const fillDemo = (demo) => {
    setForm(demo.values);
    setErrors({});
    setResult(null);
    setApiError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setResult(null); setApiError('');

    // Client-side validation
    const errs = {};
    for (const f of FIELDS) {
      const v = form[f.key];
      if (v === undefined || v === '') { errs[f.key] = 'Required'; continue; }
      const num = parseFloat(v);
      if (isNaN(num)) { errs[f.key] = 'Must be a number'; continue; }
      if (num < f.min || num > f.max) errs[f.key] = `Must be ${f.min}–${f.max}`;
    }
    if (Object.keys(errs).length) { setErrors(errs); setLoading(false); return; }

    try {
      const payload = {};
      for (const f of FIELDS) payload[f.key] = parseFloat(form[f.key]);
      const res = await api.post('/predictions/predict/', payload);
      setResult(res.data);
    } catch (err) {
      const d = err.response?.data;
      if (d?.errors) setErrors(d.errors);
      else setApiError(d?.error || 'Prediction failed. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => { setForm({}); setResult(null); setErrors({}); setApiError(''); };

  const prob = result?.failure_probability || 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Machine Health Predictor</h2>
          <p>Enter sensor readings manually to get an instant AI-powered failure prediction</p>
        </div>
      </div>

      <div className="page-body">
        {/* Demo presets */}
        <div className="card" style={{marginBottom:'16px',padding:'14px 18px'}}>
          <div style={{display:'flex',alignItems:'center',gap:'12px',flexWrap:'wrap'}}>
            <span style={{fontSize:'12px',color:'var(--text2)',fontWeight:'500'}}>Try a demo case:</span>
            {DEMO_CASES.map(d => (
              <button key={d.label} className="btn btn-ghost btn-sm" onClick={() => fillDemo(d)}
                style={{borderColor: d.color + '55', color: d.color}}>
                <span style={{display:'inline-block',width:'7px',height:'7px',borderRadius:'50%',background:d.color,marginRight:'4px'}}></span>
                {d.label}
              </button>
            ))}
            {Object.keys(form).length > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={handleReset} style={{marginLeft:'auto'}}>✕ Reset</button>
            )}
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns: result ? '1fr 1fr' : '1fr',gap:'16px',alignItems:'start'}}>
          {/* INPUT FORM */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Sensor Input Values</div>
                <div className="card-sub">Enter all 7 sensor readings from your machine</div>
              </div>
            </div>

            {apiError && <div className="error-msg" style={{marginBottom:'14px'}}>{apiError}</div>}

            <form onSubmit={handleSubmit}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px 14px'}}>
                {FIELDS.map(f => (
                  <div key={f.key} className="form-group" style={{margin:0}}>
                    <label className="form-label" style={{display:'flex',alignItems:'center',gap:'5px'}}>
                      <span>{f.icon}</span> {f.label}
                      <span style={{color:'var(--text3)',fontWeight:'400',fontSize:'11px',marginLeft:'2px'}}>({f.unit})</span>
                    </label>
                    <input
                      className={'form-input' + (errors[f.key] ? ' error' : '')}
                      type="number"
                      min={f.min} max={f.max} step={f.step}
                      placeholder={f.placeholder}
                      value={form[f.key] ?? ''}
                      onChange={e => set(f.key, e.target.value)}
                      style={errors[f.key] ? {borderColor:'var(--red)',background:'rgba(239,68,68,0.05)'} : {}}
                    />
                    {errors[f.key]
                      ? <div style={{fontSize:'10px',color:'var(--red)',marginTop:'2px'}}>{errors[f.key]}</div>
                      : <div style={{fontSize:'10px',color:'var(--text3)',marginTop:'2px'}}>{f.hint}</div>
                    }
                  </div>
                ))}
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading}
                style={{width:'100%',justifyContent:'center',marginTop:'18px',padding:'11px',fontSize:'14px'}}>
                {loading
                  ? <><span className="spinner" style={{width:'15px',height:'15px'}}></span> Analyzing...</>
                  : '🧠 Predict Machine Health'}
              </button>
            </form>
          </div>

          {/* RESULT PANEL */}
          {result && (
            <div>
              {/* Health status banner */}
              <div className="card" style={{
                marginBottom:'14px',
                borderColor: result.health_color === 'green' ? 'rgba(16,185,129,0.4)' : result.health_color === 'yellow' ? 'rgba(245,158,11,0.4)' : 'rgba(239,68,68,0.4)',
                background: result.health_color === 'green' ? 'rgba(16,185,129,0.06)' : result.health_color === 'yellow' ? 'rgba(245,158,11,0.06)' : 'rgba(239,68,68,0.06)',
              }}>
                <div style={{display:'flex',alignItems:'center',gap:'20px',flexWrap:'wrap'}}>
                  <div style={{textAlign:'center'}}>
                    <GaugeMeter value={prob} />
                  </div>
                  <div style={{flex:1}}>
                    <div style={{
                      fontSize:'24px', fontWeight:'700', marginBottom:'4px',
                      color: result.health_color === 'green' ? 'var(--green)' : result.health_color === 'yellow' ? 'var(--yellow)' : 'var(--red)'
                    }}>
                      {result.health_status}
                    </div>
                    <div style={{fontSize:'13px',color:'var(--text2)',marginBottom:'10px'}}>
                      Confidence: <strong style={{color:'var(--blue)'}}>{result.confidence_score}%</strong>
                      &nbsp;·&nbsp;
                      {result.will_fail_within_7days
                        ? <span style={{color:'var(--red)',fontWeight:'600'}}>⚠ Likely to fail within 7 days</span>
                        : <span style={{color:'var(--green)'}}>✓ No imminent failure detected</span>}
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
                      {[
                        ['Failure Probability', prob + '%', result.health_color === 'red' ? 'var(--red)' : result.health_color === 'yellow' ? 'var(--yellow)' : 'var(--green)'],
                        ['Est. Days to Failure', result.estimated_days_to_failure || 'N/A', 'var(--text)'],
                        ['Anomaly Detected', result.is_anomaly ? 'Yes ⚠' : 'No ✓', result.is_anomaly ? 'var(--yellow)' : 'var(--green)'],
                        ['Anomaly Score', result.anomaly_score, 'var(--text2)'],
                      ].map(([label, value, color]) => (
                        <div key={label} style={{background:'var(--bg3)',borderRadius:'8px',padding:'10px 12px'}}>
                          <div style={{fontSize:'10px',color:'var(--text3)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'3px'}}>{label}</div>
                          <div style={{fontSize:'16px',fontWeight:'600',color}}>{value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              <div className="card" style={{marginBottom:'14px'}}>
                <div className="card-header"><div className="card-title">AI Maintenance Recommendations</div></div>
                {result.recommendations.map((rec, i) => (
                  <div key={i} style={{
                    display:'flex',gap:'10px',padding:'10px 12px',borderRadius:'8px',marginBottom:'6px',
                    background: rec.severity === 'critical' ? 'rgba(239,68,68,0.07)' : rec.severity === 'warning' ? 'rgba(245,158,11,0.07)' : 'rgba(16,185,129,0.07)',
                    border: `1px solid ${rec.severity === 'critical' ? 'rgba(239,68,68,0.2)' : rec.severity === 'warning' ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)'}`,
                  }}>
                    <span style={{fontSize:'16px',flexShrink:0}}>{rec.icon}</span>
                    <span style={{fontSize:'12px',color:'var(--text2)',lineHeight:'1.5'}}>{rec.text}</span>
                  </div>
                ))}
              </div>

              {/* Contributing factors */}
              <div className="card">
                <div className="card-header"><div className="card-title">Top Contributing Factors</div><div className="card-sub">Feature importance from the model</div></div>
                {Object.entries(result.contributing_factors).map(([feat, score]) => (
                  <div key={feat} style={{marginBottom:'10px'}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}>
                      <span style={{fontSize:'12px',color:'var(--text2)',textTransform:'capitalize'}}>{feat.replace(/_/g, ' ')}</span>
                      <span style={{fontSize:'12px',fontWeight:'600',color:'var(--purple)'}}>{score}%</span>
                    </div>
                    <div style={{height:'5px',background:'var(--bg3)',borderRadius:'3px',overflow:'hidden'}}>
                      <div style={{height:'100%',width:score+'%',background:'linear-gradient(90deg,var(--blue),var(--purple))',borderRadius:'3px',transition:'width 0.5s'}}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* How it works */}
        {!result && (
          <div className="card" style={{marginTop:'16px',padding:'18px 20px'}}>
            <div className="card-title" style={{marginBottom:'12px'}}>How It Works</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:'12px'}}>
              {[
                ['1. Train Externally', 'Run train_model.py once on your machine to train the ML models on historical data.', '#3b82f6'],
                ['2. Enter Sensor Values', 'Input the 7 real-time sensor readings from your machine into the form.', '#8b5cf6'],
                ['3. Get Instant Prediction', 'The AI predicts failure probability, health status, and maintenance recommendations.', '#10b981'],
                ['4. Take Action', 'Follow the recommendations to prevent unexpected machine downtime.', '#f59e0b'],
              ].map(([title, desc, color]) => (
                <div key={title} style={{padding:'12px',background:'var(--bg3)',borderRadius:'8px',borderLeft:'3px solid '+color}}>
                  <div style={{fontSize:'12px',fontWeight:'600',color,marginBottom:'5px'}}>{title}</div>
                  <div style={{fontSize:'11px',color:'var(--text2)',lineHeight:'1.6'}}>{desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
