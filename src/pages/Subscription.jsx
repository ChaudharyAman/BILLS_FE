import React, { useState, useEffect } from 'react';
import { FaCheck as Check, FaStar as Star, FaBolt as Zap, FaShieldAlt as Shield, FaQuestionCircle as HelpCircle, FaTimes as X, FaSpinner } from 'react-icons/fa';
import api from '../api/axios';

const Subscription = () => {
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'yearly'
  const [loading, setLoading] = useState(false);

  const userStr = localStorage.getItem('user');
  const userObj = userStr ? JSON.parse(userStr) : null;
  const user = userObj?.user || null;
  const isPro = user?.subscription?.plan === 'pro' && user?.subscription?.status === 'active';
  const activeBillingCycle = user?.subscription?.billingCycle; // 'monthly' | 'yearly'

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

  const handlePayment = async () => {
    setLoading(true);
    try {
      // 1. Create order on backend
      const { data: order } = await api.post('/subscriptions/create-order', {
        plan: 'pro',
        billingCycle: billingCycle
      });

      // 2. Initialize Razorpay options
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'dummy_key_id', // Fallback for testing UI without key
        amount: order.amount,
        currency: order.currency,
        name: 'MyBill',
        description: `Pro Plan - ${billingCycle.charAt(0).toUpperCase() + billingCycle.slice(1)}`,
        order_id: order.id,
        handler: async function (response) {
          // 3. Verify payment on success
          try {
            const verifyRes = await api.post('/subscriptions/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan: 'pro',
              billingCycle: billingCycle
            });
            alert('Payment Successful! You are now a Pro member.');
            // Update local storage and reload so Layout and other components update immediately
            if (userObj && verifyRes.data.user) {
              userObj.user = verifyRes.data.user;
              localStorage.setItem('user', JSON.stringify(userObj));
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
          color: '#4F46E5' // Indigo-600
        },
        config: {
          display: {
            blocks: {
              upi: {
                name: "Pay via UPI",
                instruments: [
                  { method: "upi" }
                ]
              },
              other: {
                name: "Other Payment modes",
                instruments: [
                  { method: "card" },
                  { method: "netbanking" },
                  { method: "wallet" }
                ]
              }
            },
            sequence: ["block.upi", "block.other"],
            preferences: {
              show_default_blocks: true
            }
          }
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
      setLoading(false);
    }
  };

  const featuresFree = [
    { text: 'Up to 15 Invoices/Month', included: true },
    { text: 'Up to 15 Quotes & Proformas/Month', included: true },
    { text: 'Client Management', included: true },
    { text: 'Community Support', included: true },
    { text: 'Custom Branding (watermarked)', included: true },
    { text: 'GST Reports', included: false },
    { text: 'Client-wise Revenue Reports', included: false },
    { text: 'Account Statements & Payment Collection', included: false },
  ];

  const featuresPro = [
    { text: 'Unlimited Invoices & Quotes', included: true },
    { text: 'Unlimited Client Management', included: true },
    { text: 'GST Reports', included: true },
    { text: 'Client-wise Revenue Reports', included: true },
    { text: 'Payment Collection', included: true },
    { text: 'Account Statements', included: true },
    { text: 'Custom Branding & Logos', included: true },
    { text: 'Priority 24/7 Support', included: true },
  ];

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      
      {/* Header Section */}
      <div className="max-w-7xl mx-auto text-center mb-16">
        <h2 className="text-sm font-bold tracking-wide text-indigo-600 uppercase mb-3">
          Pricing & Plans
        </h2>
        <h1 className="text-4xl font-extrabold text-slate-900 sm:text-5xl lg:text-6xl tracking-tight mb-4">
          Simple pricing for <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600">growing businesses</span>
        </h1>
        <p className="mt-4 text-xl text-slate-500 max-w-2xl mx-auto">
          Start for free, then upgrade when you need advanced features, higher limits, and custom branding.
        </p>
      </div>

      {/* Billing Toggle */}
      <div className="flex justify-center mb-12">
        <div className="relative flex items-center p-1 bg-slate-200/60 rounded-full border border-slate-300 backdrop-blur-sm shadow-inner">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`relative w-40 flex justify-center py-2.5 text-sm font-semibold rounded-full transition-all duration-300 ease-in-out ${
              billingCycle === 'monthly'
                ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/5'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`relative w-40 flex justify-center py-2.5 text-sm font-semibold rounded-full transition-all duration-300 ease-in-out ${
              billingCycle === 'yearly'
                ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/5'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Yearly <span className="ml-2 text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full uppercase tracking-wide">Save 20%</span>
          </button>
        </div>
      </div>

      {/* Pricing Cards Container */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 relative">
        
        {/* Decorative Background Blob */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-gradient-to-r from-indigo-300/30 to-purple-300/30 blur-3xl -z-10 rounded-full pointer-events-none opacity-60"></div>

        {/* --- FREE PLAN CARD --- */}
        <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/60 p-8 xl:p-10 flex flex-col transform transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              Free 
              {!isPro && <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-3 py-1 rounded-full border border-slate-200">Current Plan</span>}
            </h3>
            <p className="mt-2 text-slate-500 text-sm h-10">Essential tools to get your billing started and organized.</p>
          </div>
          
          <div className="mt-2 mb-8">
            <span className="text-5xl font-extrabold text-slate-900">₹0</span>
            <span className="text-lg text-slate-500 font-medium">/forever</span>
          </div>

          <button disabled className={`w-full py-3.5 px-4 rounded-xl font-semibold text-sm transition-colors ${!isPro ? 'text-slate-400 bg-slate-100 border border-slate-200 cursor-not-allowed' : 'text-slate-600 bg-white border border-slate-300 hover:bg-slate-50'}`}>
            {!isPro ? 'Active Plan' : 'Downgrade to Free'}
          </button>

          <div className="mt-8 pt-8 border-t border-slate-100">
            <h4 className="text-sm font-semibold text-slate-900 mb-4 tracking-wide">WHAT'S INCLUDED</h4>
            <ul className="space-y-4">
              {featuresFree.map((feature, idx) => (
                <li key={idx} className="flex items-start">
                  <div className="flex-shrink-0 mt-0.5">
                    {feature.included ? (
                      <Check className="w-5 h-5 text-indigo-500" />
                    ) : (
                      <X className="w-5 h-5 text-slate-300" />
                    )}
                  </div>
                  <p className={`ml-3 text-sm ${feature.included ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>
                    {feature.text}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* --- PRO PLAN CARD --- */}
        <div className="relative bg-white rounded-3xl shadow-2xl shadow-indigo-900/10 border-2 border-indigo-500/50 p-8 xl:p-10 flex flex-col transform transition-all duration-300 hover:-translate-y-1 hover:shadow-indigo-500/15 overflow-hidden group">
          
          {/* Pro Glow Effect */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-200 rounded-full blur-3xl opacity-40 group-hover:opacity-60 transition-opacity duration-500"></div>
          
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

          <div className="relative mb-6">
            <h3 className="text-2xl font-bold text-slate-900 flex items-center justify-between">
              <span className="flex items-center gap-2">Professional <Star className="w-5 h-5 text-amber-400 fill-amber-400" /></span>
              {isPro ? (
                  <span className="text-xs font-bold bg-green-100 text-green-700 px-3 py-1 rounded-full border border-green-200 uppercase tracking-wider">Current Plan</span>
              ) : (
                  <span className="text-xs font-bold bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full border border-indigo-200 uppercase tracking-wider">Most Popular</span>
              )}
            </h3>
            <p className="mt-2 text-slate-500 text-sm h-10">Advanced features for power users and growing agencies.</p>
          </div>
          
          <div className="relative mt-2 mb-8">
            <div className="flex items-baseline">
              <span className="text-5xl font-extrabold text-slate-900">
                {billingCycle === 'monthly' ? '₹999' : '₹799'}
              </span>
              <span className="text-lg text-slate-500 font-medium ml-1">/mo</span>
            </div>
            {billingCycle === 'yearly' && (
              <p className="text-sm text-indigo-600 mt-1">Billed ₹9,588 yearly</p>
            )}
            {billingCycle === 'monthly' && (
              <p className="text-sm text-slate-500 mt-1 invisible">Placeholder</p> // To keep height consistent
            )}
          </div>

          {/* Button Logic */}
          {isPro && activeBillingCycle === 'yearly' ? (
            <button 
              disabled
              className="relative w-full py-3.5 px-4 rounded-xl font-bold text-indigo-700 bg-indigo-50 border-2 border-indigo-200 cursor-not-allowed">
              <span className="relative flex items-center justify-center gap-2">
                Currently Subscribed (Yearly) <Check className="w-4 h-4 fill-current" />
              </span>
            </button>
          ) : isPro && activeBillingCycle === 'monthly' && billingCycle === 'monthly' ? (
            <button 
              disabled
              className="relative w-full py-3.5 px-4 rounded-xl font-bold text-indigo-700 bg-indigo-50 border-2 border-indigo-200 cursor-not-allowed">
              <span className="relative flex items-center justify-center gap-2">
                Currently Subscribed (Monthly) <Check className="w-4 h-4 fill-current" />
              </span>
            </button>
          ) : (
            <button 
              onClick={handlePayment}
              disabled={loading}
              className={`relative w-full group overflow-hidden py-3.5 px-4 rounded-xl font-bold text-white shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-white ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}>
              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 bg-[length:200%_auto] group-hover:bg-[100%_auto] transition-all duration-500"></span>
              <span className="relative flex items-center justify-center gap-2">
                {loading ? (
                  <>Processing... <FaSpinner className="w-4 h-4 animate-spin" /></>
                ) : isPro && activeBillingCycle === 'monthly' && billingCycle === 'yearly' ? (
                  <>Upgrade to Yearly <Zap className="w-4 h-4 fill-current" /></>
                ) : (
                  <>Upgrade to Pro <Zap className="w-4 h-4 fill-current" /></>
                )}
              </span>
            </button>
          )}

          <div className="relative mt-8 pt-8 border-t border-slate-100">
            <h4 className="text-sm font-semibold text-slate-900 mb-4 tracking-wide">EVERYTHING IN FREE, PLUS</h4>
            <ul className="space-y-4">
              {featuresPro.map((feature, idx) => (
                <li key={idx} className="flex items-start">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="h-5 w-5 rounded-full bg-indigo-50 flex items-center justify-center border border-indigo-200">
                      <Check className="w-3 h-3 text-indigo-600" />
                    </div>
                  </div>
                  <p className="ml-3 text-sm text-slate-700 font-medium">
                    {feature.text}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>

      </div>

      {/* FAQ / Trust Section */}
      <div className="max-w-4xl mx-auto mt-24 mb-12 text-center">
        <h3 className="text-2xl font-bold text-slate-900 mb-8">Frequently Asked Questions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-indigo-50 rounded-lg"><Shield className="w-5 h-5 text-indigo-600" /></div>
              <h4 className="font-semibold text-slate-900">Is my billing data secure?</h4>
            </div>
            <p className="text-sm text-slate-500 pl-14">Absolutely. We use bank-level encryption and do not store sensitive payment details on our servers.</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-purple-50 rounded-lg"><HelpCircle className="w-5 h-5 text-purple-600" /></div>
              <h4 className="font-semibold text-slate-900">Can I cancel anytime?</h4>
            </div>
            <p className="text-sm text-slate-500 pl-14">Yes! You can switch back to the free plan anytime no questions asked. Your invoices will remain accessible.</p>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Subscription;
