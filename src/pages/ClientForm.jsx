import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import { FaSave, FaArrowLeft, FaPlus, FaTrash, FaUser } from 'react-icons/fa';
import Skeleton from '../components/Skeleton';

const ClientForm = ({ onSuccess, onCancel }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('address'); // address, other, notes, balance
  const [showShipping, setShowShipping] = useState(false);

  const [formData, setFormData] = useState({
    clientType: 'Company',
    name: '',
    phone: '',
    email: '',
    gstTreatment: 'Registered Business',
    gstin: '',
    pan: '',
    tan: '',
    tin: '',
    vat: '',
    website: '',
    currency: 'INR',
    isVendor: false,
    clientWiseItemPrice: false,
    tds_applicable: false,
    default_tds_section: '',
    default_tds_rate: 0,
    
    // Addresses
    billingAddress: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      zip: '',
      country: 'India',
    },
    shippingAddress: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      zip: '',
      country: 'India',
    },
    placeOfSupply: '',

    // Contacts Array
    contacts: [],

    // Other Info
    facebook: '',
    lst: '',
    cst: '',
    dlNo: '',

    // Notes
    notes: '',

    // Opening Balance
    openingBalance: 0,
    pendingPayment: 0,
  });

  // For adding a new contact person
  const [newContact, setNewContact] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });

  const [panError, setPanError] = useState('');
  const [lastCheckedGstin, setLastCheckedGstin] = useState('');

  // Auto-enable/suggest TDS defaults when a valid GSTIN is entered
  useEffect(() => {
    const currentGstin = String(formData.gstin || '').trim().toUpperCase();
    const isGstinValid = /^[0-9A-Z]{15}$/.test(currentGstin);
    
    if (isGstinValid && currentGstin !== lastCheckedGstin) {
      setFormData(prev => ({
        ...prev,
        default_tds_section: prev.default_tds_section || '194J'
      }));
      setLastCheckedGstin(currentGstin);
    } else if (!isGstinValid && lastCheckedGstin) {
      setFormData(prev => ({
        ...prev,
        tds_applicable: false,
        default_tds_section: '',
        default_tds_rate: 0
      }));
      setLastCheckedGstin('');
    }
  }, [formData.gstin, lastCheckedGstin]);


  // Sync Default TDS Rate based on Section & ClientType
  useEffect(() => {
    if (formData.tds_applicable) {
      const section = formData.default_tds_section || '194C';
      if (section === '194C') {
        const isIndividual = formData.clientType === 'Individual';
        setFormData(prev => ({ ...prev, default_tds_rate: isIndividual ? 1 : 2 }));
      } else if (['194J', '194I', '194A'].includes(section)) {
        setFormData(prev => ({ ...prev, default_tds_rate: 10 }));
      }
    } else {
      setFormData(prev => ({ ...prev, default_tds_rate: 0 }));
    }
  }, [formData.tds_applicable, formData.default_tds_section, formData.clientType]);

  useEffect(() => {
    if (id && !onSuccess) { 
      fetchClient();
    }
  }, [id, onSuccess]);

  const fetchClient = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/clients/${id}`);
      // Merge with default state to ensure structure exists
      const data = response.data;
      
      // Handle legacy address structure if exists
      if (data.address && !data.billingAddress) {
        data.billingAddress = data.address;
      }
      
      setFormData(prev => ({ ...prev, ...data }));
      if (data.gstin && /^[0-9A-Z]{15}$/.test(String(data.gstin).trim().toUpperCase())) {
        setLastCheckedGstin(String(data.gstin).trim().toUpperCase());
      }
      if (data.shippingAddress && (data.shippingAddress.line1 || data.shippingAddress.city)) {
        setShowShipping(true);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching client:', error);
      alert('Failed to fetch client details');
      navigate('/clients');
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData((prev) => ({
        ...prev,
        [parent]: { ...prev[parent], [child]: value },
      }));
    } else {
      setFormData((prev) => ({ 
        ...prev, 
        [name]: type === 'checkbox' ? checked : value 
      }));
    }
  };

  // Contacts Logic
  const handleContactChange = (e) => {
    const { name, value } = e.target;
    setNewContact(prev => ({ ...prev, [name]: value }));
  };

  const addContact = () => {
    if (!newContact.firstName) {
        alert('Please enter at least a First Name to add a contact.');
        return;
    }
    setFormData(prev => ({
      ...prev,
      contacts: [...prev.contacts, newContact]
    }));
    setNewContact({ firstName: '', lastName: '', email: '', phone: '' });
  };

  const removeContact = (index) => {
    setFormData(prev => ({
      ...prev,
      contacts: prev.contacts.filter((_, i) => i !== index)
    }));
  };

  // GST State Code Mapping
  const gstStateMap = {
    '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh', 
    '05': 'Uttarakhand', '06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh',
    '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh', '13': 'Nagaland', '14': 'Manipur',
    '15': 'Mizoram', '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal',
    '20': 'Jharkhand', '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat',
    '25': 'Daman & Diu', '26': 'Dadra & Nagar Haveli', '27': 'Maharashtra', '28': 'Andhra Pradesh',
    '29': 'Karnataka', '30': 'Goa', '31': 'Lakshadweep', '32': 'Kerala', '33': 'Tamil Nadu',
    '34': 'Puducherry', '35': 'Andaman & Nicobar Islands', '36': 'Telangana', '37': 'Andhra Pradesh',
    '38': 'Ladakh', '97': 'Other Territory', '99': 'Centre Jurisdiction'
  };

  const fetchGstDetails = async () => {
    if (!formData.gstin || formData.gstin.length !== 15) {
      alert('Please enter a valid 15-character GSTIN');
      return;
    }

    setLoading(true);

    // Simulate API call delay
    setTimeout(() => {
      // 1. Extract PAN (chars 3-12)
      const extractedPan = formData.gstin.substring(2, 12);
      
      // 2. Extract State Code (chars 0-2)
      const stateCode = formData.gstin.substring(0, 2);
      const stateName = gstStateMap[stateCode] || '';

      // 3. Determine Place of Supply
      const placeOfSupply = stateName || formData.placeOfSupply;

      setFormData(prev => ({
        ...prev,
        pan: extractedPan,
        billingAddress: {
          ...prev.billingAddress,
          state: stateName,
          country: 'India',
          // Auto-fill zip if possible? No, requires API.
        },
        shippingAddress: {
             ...prev.shippingAddress,
             state: stateName,
             country: 'India'
        },
        placeOfSupply: placeOfSupply
      }));

      setLoading(false);
      
      if (stateName) {
         alert(`GST Details Parsed:\n- PAN: ${extractedPan}\n- State: ${stateName}\n\nNote: Legal Name & Street Address cannot be fetched without an external API subscription.`);
      } else {
         alert(`GST Details Parsed:\n- PAN: ${extractedPan}\n- State Code '${stateCode}' not found.\n\nNote: Legal Name & Address extraction requires external API.`);
      }

    }, 800);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const panVal = formData.pan ? formData.pan.toUpperCase() : '';
    if (panVal && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panVal)) {
        setPanError('Invalid PAN format (e.g., ABCDE1234F)');
        alert('Please enter a valid PAN number before saving.');
        return;
    }
    setLoading(true);
    try {
      const payload = { ...formData };
      
      // Auto-save unsaved contact if first name is present
      if (newContact.firstName) {
          payload.contacts = [...payload.contacts, newContact];
      }

      // Ensure place of supply is set if empty (legacy)
      if (!payload.placeOfSupply && payload.billingAddress.state) {
          payload.placeOfSupply = payload.billingAddress.state;
      }

      const apiCall = id 
        ? api.put(`/clients/${id}`, payload)
        : api.post('/clients', payload);

      const response = await apiCall;

      if (onSuccess) {
        onSuccess(response.data);
      } else {
        navigate('/clients');
      }
    } catch (error) {
      console.error('Error saving client:', error);
      alert('Failed to save client');
    } finally {
      setLoading(false);
    }
  };

  const isModal = !!onSuccess;
  
  if(loading && id && !isModal) {
      return (
         <div className="container mx-auto p-6 max-w-7xl">
            <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-4"><Skeleton width="200px" height="32px" /></div>
            </div>
            <div className="flex flex-col lg:flex-row gap-6">
                 <div className="w-full lg:w-1/3 space-y-4">
                     <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                         <div className="space-y-4">
                            {[...Array(5)].map((_,i) => (
                                <div key={i}><Skeleton width="100px" height="16px" className="mb-2" /><Skeleton width="100%" height="40px" /></div>
                            ))}
                         </div>
                     </div>
                 </div>
                 <div className="w-full lg:w-2/3 flex flex-col gap-6">
                      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[500px] flex flex-col">
                           <div className="flex border-b border-slate-100 bg-slate-50/50 p-2 gap-2">
                               <Skeleton width="80px" height="30px" />
                               <Skeleton width="80px" height="30px" />
                               <Skeleton width="80px" height="30px" />
                           </div>
                           <div className="p-8 flex-1 space-y-6">
                               <div className="grid grid-cols-2 gap-4">
                                   {[...Array(4)].map((_,i) => <div key={i}><Skeleton width="100px" height="16px" className="mb-2" /><Skeleton width="100%" height="40px" /></div>)}
                               </div>
                           </div>
                      </div>
                 </div>
            </div>
         </div>
      );
  }

  return (
    <div className={`container mx-auto ${isModal ? '' : 'p-6 max-w-7xl'}`}>
      {!isModal && (
        <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
            <button 
                onClick={() => navigate('/clients')}
                className="text-slate-500 hover:text-slate-700 transition-colors"
            >
                <FaArrowLeft size={24} />
            </button>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
                {id ? 'Edit Client / Customer' : 'Add New Client / Customer'}
            </h1>
            </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-6">
        
        {/* LEFT COLUMN - BASIC INFO */}
        <div className="w-full lg:w-1/3 space-y-4">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="space-y-4">
                    
                    {/* Client Type Toggle */}
                    <div className="flex gap-4 p-1 bg-slate-100/50 rounded-lg w-max mb-6 border border-slate-200/60">
                         <label className={`px-4 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wide cursor-pointer transition-all ${formData.clientType === 'Company' ? 'bg-white text-teal-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>
                             <input type="radio" name="clientType" value="Company" checked={formData.clientType === 'Company'} onChange={handleChange} className="hidden" />
                             Company
                         </label>
                         <label className={`px-4 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wide cursor-pointer transition-all ${formData.clientType === 'Individual' ? 'bg-white text-teal-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>
                             <input type="radio" name="clientType" value="Individual" checked={formData.clientType === 'Individual'} onChange={handleChange} className="hidden" />
                             Individual
                         </label>
                     </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase">
                            {formData.clientType === 'Company' ? 'Company Name *' : 'Customer Name *'}
                        </label>
                        <input type="text" name="name" required value={formData.name} onChange={handleChange}
                            data-testid="client-name"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase">Phone</label>
                        <input type="text" name="phone" value={formData.phone} onChange={handleChange}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase">Email</label>
                        <input type="email" name="email" value={formData.email} onChange={handleChange}
                            data-testid="client-email"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase">GST Treatment</label>
                        <select name="gstTreatment" value={formData.gstTreatment} onChange={handleChange} 
                             className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all">
                             <option value="Registered Business">Registered Business</option>
                             <option value="Consumer">Consumer</option>
                             <option value="Overseas">Overseas</option>
                             <option value="SEZ">SEZ</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2">
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase">GSTIN</label>
                            <input type="text" name="gstin" value={formData.gstin} onChange={handleChange} placeholder="ex: 29ABC..."
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all uppercase" />
                        </div>
                        <div className="flex items-end">
                            <button type="button" onClick={fetchGstDetails} disabled={loading} className="w-full py-2 bg-slate-100 text-slate-600 text-sm font-medium rounded-lg border border-slate-200 hover:bg-slate-200 transition-colors disabled:opacity-50">
                                {loading ? 'Fetching...' : 'Fetch'}
                            </button>
                        </div>
                    </div>
                    {formData.gstin && /^[0-9A-Z]{15}$/.test(formData.gstin.trim().toUpperCase()) && (
                        <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg flex items-start gap-2 text-xs text-teal-800 animate-fadeIn mt-2 shadow-sm">
                            <span className="font-bold flex-shrink-0 bg-teal-200 text-teal-800 px-1.5 py-0.5 rounded uppercase text-[10px]">Suggestion</span>
                            <div>
                                Since this client has a GSTIN, TDS defaults have been suggested. You can customize them in the <strong>TDS Configuration</strong> card below.
                            </div>
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase">PAN</label>
                        <input 
                            type="text" 
                            name="pan" 
                            maxLength={10}
                            value={formData.pan} 
                            onChange={(e) => {
                                const val = e.target.value.toUpperCase();
                                setFormData(prev => ({ ...prev, pan: val }));
                                if (panError) {
                                    if (/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(val) || !val) {
                                        setPanError('');
                                    }
                                }
                            }}
                            onBlur={(e) => {
                                const val = e.target.value.toUpperCase();
                                if (val && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(val)) {
                                    setPanError('Invalid PAN format (e.g., ABCDE1234F)');
                                } else {
                                    setPanError('');
                                }
                            }}
                            className={`w-full px-3 py-2 bg-slate-50 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all uppercase ${
                                panError ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500' : 'border-slate-200 focus:ring-teal-500/20 focus:border-teal-500'
                            }`} 
                        />
                        {panError && (
                            <p className="mt-1 text-xs text-red-500 font-medium">{panError}</p>
                        )}
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase">TAN</label>
                        <input type="text" name="tan" value={formData.tan} onChange={handleChange}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all uppercase" />
                    </div>
                </div>
            </div>

            {/* TDS Configuration Card */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wide">TDS Configuration</h3>
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200/60 shadow-sm">
                        <div className="flex flex-col">
                            <span className="text-sm font-semibold text-slate-700">TDS Applicable by default</span>
                            <span className="text-[11px] text-slate-400">Enable TDS defaults for invoices</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                const nextVal = !formData.tds_applicable;
                                setFormData(prev => ({
                                    ...prev,
                                    tds_applicable: nextVal,
                                    default_tds_section: nextVal ? prev.default_tds_section || '194C' : ''
                                }));
                            }}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                formData.tds_applicable ? 'bg-teal-600' : 'bg-slate-200'
                            }`}
                        >
                            <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                    formData.tds_applicable ? 'translate-x-5' : 'translate-x-0'
                                }`}
                            />
                        </button>
                    </div>

                    {formData.tds_applicable && (
                        <div className="p-3 bg-teal-50/30 rounded-lg border border-teal-100/60 space-y-3 transition-all animate-fadeIn">
                             <div>
                                 <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase">Default TDS Section *</label>
                                 <select
                                     name="default_tds_section"
                                     value={formData.default_tds_section}
                                     onChange={(e) => {
                                         const sec = e.target.value;
                                         setFormData(prev => ({
                                             ...prev,
                                             default_tds_section: sec,
                                             default_tds_rate: sec === 'Manual' ? prev.default_tds_rate || 0 : prev.default_tds_rate
                                         }));
                                     }}
                                     className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                                 >
                                     <option value="194C">194C – Contractor (1% / 2%)</option>
                                     <option value="194J">194J – Professional/Technical (10%)</option>
                                     <option value="194I">194I – Rent (10%)</option>
                                     <option value="194A">194A – Interest (10%)</option>
                                     <option value="Manual">Manual (Custom Rate)</option>
                                 </select>
                             </div>
                             <div>
                                 <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase">Default TDS Rate %</label>
                                 <input
                                     type="number"
                                     name="default_tds_rate"
                                     step="0.01"
                                     min="0"
                                     max="100"
                                     value={formData.default_tds_rate}
                                     readOnly={formData.default_tds_section !== 'Manual'}
                                     onChange={(e) => {
                                         if (formData.default_tds_section === 'Manual') {
                                             setFormData(prev => ({
                                                 ...prev,
                                                 default_tds_rate: parseFloat(e.target.value) || 0
                                             }));
                                         }
                                     }}
                                     className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all ${
                                         formData.default_tds_section !== 'Manual' 
                                             ? 'bg-slate-100 text-slate-500 font-medium cursor-not-allowed border-slate-200' 
                                             : 'bg-white border-slate-200 focus:ring-teal-500/20 focus:border-teal-500'
                                     }`}
                                 />
                             </div>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* RIGHT COLUMN - TABS & CONTENT */}
        <div className="w-full lg:w-2/3 flex flex-col gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[500px] flex flex-col">
                {/* Tabs Header */}
                <div className="flex border-b border-slate-100 bg-slate-50/50">
                    {['address', 'other', 'notes', 'balance'].map((tab) => (
                        <button
                            key={tab}
                            type="button"
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-4 text-sm font-medium transition-colors relative ${
                                activeTab === tab 
                                ? 'text-teal-700 bg-white' 
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                            }`}
                        >
                            {tab === 'address' && 'Address'}
                            {tab === 'other' && 'Other Info'}
                            {tab === 'notes' && 'Notes'}
                            {tab === 'balance' && 'Opening Balance'}
                            {activeTab === tab && (
                                <div className="absolute top-0 left-0 w-full h-0.5 bg-teal-500" />
                            )}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="p-8 flex-1">
                    
                    {/* ADDRESS TAB */}
                    {activeTab === 'address' && (
                        <div className="space-y-8 animate-fadeIn">
                             {/* Billing Address */}
                             <div>
                                <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wide">Billing Address</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     <div className="md:col-span-2">
                                        <label className="block text-xs text-slate-500 mb-1">Address Line 1</label>
                                        <input type="text" name="billingAddress.line1" value={formData.billingAddress.line1} onChange={handleChange}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all" />
                                     </div>
                                      <div className="md:col-span-2">
                                        <label className="block text-xs text-slate-500 mb-1">Address Line 2</label>
                                        <input type="text" name="billingAddress.line2" value={formData.billingAddress.line2} onChange={handleChange}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all" />
                                     </div>
                                     <div>
                                        <label className="block text-xs text-slate-500 mb-1">City</label>
                                        <input type="text" name="billingAddress.city" value={formData.billingAddress.city} onChange={handleChange}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all" />
                                     </div>
                                      <div>
                                        <label className="block text-xs text-slate-500 mb-1">State</label>
                                        <input type="text" name="billingAddress.state" value={formData.billingAddress.state} onChange={handleChange}
                                            data-testid="client-billing-state"
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all" />
                                     </div>
                                      <div>
                                        <label className="block text-xs text-slate-500 mb-1">ZIP Code</label>
                                        <input type="text" name="billingAddress.zip" value={formData.billingAddress.zip} onChange={handleChange}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all" />
                                     </div>
                                       <div>
                                        <label className="block text-xs text-slate-500 mb-1">Country</label>
                                        <input type="text" name="billingAddress.country" value={formData.billingAddress.country} onChange={handleChange}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all" />
                                     </div>
                                </div>
                             </div>

                             {/* Shipping Address Logic */}
                             <div>
                                {!showShipping ? (
                                    <button type="button" onClick={() => setShowShipping(true)} className="flex items-center gap-2 text-teal-600 text-sm font-medium hover:text-teal-700">
                                        <FaPlus size={16} /> Add Shipping Address
                                    </button>
                                ) : (
                                    <div className="animate-fadeIn">
                                        <div className="flex justify-between items-center mb-4">
                                            <div className="flex items-center gap-4">
                                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Shipping Address</h3>
                                                <label className="flex items-center gap-2 cursor-pointer bg-teal-50 px-2 py-1 rounded-md border border-teal-100">
                                                    <input 
                                                        type="checkbox" 
                                                        className="w-3.5 h-3.5 accent-teal-600"
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setFormData(prev => ({
                                                                    ...prev,
                                                                    shippingAddress: { ...prev.billingAddress }
                                                                }));
                                                            }
                                                        }} 
                                                    />
                                                    <span className="text-[10px] font-bold text-teal-700 uppercase">Same as Billing Address</span>
                                                </label>
                                            </div>
                                            <button type="button" onClick={() => setShowShipping(false)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                                        </div>
                                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                             <div className="md:col-span-2">
                                                <label className="block text-xs text-slate-500 mb-1">Address Line 1</label>
                                                <input type="text" name="shippingAddress.line1" value={formData.shippingAddress.line1} onChange={handleChange}
                                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all" />
                                             </div>
                                              <div className="md:col-span-2">
                                                <label className="block text-xs text-slate-500 mb-1">Address Line 2</label>
                                                <input type="text" name="shippingAddress.line2" value={formData.shippingAddress.line2} onChange={handleChange}
                                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all" />
                                             </div>
                                             <div>
                                                <label className="block text-xs text-slate-500 mb-1">City</label>
                                                <input type="text" name="shippingAddress.city" value={formData.shippingAddress.city} onChange={handleChange}
                                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all" />
                                             </div>
                                              <div>
                                                <label className="block text-xs text-slate-500 mb-1">State</label>
                                                <input type="text" name="shippingAddress.state" value={formData.shippingAddress.state} onChange={handleChange}
                                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all" />
                                             </div>
                                              <div>
                                                <label className="block text-xs text-slate-500 mb-1">ZIP Code</label>
                                                <input type="text" name="shippingAddress.zip" value={formData.shippingAddress.zip} onChange={handleChange}
                                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all" />
                                             </div>
                                               <div>
                                                <label className="block text-xs text-slate-500 mb-1">Country</label>
                                                <input type="text" name="shippingAddress.country" value={formData.shippingAddress.country} onChange={handleChange}
                                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all" />
                                             </div>
                                         </div>
                                     </div>
                                )}
                             </div>
                        </div>
                    )}

                    {/* OTHER INFO TAB */}
                    {activeTab === 'other' && (
                        <div className="space-y-6 animate-fadeIn">
                            <div className="grid grid-cols-1 gap-6">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase">Facebook</label>
                                    <input type="text" name="facebook" value={formData.facebook} onChange={handleChange} 
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase">LST</label>
                                    <input type="text" name="lst" value={formData.lst} onChange={handleChange} 
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase">CST</label>
                                    <input type="text" name="cst" value={formData.cst} onChange={handleChange} 
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all" />
                                </div>
                                 <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase">D.L No.</label>
                                    <input type="text" name="dlNo" value={formData.dlNo} onChange={handleChange} 
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* NOTES TAB */}
                    {activeTab === 'notes' && (
                        <div className="animate-fadeIn h-full">
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase">Notes</label>
                            <textarea name="notes" value={formData.notes} onChange={handleChange}
                                className="w-full h-48 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all resize-none"
                            ></textarea>
                        </div>
                    )}

                    {/* BALANCE TAB */}
                    {activeTab === 'balance' && (
                         <div className="space-y-6 animate-fadeIn">
                             <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase">Opening Balance</label>
                                <input type="number" name="openingBalance" value={formData.openingBalance} onChange={handleChange}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all" />
                             </div>
                             <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase">Pending Payment</label>
                                <input type="number" name="pendingPayment" value={formData.pendingPayment} readOnly
                                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-500 cursor-not-allowed" />
                             </div>
                         </div>
                    )}
                </div>
            </div>

            {/* CONTACT PERSONS SECTION */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wide flex items-center gap-2">
                    <FaUser size={16} /> Contact Persons
                </h3>
                
                <div className="space-y-4">
                    {/* List Existing Contacts */}
                    {formData.contacts.map((contact, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                             <div className="text-sm">
                                 <span className="font-semibold text-slate-700">{contact.firstName} {contact.lastName}</span>
                                 <div className="text-xs text-slate-500">{contact.email} • {contact.phone}</div>
                             </div>
                             <button type="button" onClick={() => removeContact(index)} className="text-slate-400 hover:text-red-500">
                                 <FaTrash size={16} />
                             </button>
                        </div>
                    ))}

                    {/* Add New Contact Form */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        <input type="text" name="firstName" placeholder="First Name" value={newContact.firstName} onChange={handleContactChange}
                             className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
                        <input type="text" name="lastName" placeholder="Last Name" value={newContact.lastName} onChange={handleContactChange}
                             className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
                        <input type="text" name="phone" placeholder="Phone" value={newContact.phone} onChange={handleContactChange}
                             className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
                        <input type="email" name="email" placeholder="Email" value={newContact.email} onChange={handleContactChange}
                             className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
                    </div>
                    <button type="button" onClick={addContact} className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 mt-4">
                        <FaPlus size={16} /> Add New Contact
                    </button>
                </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex justify-end gap-3 pt-4 pb-8">
                 <button type="button" onClick={onCancel ? onCancel : () => navigate('/clients')}
                    className="px-6 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors shadow-sm">
                     Cancel
                 </button>
                 <button type="submit" disabled={loading}
                    data-testid="save-client"
                    className="px-6 py-2.5 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors shadow-md hover:shadow-lg flex items-center gap-2">
                     <FaSave size={18} />
                     {loading ? 'Saving...' : 'Save Client'}
                 </button>
            </div>
        </div>
      </form>
    </div>
  );
};

export default ClientForm;
