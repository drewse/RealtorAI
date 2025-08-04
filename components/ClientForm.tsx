
'use client';

import { useState, useEffect } from 'react';
import { doc, addDoc, updateDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { Client, ClientFormData } from '@/lib/types';

interface ClientFormProps {
  client?: Client | null;
  onSubmit: (client: ClientFormData) => void;
  onCancel: () => void;
  loading?: boolean;
}

const CLIENT_STATUSES = ['Active', 'Cold', 'Hot Lead'] as const;
const PROPERTY_TYPES = ['Single Family', 'Condo', 'Townhouse', 'Multi-Family', 'Other'] as const;
const URGENCY_LEVELS = ['low', 'medium', 'high'] as const;

export default function ClientForm({ client, onSubmit, onCancel, loading }: ClientFormProps) {
  const { user } = useAuth();
  
  // Basic client information
  const [name, setName] = useState(client?.name || '');
  const [email, setEmail] = useState(client?.email || '');
  const [phone, setPhone] = useState(client?.phone || '');
  const [status, setStatus] = useState<'Active' | 'Cold' | 'Hot Lead'>(client?.status || 'Active');
  const [tagsInput, setTagsInput] = useState(client?.tags?.join(', ') || '');
  
  // Property preferences
  const [priceMin, setPriceMin] = useState(client?.preferences?.priceRange?.min?.toString() || '');
  const [priceMax, setPriceMax] = useState(client?.preferences?.priceRange?.max?.toString() || '');
  const [preferredAreasInput, setPreferredAreasInput] = useState(client?.preferences?.preferredAreas?.join(', ') || '');
  const [propertyTypes, setPropertyTypes] = useState<string[]>(client?.preferences?.propertyTypes || []);
  const [bedroomsMin, setBedroomsMin] = useState(client?.preferences?.bedrooms?.min?.toString() || '');
  const [bedroomsMax, setBedroomsMax] = useState(client?.preferences?.bedrooms?.max?.toString() || '');
  const [bathroomsMin, setBathroomsMin] = useState(client?.preferences?.bathrooms?.min?.toString() || '');
  const [bathroomsMax, setBathroomsMax] = useState(client?.preferences?.bathrooms?.max?.toString() || '');
  const [featuresInput, setFeaturesInput] = useState(client?.preferences?.features?.join(', ') || '');
  const [urgency, setUrgency] = useState<'low' | 'medium' | 'high'>(client?.preferences?.urgency || 'medium');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.uid) {
      alert('You must be logged in to save a client.');
      return;
    }

    if (!name.trim() || !email.trim()) {
      alert('Name and email are required.');
      return;
    }

    // Process tags
    const tags = tagsInput
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    // Process preferred areas
    const preferredAreas = preferredAreasInput
      .split(',')
      .map(area => area.trim())
      .filter(area => area.length > 0);

    // Process features
    const features = featuresInput
      .split(',')
      .map(feature => feature.trim())
      .filter(feature => feature.length > 0);

    const clientData: ClientFormData = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      tags,
      status,
      preferences: {
        priceRange: {
          min: parseInt(priceMin) || 0,
          max: parseInt(priceMax) || 1000000
        },
        preferredAreas,
        propertyTypes,
        bedrooms: {
          min: parseInt(bedroomsMin) || 0,
          max: parseInt(bedroomsMax) || 10
        },
        bathrooms: {
          min: parseInt(bathroomsMin) || 0,
          max: parseInt(bathroomsMax) || 10
        },
        features,
        urgency
      },
      notes: client?.notes || [],
      userId: user.uid,
      createdAt: client?.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    try {
      if (client?.id) {
        // Update existing client
        await updateDoc(doc(db, 'clients', client.id), {
          ...clientData,
          updatedAt: serverTimestamp()
        });
        console.log('✅ Client updated successfully');
      } else {
        // Create new client
        const docRef = await addDoc(collection(db, 'clients'), clientData);
        console.log('✅ Client created successfully:', docRef.id);
      }
      
      onSubmit(clientData);
    } catch (error) {
      console.error('❌ Error saving client:', error);
      alert('Failed to save client. Please try again.');
    }
  };

  const isFormValid = name.trim() && email.trim();

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">
          {client ? 'Edit Client' : 'Create New Client'}
        </h2>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <i className="ri-close-line text-xl"></i>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-300 border-b border-gray-700 pb-2">
            Basic Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                Name *
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-700 rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Client's full name"
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email *
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-700 rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="client@example.com"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-3 border border-gray-700 rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="+1 (555) 123-4567"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-300 mb-2">
                Status
              </label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as 'Active' | 'Cold' | 'Hot Lead')}
                className="w-full px-4 py-3 border border-gray-700 rounded-lg bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {CLIENT_STATUSES.map((statusOption) => (
                  <option key={statusOption} value={statusOption}>
                    {statusOption}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="urgency" className="block text-sm font-medium text-gray-300 mb-2">
                Urgency Level
              </label>
              <select
                id="urgency"
                value={urgency}
                onChange={(e) => setUrgency(e.target.value as 'low' | 'medium' | 'high')}
                className="w-full px-4 py-3 border border-gray-700 rounded-lg bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {URGENCY_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-gray-300 mb-2">
              Tags
              <span className="text-gray-500 text-xs ml-2">(comma-separated)</span>
            </label>
            <input
              type="text"
              id="tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full px-4 py-3 border border-gray-700 rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="first-time buyer, budget-conscious, family"
            />
            {tagsInput && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tagsInput
                  .split(',')
                  .map(tag => tag.trim())
                  .filter(tag => tag.length > 0)
                  .map((tag, index) => (
                    <span key={index} className="px-2 py-1 bg-blue-900/30 text-blue-300 rounded-full text-xs">
                      {tag}
                    </span>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Property Preferences */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-300 border-b border-gray-700 pb-2">
            Property Preferences
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="priceMin" className="block text-sm font-medium text-gray-300 mb-2">
                Minimum Price
              </label>
              <input
                type="number"
                id="priceMin"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                className="w-full px-4 py-3 border border-gray-700 rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0"
                min="0"
              />
            </div>

            <div>
              <label htmlFor="priceMax" className="block text-sm font-medium text-gray-300 mb-2">
                Maximum Price
              </label>
              <input
                type="number"
                id="priceMax"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                className="w-full px-4 py-3 border border-gray-700 rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="1000000"
                min="0"
              />
            </div>
          </div>

          <div>
            <label htmlFor="preferredAreas" className="block text-sm font-medium text-gray-300 mb-2">
              Preferred Areas
              <span className="text-gray-500 text-xs ml-2">(comma-separated)</span>
            </label>
            <input
              type="text"
              id="preferredAreas"
              value={preferredAreasInput}
              onChange={(e) => setPreferredAreasInput(e.target.value)}
              className="w-full px-4 py-3 border border-gray-700 rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Downtown, Westside, North Hills"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Property Types
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {PROPERTY_TYPES.map((type) => (
                <label key={type} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={propertyTypes.includes(type)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setPropertyTypes([...propertyTypes, type]);
                      } else {
                        setPropertyTypes(propertyTypes.filter(t => t !== type));
                      }
                    }}
                    className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <span className="text-sm text-gray-300">{type}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="bedroomsMin" className="block text-sm font-medium text-gray-300 mb-2">
                Minimum Bedrooms
              </label>
              <input
                type="number"
                id="bedroomsMin"
                value={bedroomsMin}
                onChange={(e) => setBedroomsMin(e.target.value)}
                className="w-full px-4 py-3 border border-gray-700 rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="1"
                min="0"
                max="10"
              />
            </div>

            <div>
              <label htmlFor="bedroomsMax" className="block text-sm font-medium text-gray-300 mb-2">
                Maximum Bedrooms
              </label>
              <input
                type="number"
                id="bedroomsMax"
                value={bedroomsMax}
                onChange={(e) => setBedroomsMax(e.target.value)}
                className="w-full px-4 py-3 border border-gray-700 rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="5"
                min="0"
                max="10"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="bathroomsMin" className="block text-sm font-medium text-gray-300 mb-2">
                Minimum Bathrooms
              </label>
              <input
                type="number"
                id="bathroomsMin"
                value={bathroomsMin}
                onChange={(e) => setBathroomsMin(e.target.value)}
                className="w-full px-4 py-3 border border-gray-700 rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="1"
                min="0"
                max="10"
                step="0.5"
              />
            </div>

            <div>
              <label htmlFor="bathroomsMax" className="block text-sm font-medium text-gray-300 mb-2">
                Maximum Bathrooms
              </label>
              <input
                type="number"
                id="bathroomsMax"
                value={bathroomsMax}
                onChange={(e) => setBathroomsMax(e.target.value)}
                className="w-full px-4 py-3 border border-gray-700 rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="3"
                min="0"
                max="10"
                step="0.5"
              />
            </div>
          </div>

          <div>
            <label htmlFor="features" className="block text-sm font-medium text-gray-300 mb-2">
              Desired Features
              <span className="text-gray-500 text-xs ml-2">(comma-separated)</span>
            </label>
            <input
              type="text"
              id="features"
              value={featuresInput}
              onChange={(e) => setFeaturesInput(e.target.value)}
              className="w-full px-4 py-3 border border-gray-700 rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="garage, fireplace, backyard, updated kitchen"
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex space-x-4 pt-4 border-t border-gray-700">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 px-4 border border-gray-600 text-gray-300 hover:text-white hover:border-gray-500 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !isFormValid}
            className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white font-medium rounded-lg transition-colors cursor-pointer flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <i className="ri-save-line"></i>
                <span>{client ? 'Update Client' : 'Create Client'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
