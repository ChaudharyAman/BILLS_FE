import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api, { storeAuthSession } from '../api/axios';
import { FaEye, FaEyeSlash, FaExclamationCircle, FaLock, FaEnvelope, FaChartLine, FaShieldAlt, FaChartPie } from 'react-icons/fa';

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

      storeAuthSession(response.data);

      navigate('/invoices');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create account');
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

      {/* Right Side - Registration Disabled Message */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 md:p-16 bg-white overflow-y-auto">
        <div className="w-full max-w-[400px] text-center space-y-6">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto border border-rose-100 shadow-sm shadow-rose-100/50">
            <FaExclamationCircle size={28} />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight" data-testid="registration-disabled-title">Registration Disabled</h1>
            <p className="text-slate-500 text-sm leading-relaxed font-medium">
              Public self-registration is currently disabled. Please contact your system administrator to request an account and obtain access.
            </p>
          </div>

          <Link
            to="/login"
            className="w-full inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-md shadow-blue-200 text-sm active:scale-[0.99]"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;
