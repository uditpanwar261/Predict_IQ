import React, { useState, useEffect } from 'react';
import { predictionsAPI } from '../utils/api';
import { Toast } from '../components/Toast';

export default function MLTraining() {
  const [models, setModels] = useState([]);
  const [training, setTraining] = useState(false);
  const [result, setResult] = useState(null);
  const [file, setFile] = useState(null);
  const [toast, setToast] = useState(null);
  const [progress, setProgress] = useState(0);

  const loadModels = () => predictionsAPI.models().then(r => setModels(r.data.results || r.data));
  useEffect(() => { loadModels(); }, []);

  const handleTrain = async () => {
    setTraining(true); setResult(null); setProgress(0);
    const interval = setInterval(() => setProgress(p => Math.min(p + 3, 92)), 500);
    try {
      const formData = new FormData();
      if (file) formData.append('dataset', file);
      const r = await predictionsAPI.train(formData);
      setResult(r.data);
      setProgress(100);
      await loadModels();
      setToast({ message: 'Models trained successfully! Accuracy: ' + r.data.metrics?.accuracy + '%', type: 'success' });
    } catch(e) {
      setToast({ message: e.response?.data?.error || 'Training failed.', type: 'error' });
    } finally {
      clearInterval(interval);
      setTraining(false);
    }
  };

  const MODEL_INFO = {
    classifier: { name: 'Failure Classifier', desc: 'Random Forest binary classifier predicting will-fail-in-7-days.', color: '#ef4444' },
    regressor: { name: 'Probability Regressor', desc: 'Random Forest regressor outputting continuous failure probability (0–100%).', color: '#f59e0b' },
    anomaly: { name: 'Anomaly Detector', desc: 'Isolation Forest unsupervised anomaly detection.', color: '#8b5cf6' },
  };

  return (
    <div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <div className="page-header">
        <div><h2>ML Model Training</h2><p>Train predictive models on historical or uploaded datasets</p></div>
      </div>
      <div className="page-body">
        <div className="grid-2" style={{marginBottom:'16px'}}>
          <div className="card">
            <div className="card-header"><div className="card-title">Train Models</div></div>
            <p style={{fontSize:'13px',color:'var(--text2)',marginBottom:'16px',lineHeight:'1.6'}}>
              Training runs 3 ML models: a Random Forest classifier, a probability regressor, and an Isolation Forest anomaly detector. Uses synthetic dataset + any uploaded CSV.
            </p>

            <div className="form-group">
              <label className="form-label">Upload Custom Dataset (Optional)</label>
              <div style={{border:'2px dashed var(--border2)',borderRadius:'10px',padding:'20px',textAlign:'center',cursor:'pointer',background: file ? 'rgba(16,185,129,0.05)' : 'var(--bg3)'}}
                onClick={() => document.getElementById('dataset-input').click()}
                onDrop={e => { e.preventDefault(); setFile(e.dataTransfer.files[0]); }}
                onDragOver={e => e.preventDefault()}>
                <input id="dataset-input" type="file" accept=".csv" style={{display:'none'}} onChange={e=>setFile(e.target.files[0])} />
                {file ? (
                  <div>
                    <div style={{color:'var(--green)',fontWeight:'600',marginBottom:'4px'}}>✓ {file.name}</div>
                    <div style={{fontSize:'11px',color:'var(--text3)'}}>Click to change file</div>
                  </div>
                ) : (
                  <div>
                    <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="var(--text3)" strokeWidth="1.5" style={{margin:'0 auto 8px'}}><path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
                    <div style={{color:'var(--text2)',fontSize:'13px'}}>Drop CSV file or click to browse</div>
                    <div style={{fontSize:'11px',color:'var(--text3)',marginTop:'4px'}}>Expected columns: temperature, vibration, pressure, current, rpm, oil_level, noise_level, failure_label</div>
                  </div>
                )}
              </div>
            </div>

            {training && (
              <div style={{marginBottom:'14px'}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:'12px',color:'var(--text2)',marginBottom:'5px'}}>
                  <span>Training in progress...</span><span>{progress}%</span>
                </div>
                <div className="gauge-bar" style={{height:'8px'}}>
                  <div className="gauge-fill green" style={{width:progress+'%',transition:'width 0.5s'}}></div>
                </div>
              </div>
            )}

            <button className="btn btn-primary" onClick={handleTrain} disabled={training} style={{width:'100%',justifyContent:'center'}}>
              {training ? <><span className="spinner" style={{width:'14px',height:'14px'}}></span> Training Models...</> : '🧠 Start Training'}
            </button>

            {result && (
              <div style={{marginTop:'16px',padding:'14px',background:'rgba(16,185,129,0.08)',border:'1px solid rgba(16,185,129,0.25)',borderRadius:'10px'}}>
                <div style={{fontWeight:'600',color:'var(--green)',marginBottom:'10px'}}>✓ Training Complete</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'10px'}}>
                  {[['Accuracy', result.metrics?.accuracy + '%'],['F1 Score', result.metrics?.f1 + '%'],['AUC Score', result.metrics?.auc + '%']].map(([l,v]) => (
                    <div key={l} style={{textAlign:'center',padding:'8px',background:'var(--bg3)',borderRadius:'8px'}}>
                      <div style={{fontSize:'11px',color:'var(--text3)',marginBottom:'3px'}}>{l}</div>
                      <div style={{fontSize:'20px',fontWeight:'700',color:'var(--green)'}}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-header"><div className="card-title">Model Architecture</div></div>
            {Object.entries(MODEL_INFO).map(([type, info]) => (
              <div key={type} style={{padding:'14px',background:'var(--bg3)',borderRadius:'10px',marginBottom:'10px',borderLeft:'3px solid '+info.color}}>
                <div style={{fontWeight:'600',color:'var(--text)',marginBottom:'4px'}}>{info.name}</div>
                <div style={{fontSize:'12px',color:'var(--text2)',lineHeight:'1.5'}}>{info.desc}</div>
              </div>
            ))}
            <div style={{padding:'14px',background:'var(--blue-glow)',border:'1px solid rgba(59,130,246,0.2)',borderRadius:'10px',marginTop:'4px'}}>
              <div style={{fontWeight:'500',color:'var(--blue)',marginBottom:'4px',fontSize:'13px'}}>📡 Future IoT Integration</div>
              <div style={{fontSize:'12px',color:'var(--text2)',lineHeight:'1.5'}}>Replace the simulator with real MQTT device data. The ML pipeline is device-agnostic — swap the data source, not the models.</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">Trained Model History</div></div>
          {models.length === 0 ? (
            <div className="empty-state"><p>No models trained yet. Click "Start Training" above.</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Type</th><th>Version</th><th>Accuracy</th><th>F1 Score</th><th>AUC</th><th>Samples</th><th>Status</th><th>Trained At</th></tr></thead>
                <tbody>
                  {models.map(m => (
                    <tr key={m.id}>
                      <td><span className="badge badge-purple">{m.model_type}</span></td>
                      <td style={{fontFamily:'monospace',fontSize:'11px'}}>{m.version}</td>
                      <td style={{color:'var(--green)',fontWeight:'500'}}>{m.accuracy ? m.accuracy + '%' : '—'}</td>
                      <td>{m.f1_score ? m.f1_score + '%' : '—'}</td>
                      <td>{m.auc_score ? m.auc_score + '%' : '—'}</td>
                      <td>{m.training_samples?.toLocaleString()}</td>
                      <td>{m.is_active ? <span className="badge badge-green">Active</span> : <span className="badge badge-gray">Inactive</span>}</td>
                      <td style={{fontSize:'11px',color:'var(--text3)'}}>{new Date(m.trained_at).toLocaleString()}</td>
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
