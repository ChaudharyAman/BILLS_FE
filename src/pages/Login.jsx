import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api, { storeAuthSession } from '../api/axios';
import { FaEye, FaEyeSlash, FaExclamationCircle, FaLock, FaEnvelope, FaChartLine, FaShieldAlt, FaChartPie } from 'react-icons/fa';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', formData);
      storeAuthSession(response.data);
      navigate('/invoices');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-white overflow-hidden font-sans">
      
      {/* Left Side - Presentation */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#f4f7fa] relative flex-col justify-between p-16 select-none">
        {/* Top brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <FaChartLine size={18} className="transform -rotate-12" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-800">Flance</span>
        </div>

        {/* Central visual block */}
        <div className="max-w-md my-auto space-y-10">
          <div>
            <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 leading-[1.2]">
              Manage your <br />
              <span className="text-blue-600 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">finances smarter.</span>
            </h2>
            <p className="text-slate-500 text-sm mt-4 leading-relaxed font-medium">
              Invoices, bills, payroll and insights — all in one clean, powerful workspace.
            </p>
          </div>

          {/* Cards */}
          <div className="space-y-4">
            {[
              { title: 'Real-time Analytics', desc: 'Track your growth and margins instantly.', icon: FaChartPie, color: 'text-blue-600 bg-blue-50 border-blue-100' },
              { title: 'Financial Insights', desc: 'Get automated summaries of cash flow and taxes.', icon: FaChartLine, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
              { title: 'Bank-grade Security', desc: 'Your financial data is encrypted and secure.', icon: FaShieldAlt, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
            ].map((card, idx) => (
              <div key={idx} className="flex items-center gap-4 bg-white border border-slate-100 p-4 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${card.color} flex-shrink-0`}>
                  <card.icon size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">{card.title}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">{card.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-xs text-slate-400 font-medium">
          © 2026 Flance. All rights reserved.
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 md:p-16 bg-white overflow-y-auto">
        <div className="w-full max-w-[400px] space-y-8">
          
          <div className="space-y-2 text-left">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Welcome back</h1>
            <p className="text-slate-500 text-sm font-medium">Sign in to your account to continue</p>
          </div>

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 text-xs font-semibold rounded-2xl flex items-start gap-3 animate-fadeIn">
              <FaExclamationCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Username or Email</label>
              </div>
              <div className="relative rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50/80 focus-within:bg-white focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <FaEnvelope size={14} />
                </div>
                <input
                  type="text"
                  name="username"
                  required
                  data-testid="login-username"
                  className="w-full pl-11 pr-4 py-3.5 bg-transparent border-0 outline-none text-slate-800 placeholder-slate-400 text-sm rounded-xl"
                  placeholder="you@company.com"
                  value={formData.username}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Password</label>
                <Link to="/forgot-password" className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50/80 focus-within:bg-white focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <FaLock size={14} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  data-testid="login-password"
                  className="w-full pl-11 pr-12 py-3.5 bg-transparent border-0 outline-none text-slate-800 placeholder-slate-400 text-sm rounded-xl"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(o => !o)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                >
                  {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex items-center">
              <label className="flex items-center gap-2.5 text-xs text-slate-600 font-medium cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                Remember me for 30 days
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              data-testid="login-submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-md shadow-blue-200 active:scale-[0.99] disabled:opacity-60 text-sm"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </span>
              ) : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-xs font-semibold text-slate-400">
            Don't have an account?{' '}
            <Link to="/signup" className="text-blue-600 hover:text-blue-700 transition-colors">Sign up</Link>
          </p>
          
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] text-slate-400 font-medium text-center">
            Demo: enter your username and password to log in.
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
