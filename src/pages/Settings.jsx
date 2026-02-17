import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Save, Upload, Building } from 'lucide-react';

const Settings = () => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    address: {
      line1: '',
      city: '',
      state: '',
      zip: '',
    },
    gstin: '',
    email: '',
    phone: '',
    website: '',
    logoUrl: '',
    username: '', // Account Username
    loginEmail: '', // Account Email
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/settings');
      if (response.data) {
        setFormData(prev => ({
           ...prev,
           ...response.data,
           address: { ...prev.address, ...(response.data.address || {}) },
           username: response.data.user?.username || '',
           loginEmail: response.data.user?.email || ''
        }));
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
         alert("File size too large. Please upload an image under 5MB.");
         return;
      }
      
      // Store file object for upload
      setFormData(prev => ({ ...prev, logoFile: file }));

      // Preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, logoUrl: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = new FormData();
      
      // Append textual data
      Object.keys(formData).forEach(key => {
        if (key === 'address') {
            Object.keys(formData.address).forEach(addrKey => {
                data.append(`address[${addrKey}]`, formData.address[addrKey]);
            });
        } else if (key !== 'logoFile' && key !== 'logoUrl' && key !== '_id' && key !== 'createdAt' && key !== 'updatedAt' && key !== '__v' && key !== 'user') {
            data.append(key, formData[key]);
        }
      });

      // Append file if exists
      if (formData.logoFile) {
        data.append('logo', formData.logoFile);
      } else if (formData.logoUrl && !formData.logoUrl.startsWith('data:')) {
         // Keep existing URL if no new file uploaded
         data.append('logoUrl', formData.logoUrl);
      }

      const response = await api.put('/settings', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setFormData(prev => ({ ...prev, ...response.data, logoFile: null }));
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Building className="text-teal-600" size={28} />
        <h1 className="text-2xl font-bold text-gray-800">Company Settings</h1>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Logo Section */}
          <div className="flex flex-col md:flex-row gap-8 items-start border-b border-gray-100 pb-6">
            <div className="w-full md:w-1/3">
               <label className="block text-sm font-medium text-gray-700 mb-2">Company Logo</label>
               <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center min-h-[160px] bg-gray-50 hover:bg-gray-100 transition-colors relative">
                  {formData.logoUrl ? (
                    <div className="relative w-full flex justify-center">
                        <img src={formData.logoUrl} alt="Company Logo" className="max-h-32 object-contain" />
                        <button 
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, logoUrl: '' }))}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 w-6 h-6 flex items-center justify-center text-xs shadow-sm hover:bg-red-600"
                          title="Remove Logo"
                        >
                            ✕
                        </button>
                    </div>
                  ) : (
                    <div className="text-center text-gray-400">
                      <div className="mx-auto w-12 h-12 mb-2 bg-gray-200 rounded-full flex items-center justify-center">
                        <Upload size={20} />
                      </div>
                      <span className="text-xs">Click to upload logo</span>
                      <span className="block text-[10px] mt-1">(Max 500KB)</span>
                    </div>
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={handleLogoUpload}
                  />
               </div>
               <p className="text-xs text-gray-500 mt-2 text-center">Appears on your invoices.</p>
            </div>

            <div className="w-full md:w-2/3 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                  <input
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 p-2 border"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label>
                  <input
                    type="text"
                    name="gstin"
                    value={formData.gstin}
                    onChange={handleChange}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 p-2 border uppercase"
                    placeholder="e.g. 29ABCDE1234F1Z5"
                  />
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 p-2 border"
                    />
                    </div>
                    <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                        type="text"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 p-2 border"
                    />
                    </div>
                </div>
            </div>
          </div>

          {/* Address Section */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Address Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                <input
                  type="text"
                  name="address.line1"
                  value={formData.address?.line1}
                  onChange={handleChange}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 p-2 border"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  name="address.city"
                  value={formData.address?.city}
                  onChange={handleChange}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 p-2 border"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                    <input
                    type="text"
                    name="address.state"
                    value={formData.address?.state}
                    onChange={handleChange}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 p-2 border"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Zip Code</label>
                    <input
                    type="text"
                    name="address.zip"
                    value={formData.address?.zip}
                    onChange={handleChange}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 p-2 border"
                    />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-100">
            <button
              type="submit"
              disabled={loading}
              className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 rounded-lg flex items-center gap-2 font-medium shadow-sm transition-colors disabled:opacity-50"
            >
              <Save size={20} />
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Settings;
