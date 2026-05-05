import React, { useState, useEffect } from 'react';
import { FaCheck as Check, FaTimes as Cross, FaSpinner, FaPalette } from 'react-icons/fa';
import api from '../api/axios';

const Subscription = () => {
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'yearly'
  const [loadingCode, setLoadingCode] = useState(null); // 'pro'
  const [activeThemeIdx, setActiveThemeIdx] = useState(0);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Initialize with current local storage
  const [userState, setUserState] = useState(() => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  });

  // Listen for background auth syncs from App.jsx so this page auto-updates
  useEffect(() => {
    const handleAuthSync = () => {
      const userStr = localStorage.getItem('user');
      setUserState(userStr ? JSON.parse(userStr) : null);
    };
    window.addEventListener('auth-sync', handleAuthSync);
    return () => window.removeEventListener('auth-sync', handleAuthSync);
  }, []);

  const user = userState?.user || null;
  const isPro = user?.subscription?.plan === 'pro' && user?.subscription?.status === 'active';
  const activeBillingCycle = user?.subscription?.billingCycle; // 'monthly' | 'yearly'

  useEffect(() => {
    const fetchHistory = async () => {
      setLoadingHistory(true);
      try {
        const response = await api.get('/subscriptions/history');
        if (response.data) {
          setPaymentHistory(response.data);
        }
      } catch (err) {
        console.error('Failed to load history:', err);
      } finally {
        setLoadingHistory(false);
      }
    };
    
    // Only fetch history if the user is logged in
    if (user) {
      fetchHistory();
    }
  }, []);

  const themes = [
    {
      name: 'Indigo (Default)',
      bg: 'bg-[#f8f9fc]',
      heading: 'text-[#1a174c]',
      toggleActive: 'bg-[#5b73e8] text-white',
      proBg: 'bg-[#6b82f0]',
      proBadge: 'bg-[#8b9ef5]',
      proShadow: 'shadow-[#6b82f0]/20',
      proTextBtn: 'text-[#6b82f0]',
      baseCheck: 'text-[#a8b1db]',
      baseBtn: 'bg-[#f0f2fa] text-[#5b73e8] hover:bg-[#e4e9f7]',
      hex: '#6b82f0' // Replaced dynamic Tailwind parses with explicitly mapped HEX codes for immediate render safety
    },
    {
      name: 'Emerald',
      bg: 'bg-emerald-50/30',
      heading: 'text-emerald-950',
      toggleActive: 'bg-emerald-500 text-white',
      proBg: 'bg-emerald-500',
      proBadge: 'bg-emerald-400',
      proShadow: 'shadow-emerald-500/20',
      proTextBtn: 'text-emerald-600',
      baseCheck: 'text-emerald-300',
      baseBtn: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100',
      hex: '#10b981'
    },
    {
      name: 'Midnight',
      bg: 'bg-slate-50',
      heading: 'text-slate-900',
      toggleActive: 'bg-slate-800 text-white',
      proBg: 'bg-slate-900',
      proBadge: 'bg-slate-700',
      proShadow: 'shadow-slate-900/20',
      proTextBtn: 'text-slate-900',
      baseCheck: 'text-slate-300',
      baseBtn: 'bg-slate-100 text-slate-800 hover:bg-slate-200',
      hex: '#0f172a'
    },
    {
      name: 'Rose',
      bg: 'bg-rose-50/30',
      heading: 'text-rose-950',
      toggleActive: 'bg-rose-500 text-white',
      proBg: 'bg-rose-500',
      proBadge: 'bg-rose-400',
      proShadow: 'shadow-rose-500/20',
      proTextBtn: 'text-rose-600',
      baseCheck: 'text-rose-300',
      baseBtn: 'bg-rose-50 text-rose-600 hover:bg-rose-100',
      hex: '#f43f5e'
    }
  ];

  const theme = themes[activeThemeIdx];

  useEffect(() => {
    // Dynamically load Razorpay script
    const loadRazorpayScript = () => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    };
    loadRazorpayScript();
  }, []);

  const handlePayment = async (planType) => {
    setLoadingCode(planType);
    try {
      // 1. Create order on backend
      const { data: order } = await api.post('/subscriptions/create-order', {
        plan: 'pro',
        billingCycle: billingCycle
      });

      // 2. Initialize Razorpay options
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'dummy_key_id',
        amount: order.amount,
        currency: order.currency,
        name: 'Flance',
        description: `Pro Plan - ${billingCycle.charAt(0).toUpperCase() + billingCycle.slice(1)}`,
        order_id: order.id,
        handler: async function (response) {
          try {
            const verifyRes = await api.post('/subscriptions/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan: 'pro',
              billingCycle: billingCycle
            });
            alert('Payment Successful! You are now a Pro member.');
            if (userState && verifyRes.data.user) {
              const updatedState = { ...userState, user: verifyRes.data.user };
              localStorage.setItem('user', JSON.stringify(updatedState));
              window.location.reload();
            }
          } catch (verifyError) {
            console.error('Verification failed', verifyError);
            alert('Payment verification failed. Please contact support.');
          }
        },
        prefill: {
          name: user?.username || '',
          email: user?.email || '',
          contact: user?.phone || ''
        },
        theme: {
          color: activeThemeIdx === 1 ? '#10b981' : activeThemeIdx === 2 ? '#0f172a' : activeThemeIdx === 3 ? '#f43f5e' : '#6b82f0'
        }
      };

      const rzp1 = new window.Razorpay(options);
      
      rzp1.on('payment.failed', function (response){
        console.error('Payment failed', response.error);
        alert(`Payment failed: ${response.error.description}`);
      });

      rzp1.open();

    } catch (error) {
      console.error('Error initiating payment:', error);
      alert('Failed to initiate payment. Please try again later.');
    } finally {
      setLoadingCode(null);
    }
  };

  const featuresFree = [
    { text: 'Up to 15 Invoices/Month', type: 'check' },
    { text: 'Up to 15 Quotes & Proformas/Month', type: 'check' },
    { text: '5 Document Edits/Month', type: 'check' },
    { text: 'Document Deletion', type: 'cross' },
    { text: 'Client Management', type: 'check' },
    { text: 'Community Support', type: 'check' },
    { text: 'Custom Branding (watermarked)', type: 'check' },
    { text: 'GST Reports', type: 'cross' },
    { text: 'Client-wise Revenue Reports', type: 'cross' },
    { text: 'Account Statements & Payment Collection', type: 'cross' },
  ];

  const featuresPro = [
    { text: 'Unlimited Invoices & Quotes', type: 'check' },
    { text: 'Unlimited Document Edits', type: 'check' },
    { text: 'Unlimited Document Deletion', type: 'check' },
    { text: 'Unlimited Client Management', type: 'check' },
    { text: 'GST Reports', type: 'check' },
    { text: 'Client-wise Revenue Reports', type: 'check' },
    { text: 'Payment Collection', type: 'check' },
    { text: 'Account Statements', type: 'check' },
    { text: 'Custom Branding & Logos', type: 'check' },
    { text: 'Priority 24/7 Support', type: 'check' },
  ];

  return (
    <div className={`min-h-[calc(100vh-64px)] ${theme.bg} py-12 px-4 sm:px-6 lg:px-8 font-sans text-slate-800 transition-colors duration-500`}>
      
      {/* Theme Switcher */}
      <div className="absolute top-20 right-4 lg:right-8 flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-sm border border-slate-200 z-50">
        <FaPalette className="text-slate-400 w-3 h-3" />
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mr-1">Theme:</span>
        <div className="flex gap-1">
          {themes.map((t, idx) => (
            <button 
              key={idx}
              onClick={() => setActiveThemeIdx(idx)}
              title={t.name}
              className={`w-4 h-4 rounded-full transition-transform ${activeThemeIdx === idx ? 'ring-2 ring-offset-1 ring-slate-400 scale-110' : 'hover:scale-110'}`}
              style={{ backgroundColor: t.hex }}
            />
          ))}
        </div>
      </div>

      {/* Header Section */}
      <div className="max-w-xl mx-auto text-center mb-8">
        <h1 className={`text-2xl md:text-3xl font-bold ${theme.heading} tracking-tight mb-3 transition-colors duration-500`}>
          Simple, transparent pricing
        </h1>
        <p className="text-sm md:text-base text-slate-400 font-medium">
          No contracts. No surprise fees.
        </p>
      </div>

      {/* Billing Toggle (Pill style matching reference) */}
      <div className="flex justify-center mb-10">
        <div className="flex items-center p-1 bg-white rounded-full shadow-sm border border-slate-100">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-5 py-2 text-[11px] font-bold uppercase tracking-wider rounded-full transition-colors duration-300 ${
              billingCycle === 'monthly'
                ? `${theme.toggleActive} shadow-sm`
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            MONTHLY
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-5 py-2 text-[11px] font-bold uppercase tracking-wider rounded-full transition-colors duration-300 ${
              billingCycle === 'yearly'
                ? `${theme.toggleActive} shadow-sm`
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            YEARLY
          </button>
        </div>
      </div>

      {/* Pricing Cards Container */}
      <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-0 items-center justify-center">
        
        {/* --- BASE PLAN CARD --- */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-50 p-6 md:p-8 md:rounded-r-none z-0 hover:shadow-md transition-shadow relative md:translate-x-1">
          <div className="mb-4">
            <div className="flex items-baseline gap-1 mb-4">
              <span className={`text-4xl font-extrabold ${theme.heading} transition-colors duration-500`}>₹0</span>
              <span className="text-xs font-semibold text-slate-400">/month</span>
            </div>
            <h3 className={`text-xl font-bold ${theme.heading} mb-1 transition-colors duration-500`}>Base</h3>
            <p className="text-xs text-slate-400 font-medium h-10 mb-6 line-clamp-2">
              For individuals and small startups getting off the ground.
            </p>

            <h4 className="text-[10px] font-bold tracking-widest text-[#1a174c] uppercase mb-4">WHAT'S INCLUDED</h4>
            <ul className="space-y-4 mb-8">
              {featuresFree.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <div className="mt-[2px] shrink-0">
                    {feature.type === 'check' ? (
                      <Check className={`w-3.5 h-3.5 ${theme.baseCheck} transition-colors duration-500`} />
                    ) : (
                      <Cross className="w-3.5 h-3.5 text-slate-300" />
                    )}
                  </div>
                  <span className={`text-xs font-medium ${feature.type === 'check' ? 'text-slate-600' : 'text-slate-400'}`}>
                    {feature.text}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <button 
            disabled 
            className={`w-full py-2.5 px-4 rounded-full font-bold text-xs ${theme.baseBtn} transition-colors duration-500 mt-auto`}
          >
            {!isPro ? 'Active Plan' : 'Downgrade'}
          </button>
        </div>

        {/* --- PRO PLAN CARD (CENTER) --- */}
        <div className={`${theme.proBg} rounded-3xl shadow-xl ${theme.proShadow} p-6 md:p-8 z-10 relative transform scale-100 md:scale-105 border border-white/10 transition-colors duration-500`}>
          <div className="absolute top-5 right-6">
            <span className={`${theme.proBadge} text-[9px] uppercase tracking-widest font-bold px-2.5 py-1 rounded-full transition-colors duration-500`}>
              POPULAR
            </span>
          </div>
          
          <div>
            <div className="flex items-baseline gap-1 mb-4 mt-2">
              <span className="text-4xl font-extrabold text-white">
                {billingCycle === 'monthly' ? '₹999' : '₹799'}
              </span>
              <span className="text-xs font-semibold text-white/70">/month</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-1">Pro</h3>
            <p className="text-xs text-white/80 font-medium h-10 mb-6 line-clamp-2">
              For growing businesses optimizing their billing workflows.
            </p>

            <h4 className="text-[10px] font-bold tracking-widest text-indigo-900 uppercase mb-4">EVERYTHING IN FREE, PLUS</h4>
            <ul className="space-y-4 mb-8">
              {featuresPro.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0 bg-white rounded-full p-0.5 w-3.5 h-3.5 flex items-center justify-center">
                    <Check className={`w-2.5 h-2.5 ${theme.proTextBtn} transition-colors duration-500`} />
                  </div>
                  <span className="text-xs font-medium text-white">{feature.text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Button Logic for Pro */}
          {isPro && activeBillingCycle === 'yearly' ? (
            <button disabled className={`w-full py-2.5 px-4 rounded-full font-bold text-xs ${theme.proTextBtn} bg-white opacity-90 cursor-not-allowed transition-colors duration-500`}>
              Current Plan (Yearly)
            </button>
          ) : isPro && activeBillingCycle === 'monthly' && billingCycle === 'monthly' ? (
            <button disabled className={`w-full py-2.5 px-4 rounded-full font-bold text-xs ${theme.proTextBtn} bg-white opacity-90 cursor-not-allowed transition-colors duration-500`}>
              Current Plan (Monthly)
            </button>
          ) : (
            <button 
              onClick={() => handlePayment('pro')}
              disabled={loadingCode === 'pro'}
              className={`w-full py-2.5 px-4 rounded-full font-bold text-xs ${theme.proTextBtn} bg-white hover:bg-slate-50 transition-colors shadow-md flex items-center justify-center gap-2 duration-500`}
            >
              {loadingCode === 'pro' ? (
                <><FaSpinner className={`animate-spin ${theme.proTextBtn}`} /> Processing...</>
              ) : isPro && billingCycle === 'yearly' ? (
                'Upgrade to Yearly'
              ) : (
                'Upgrade'
              )}
            </button>
          )}
        </div>

      </div>

      {/* --- PAYMENT HISTORY SECTION --- */}
      <div className="max-w-3xl mx-auto mt-16 pb-8">
        <h2 className={`text-lg font-bold ${theme.heading} mb-4 flex items-center gap-2`}>
          Subscription History
        </h2>
        
        {loadingHistory ? (
           <div className="flex justify-center items-center py-10 bg-white rounded-2xl shadow-sm border border-slate-100">
             <FaSpinner className="animate-spin text-slate-300 w-6 h-6" />
           </div>
        ) : paymentHistory.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
            <p className="text-sm font-medium text-slate-500">No payment history found.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
             <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                   <thead className="bg-[#fcfdff] border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                     <tr>
                        <th className="px-4 py-4">Date</th>
                        <th className="px-4 py-4">End Date</th>
                        <th className="px-4 py-4">Plan Name</th>
                        <th className="px-4 py-4">Billing Cycle</th>
                        <th className="px-4 py-4">Amount Paid</th>
                        <th className="px-4 py-4 text-right">Transaction ID</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                     {paymentHistory.map((item, idx) => (
                       <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-4 font-medium text-slate-800">
                            {new Date(item.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                          </td>
                          <td className="px-4 py-4 font-medium text-slate-600">
                            {item.endDate 
                              ? new Date(item.endDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                              : <span className="text-slate-400 italic">Continuous</span>}
                          </td>
                          <td className="px-4 py-4">
                             <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-600 uppercase">
                               {item.plan}
                             </span>
                          </td>
                          <td className="px-4 py-4 text-slate-600 capitalize">
                             {item.billingCycle}
                          </td>
                          <td className="px-4 py-4 font-bold text-slate-800">
                             ₹{item.amount.toLocaleString()}
                          </td>
                          <td className="px-4 py-4 text-right text-xs text-slate-400 font-mono">
                             {item.razorpayPaymentId}
                          </td>
                       </tr>
                     ))}
                   </tbody>
                </table>
             </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default Subscription;
