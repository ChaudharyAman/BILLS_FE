import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { Plus, Search, MapPin, Phone, Mail } from 'lucide-react';

const ClientList = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await api.get('/clients');
      setClients(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching clients:', error);
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.gstin?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Clients</h1>
        <Link
          to="/clients/new"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus size={20} />
          Add Client
        </Link>
      </div>

      {/* Search Bar */}
      <div className="mb-6 relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search by name or GSTIN..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="text-center py-10">Loading clients...</div>
      ) : filteredClients.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          No clients found. Add one to get started!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client) => (
            <div key={client._id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-100">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-semibold text-gray-800">{client.name}</h3>
                {client.gstin && (
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded font-mono">
                    {client.gstin}
                  </span> 
                )}
              </div>
              
              <div className="space-y-2 text-sm text-gray-600">
                {client.address && (client.address.city || client.address.state) && (
                  <div className="flex items-start gap-2">
                    <MapPin size={16} className="mt-0.5" />
                    <span>
                      {client.address.line1 && <>{client.address.line1}, <br/></>}
                      {client.address.city}, {client.address.state} {client.address.zip}
                    </span>
                  </div>
                )}
                
                {client.email && (
                  <div className="flex items-center gap-2">
                    <Mail size={16} />
                    <a href={`mailto:${client.email}`} className="hover:text-blue-600">
                      {client.email}
                    </a>
                  </div>
                )}

                {client.phone && (
                  <div className="flex items-center gap-2">
                    <Phone size={16} />
                    <a href={`tel:${client.phone}`} className="hover:text-blue-600">
                      {client.phone}
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClientList;
