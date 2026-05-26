import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api, { storeAuthSession } from '../api/axios';
import { FaEye, FaEyeSlash, FaExclamationCircle } from 'react-icons/fa';

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
    <div className="min-h-screen w-full flex overflow-hidden font-sans">

      {/* Left Side - Fullscreen Illustration */}
      <div className="hidden lg:flex w-[60%] bg-[#0F3D3E] relative items-center justify-center overflow-hidden p-12">

        {/* Abstract Invoice/Receipt Pattern Background */}
        <div className="absolute inset-0 opacity-20 flex items-center justify-center">
          {/* Pattern removed as per request to remove SVGs */}
        </div>

        {/* Ambient Glows */}
        <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-[#1A4D55] opacity-40 blur-[150px] rounded-full"></div>
        <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] bg-[#2C7A7B] opacity-30 blur-[150px] rounded-full"></div>

        {/* Central Composition */}
        <div className="relative z-10 text-center">
          <div className="relative inline-block mb-8">
            {/* Floating Invoice Graphic */}
            <div className="w-64 h-80 bg-white rounded-lg shadow-2xl p-6 transform -rotate-6 relative z-10 mx-auto">
              <div className="h-4 w-24 bg-teal-500 rounded mb-4"></div>
              <div className="space-y-3">
                <div className="h-2 w-full bg-slate-100 rounded"></div>
                <div className="h-2 w-full bg-slate-100 rounded"></div>
                <div className="h-2 w-3/4 bg-slate-100 rounded"></div>
              </div>
              <div className="mt-8 space-y-2">
                <div className="flex justify-between"><div className="h-2 w-1/3 bg-slate-200 rounded"></div><div className="h-2 w-10 bg-slate-200 rounded"></div></div>
                <div className="flex justify-between"><div className="h-2 w-1/3 bg-slate-200 rounded"></div><div className="h-2 w-10 bg-slate-200 rounded"></div></div>
                <div className="flex justify-between"><div className="h-2 w-1/3 bg-slate-200 rounded"></div><div className="h-2 w-10 bg-slate-200 rounded"></div></div>
              </div>
              <div className="mt-8 pt-4 border-t border-slate-100 flex justify-between items-center">
                <div className="h-3 w-16 bg-slate-300 rounded"></div>
                <div className="h-5 w-20 bg-teal-600 rounded"></div>
              </div>

              {/* Stamped seal */}
              <div className="absolute bottom-6 right-6 w-16 h-16 border-2 border-teal-500 rounded-full opacity-20 flex items-center justify-center transform -rotate-12">
                <span className="text-[10px] font-bold text-teal-600 uppercase">Paid</span>
              </div>
            </div>

            {/* Background stacked paper */}
            <div className="absolute top-4 left-8 w-64 h-80 bg-slate-200 rounded-lg shadow-lg transform rotate-3 -z-10"></div>
          </div>

          <h2 className="text-4xl font-bold text-white mb-4">Streamline Your <br /> Billing Process</h2>
          <p className="text-teal-200 text-lg max-w-md mx-auto leading-relaxed">Create, track, and manage invoices with professional ease and artistic precision.</p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-[40%] bg-white flex flex-col justify-center items-center p-8 md:p-16 overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-slate-900">Welcome back</h1>
            <p className="text-slate-500 mt-2">Please enter your details to sign in.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl flex items-center gap-3">
              <FaExclamationCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Login, email or username</label>
              <input
                type="text"
                name="username"
                required
                data-testid="login-username"
                className="w-full px-5 py-4 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all shadow-sm"
                placeholder="Enter username or email"
                value={formData.username}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  data-testid="login-password"
                  className="w-full px-5 py-4 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all shadow-sm pr-12"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                />
                <button type="button" onClick={() => setShowPassword(o => !o)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                </button>
              </div>
            </div>



            <button
              type="submit"
              disabled={loading}
              data-testid="login-submit"
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-4 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl active:scale-[0.99]"
            >
              {loading ? 'Logging in...' : 'Sign in'}
            </button>
          </form>



          <p className="mt-8 text-center text-slate-600">
            Don't have an account?{' '}
            <Link to="/signup" className="font-semibold text-teal-600 hover:text-teal-700">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
