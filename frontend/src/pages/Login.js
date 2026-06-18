import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check your credentials.');
    } finally { setLoading(false); }
  };

  const fillDemo = (role) => {
    if (role === 'admin') setForm({ email: 'admin@predictive.ai', password: 'admin123' });
    else setForm({ email: 'engineer@predictive.ai', password: 'engineer123' });
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'10px',marginBottom:'8px'}}>
            <div className="logo-icon"><svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg></div>
            <h1 style={{fontSize:'22px',fontWeight:'700'}}>PredictIQ</h1>
          </div>
          <p>Predictive Maintenance Platform</p>
        </div>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" placeholder="you@company.com" value={form.email}
              onChange={e => setForm(p => ({...p, email: e.target.value}))} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" placeholder="••••••••" value={form.password}
              onChange={e => setForm(p => ({...p, password: e.target.value}))} required />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading} style={{width:'100%',justifyContent:'center',marginTop:'4px'}}>
            {loading ? <><span className="spinner" style={{width:'14px',height:'14px'}}></span> Signing in...</> : 'Sign In'}
          </button>
        </form>
        <div style={{marginTop:'16px',display:'flex',gap:'8px'}}>
          <button className="btn btn-ghost btn-sm" style={{flex:1,justifyContent:'center'}} onClick={() => fillDemo('admin')}>Demo Admin</button>
          <button className="btn btn-ghost btn-sm" style={{flex:1,justifyContent:'center'}} onClick={() => fillDemo('engineer')}>Demo Engineer</button>
        </div>
        <p style={{textAlign:'center',marginTop:'16px',color:'var(--text2)',fontSize:'13px'}}>
          No account? <Link to="/register" style={{color:'var(--blue)'}}>Register</Link>
        </p>
      </div>
    </div>
  );
}
