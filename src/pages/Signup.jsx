import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import { FaEye, FaEyeSlash, FaExclamationCircle } from 'react-icons/fa';

const Signup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/auth/register', {
        username: formData.username,
        email: formData.email,
        password: formData.password
      });

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data));
      navigate('/invoices');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create account');
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
        <div className="absolute top-[-20%] right-[-20%] w-[80%] h-[80%] bg-[#1A4D55] opacity-40 blur-[150px] rounded-full"></div>
        <div className="absolute bottom-[-20%] left-[-20%] w-[80%] h-[80%] bg-[#2C7A7B] opacity-30 blur-[150px] rounded-full"></div>

        {/* Central Composition */}
        <div className="relative z-10 text-center">
            <div className="relative inline-block mb-8">
                {/* Floating Invoice Graphic */}
                <div className="w-64 h-80 bg-white rounded-lg shadow-2xl p-6 transform rotate-6 relative z-10 mx-auto">
                    <div className="h-4 w-24 bg-teal-500 rounded mb-4"></div>
                    <div className="space-y-3">
                        <div className="h-2 w-full bg-slate-100 rounded"></div>
                        <div className="h-2 w-full bg-slate-100 rounded"></div>
                        <div className="h-2 w-3/4 bg-slate-100 rounded"></div>
                    </div>
                    
                     {/* Growth Chart graphic for signup appeal */}
                    <div className="mt-8 h-24 flex items-end justify-between px-2 gap-2">
                        <div className="w-4 bg-teal-200 rounded-t h-[40%]"></div>
                        <div className="w-4 bg-teal-300 rounded-t h-[60%]"></div>
                        <div className="w-4 bg-teal-400 rounded-t h-[50%]"></div>
                        <div className="w-4 bg-teal-500 rounded-t h-[80%]"></div>
                         <div className="w-4 bg-teal-600 rounded-t h-[100%] shadow-lg"></div>
                    </div>
                    
                    {/* Stamped seal */}
                    <div className="absolute -top-4 -right-4 w-14 h-14 bg-teal-500 rounded-full flex items-center justify-center shadow-lg text-white font-bold">
                        NEW
                    </div>
                </div>
                
                {/* Background stacked paper */}
                <div className="absolute top-4 -left-6 w-64 h-80 bg-slate-200 rounded-lg shadow-lg transform -rotate-3 -z-10"></div>
            </div>

            <h2 className="text-4xl font-bold text-white mb-4">Join the Future <br/> of Invoicing</h2>
            <p className="text-teal-200 text-lg max-w-md mx-auto leading-relaxed">Start your journey today and experience seamless financial management.</p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-[40%] bg-white flex flex-col justify-center items-center p-4 md:p-8 overflow-hidden h-screen">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Create an account</h1>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl flex items-center gap-2">
              <FaExclamationCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Username</label>
              <input
                type="text"
                name="username"
                required
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all shadow-sm text-sm"
                placeholder="Choose a username"
                value={formData.username}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Email Address</label>
              <input
                type="email"
                name="email"
                required
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all shadow-sm text-sm"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all shadow-sm text-sm pr-11"
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={handleChange}
                />
                <button type="button" onClick={() => setShowPassword(o => !o)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  name="confirmPassword"
                  required
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all shadow-sm text-sm pr-11"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
                <button type="button" onClick={() => setShowConfirm(o => !o)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  {showConfirm ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl active:scale-[0.99] mt-2 text-sm"
            >
              {loading ? 'Creating account...' : 'Sign up'}
            </button>
          </form>



          <p className="mt-6 text-center text-slate-600 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-teal-600 hover:text-teal-700">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
