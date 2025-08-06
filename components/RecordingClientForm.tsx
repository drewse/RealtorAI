'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import ClientSelector from '@/components/ClientSelector';
import TagInput from '@/components/TagInput';

interface RecordingClientFormProps {
  onSubmit: (data: {
    clientName: string;
    clientEmail: string;
    clientPhone: string;
    tags: string[];
    propertyAddress: string;
    propertyId: string;
    propertyContext?: EnhancedPropertyContext;
    agentNotes?: string;
    sessionType: string;
    consentGiven: boolean;
    scheduledAt?: Date;
    selectedClientId?: string;
  }) => void;
  loading?: boolean;
}

interface Property {
  id: string;
  address: string;
  propertyType?: string;
  price?: number;
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  lotSize?: number;
  yearBuilt?: number;
  parking?: string;
  propertyFeatures?: string[];
  status?: string;
  images?: string[];
}

interface EnhancedPropertyContext {
  address: string;
  propertyType: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  lotSize?: number;
  yearBuilt?: number;
  parking?: string;
  propertyFeatures: string[];
  status: string;
  images: string[];
}

const SESSION_TYPES = [
  'In-Person',
  'Virtual',
  'Open House',
  'Follow-up Call'
];

export default function RecordingClientForm({ onSubmit, loading }: RecordingClientFormProps) {
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [selectedProperty, setSelectedProperty] = useState('');
  const [properties, setProperties] = useState<Property[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // Enhanced form fields
  const [agentNotes, setAgentNotes] = useState('');
  const [sessionType, setSessionType] = useState('In-Person');
  const [consentGiven, setConsentGiven] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  
  // Client selector
  const [selectedClientId, setSelectedClientId] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  const { user } = useAuth();

  // Firebase: Load enhanced properties for current user
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'properties'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const propertiesData = snapshot.docs.map(doc => ({
        id: doc.id,
        address: doc.data().address,
        propertyType: doc.data().propertyType || 'Single Family',
        price: doc.data().price || 0,
        bedrooms: doc.data().bedrooms || 0,
        bathrooms: doc.data().bathrooms || 0,
        sqft: doc.data().sqft || 0,
        lotSize: doc.data().lotSize,
        yearBuilt: doc.data().yearBuilt,
        parking: doc.data().parking,
        propertyFeatures: doc.data().propertyFeatures || [],
        status: doc.data().status || 'Active',
        images: doc.data().images || []
      })) as Property[];

      setProperties(propertiesData);
    });

    return unsubscribe;
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (clientName.trim() && clientEmail.trim() && selectedProperty && consentGiven) {
      const property = properties.find(p => p.id === selectedProperty);
      if (property) {
        // Tags are already processed as an array

        // Create enhanced property context for AI integration
        const propertyContext: EnhancedPropertyContext = {
          address: property.address,
          propertyType: property.propertyType || 'Single Family',
          price: property.price || 0,
          bedrooms: property.bedrooms || 0,
          bathrooms: property.bathrooms || 0,
          sqft: property.sqft || 0,
          lotSize: property.lotSize,
          yearBuilt: property.yearBuilt,
          parking: property.parking,
          propertyFeatures: property.propertyFeatures || [],
          status: property.status || 'Active',
          images: property.images || []
        };

        console.log('🏠 ENHANCED PROPERTY CONTEXT FOR AI:', propertyContext);

        // Save session data to Firestore
        if (user?.uid) {
          try {
            const sessionData = {
              client: {
                name: clientName.trim(),
                email: clientEmail.trim(),
                phone: clientPhone.trim()
              },
              propertyId: property.id,
              propertyAddress: property.address,
              tags: tags,
              notes: agentNotes.trim() || null,
              sessionType: sessionType,
              consentGiven: consentGiven,
              scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
              createdAt: serverTimestamp(),
              userId: user.uid,
              status: 'initialized'
            };

            console.log("Client data being saved:", sessionData);

            const sessionRef = await addDoc(collection(db, 'sessions'), sessionData);
            console.log('✅ Session saved to Firestore:', sessionRef.id);

            onSubmit({
              clientName: clientName.trim(),
              clientEmail: clientEmail.trim(),
              clientPhone: clientPhone.trim(),
              tags,
              propertyAddress: property.address,
              propertyId: property.id,
              propertyContext,
              agentNotes: agentNotes.trim() || undefined,
              sessionType: sessionType,
              consentGiven: consentGiven,
              scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
              selectedClientId: selectedClientId || undefined
            });

          } catch (error) {
            console.error('❌ Error saving session:', error);
            alert('Failed to save session data. Please try again.');
          }
        }
      }
    }
  };

  const handlePropertySelect = (property: Property) => {
    setSelectedProperty(property.id);
    setShowDropdown(false);
  };

  const selectedPropertyData = properties.find(p => p.id === selectedProperty);

  const isFormValid = clientName.trim() && 
                      clientEmail.trim() && 
                      selectedProperty && 
                      consentGiven;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Recording Quality Reminder Banner */}
      <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4 mb-6">
        <div className="flex items-start space-x-3">
          <div className="w-5 h-5 flex items-center justify-center mt-0.5">
            <i className="ri-mic-line text-blue-400"></i>
          </div>
          <div>
            <p className="text-blue-300 text-sm font-medium mb-1">🎙️ For best results:</p>
            <p className="text-blue-200 text-sm">Ensure your microphone is clear and background noise is minimal.</p>
          </div>
        </div>
      </div>

      {/* Client Selector */}
      <ClientSelector
        selectedClientId={selectedClientId}
        onClientSelect={(client) => {
          if (client) {
            setSelectedClientId(client.id);
            setClientName(client.name);
            setClientEmail(client.email);
            setClientPhone(client.phone || '');
            setTags(client.tags);
          } else {
            setSelectedClientId('');
            setClientName('');
            setClientEmail('');
            setClientPhone('');
            setTags([]);
          }
        }}
        showDropdown={showClientDropdown}
        onToggleDropdown={() => setShowClientDropdown(!showClientDropdown)}
      />

      <div>
        <label htmlFor="clientName" className="block text-sm font-medium text-gray-300 mb-2">
          Client Name *
        </label>
        <input
          type="text"
          id="clientName"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          className="w-full px-4 py-3 border border-gray-700 rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          placeholder="Enter client name"
          required
        />
      </div>

      <div>
        <label htmlFor="clientEmail" className="block text-sm font-medium text-gray-300 mb-2">
          Client Email *
        </label>
        <input
          type="email"
          id="clientEmail"
          value={clientEmail}
          onChange={(e) => setClientEmail(e.target.value)}
          className="w-full px-4 py-3 border border-gray-700 rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          placeholder="client@example.com"
          required
        />
      </div>

      <div>
        <label htmlFor="clientPhone" className="block text-sm font-medium text-gray-300 mb-2">
          Client Phone
        </label>
        <input
          type="tel"
          id="clientPhone"
          value={clientPhone}
          onChange={(e) => setClientPhone(e.target.value)}
          className="w-full px-4 py-3 border border-gray-700 rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          placeholder="+1 (555) 123-4567"
        />
      </div>

      {/* Enhanced Tags Input Field */}
      <TagInput
        value={tags}
        onChange={setTags}
        placeholder="first-time buyer, budget-conscious, family"
        label="Tags"
      />

      {/* NEW: Agent Notes Field */}
      <div>
        <label htmlFor="agentNotes" className="block text-sm font-medium text-gray-300 mb-2">
          Agent Notes (Optional)
        </label>
        <textarea
          id="agentNotes"
          value={agentNotes}
          onChange={(e) => setAgentNotes(e.target.value.slice(0, 1000))}
          rows={3}
          className="w-full px-4 py-3 border border-gray-700 rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
          placeholder="Include any special instructions or client context to improve the AI analysis..."
          maxLength={1000}
        />
        <div className="flex justify-between items-center mt-1">
          <p className="text-xs text-gray-500">Special instructions or context for better AI analysis</p>
          <span className="text-xs text-gray-500">{agentNotes.length}/1000</span>
        </div>
      </div>

      {/* NEW: Session Type Dropdown */}
      <div>
        <label htmlFor="sessionType" className="block text-sm font-medium text-gray-300 mb-2">
          Session Type
        </label>
        <select
          id="sessionType"
          value={sessionType}
          onChange={(e) => setSessionType(e.target.value)}
          className="w-full px-4 py-3 pr-8 border border-gray-700 rounded-lg bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        >
          {SESSION_TYPES.map((type) => (
            <option key={type} value={type} className="bg-gray-800">
              {type}
            </option>
          ))}
        </select>
      </div>

      {/* NEW: Optional Session Date Field */}
      <div>
        <label htmlFor="scheduledAt" className="block text-sm font-medium text-gray-300 mb-2">
          Session Date (Optional)
        </label>
        <input
          type="datetime-local"
          id="scheduledAt"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          className="w-full px-4 py-3 border border-gray-700 rounded-lg bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        />
        <p className="text-xs text-gray-500 mt-1">Leave empty if recording right now</p>
      </div>

      <div className="relative">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Property Address *
        </label>
        <button
          type="button"
          onClick={() => setShowDropdown(!showDropdown)}
          className="w-full px-4 py-3 border border-gray-700 rounded-lg bg-gray-800 text-white text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm flex items-center justify-between"
        >
          <div className="flex-1">
            {selectedPropertyData ? (
              <div>
                <div className="text-white">{selectedPropertyData.address}</div>
                <div className="text-xs text-gray-400 mt-1 flex items-center space-x-2">
                  <span>{selectedPropertyData.propertyType}</span>
                  <span>•</span>
                  <span>${selectedPropertyData.price?.toLocaleString()}</span>
                  <span>•</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-xs ${selectedPropertyData.status === 'Active' ? 'bg-green-900/30 text-green-300' : selectedPropertyData.status === 'Coming Soon' ? 'bg-yellow-900/30 text-yellow-300' : 'bg-red-900/30 text-red-300'}`}>
                    {selectedPropertyData.status}
                  </span>
                </div>
                {selectedPropertyData.propertyFeatures && selectedPropertyData.propertyFeatures.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedPropertyData.propertyFeatures.slice(0, 3).map((feature, index) => (
                      <span key={index} className="px-1.5 py-0.5 bg-blue-900/20 text-blue-400 rounded text-xs">
                        {feature}
                      </span>
                    ))}
                    {selectedPropertyData.propertyFeatures.length > 3 && (
                      <span className="px-1.5 py-0.5 bg-gray-700 text-gray-400 rounded text-xs">
                        +{selectedPropertyData.propertyFeatures.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <span className="text-gray-400">Select a property...</span>
            )}
          </div>
          <div className="w-4 h-4 flex items-center justify-center">
            <i className={`ri-arrow-${showDropdown ? 'up' : 'down'}-s-line text-gray-400`}></i>
          </div>
        </button>

        {showDropdown && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
            {properties.length === 0 ? (
              <div className="px-4 py-3 text-gray-400 text-sm">
                No properties found. Add properties first.
              </div>
            ) : (
              properties.map((property) => (
                <button
                  key={property.id}
                  type="button"
                  onClick={() => handlePropertySelect(property)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors text-sm cursor-pointer border-b border-gray-700 last:border-b-0"
                >
                  <div className="text-white">{property.address}</div>
                  <div className="text-xs text-gray-400 mt-1 flex items-center space-x-2">
                    <span>{property.propertyType}</span>
                    <span>•</span>
                    <span>${property.price?.toLocaleString()}</span>
                    <span>•</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-xs ${property.status === 'Active' ? 'bg-green-900/30 text-green-300' : property.status === 'Coming Soon' ? 'bg-yellow-900/30 text-yellow-300' : 'bg-red-900/30 text-red-300'}`}>
                      {property.status}
                    </span>
                  </div>
                  {property.propertyFeatures && property.propertyFeatures.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {property.propertyFeatures.slice(0, 2).map((feature, index) => (
                        <span key={index} className="px-1.5 py-0.5 bg-blue-900/20 text-blue-400 rounded text-xs">
                          {feature}
                        </span>
                      ))}
                      {property.propertyFeatures.length > 2 && (
                        <span className="px-1.5 py-0.5 bg-gray-700 text-gray-400 rounded text-xs">
                          +{property.propertyFeatures.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* NEW: Recording Consent Checkbox */}
      <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <input
            type="checkbox"
            id="consentGiven"
            checked={consentGiven}
            onChange={(e) => setConsentGiven(e.target.checked)}
            className="mt-1 w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
            required
          />
          <label htmlFor="consentGiven" className="text-sm text-yellow-200">
            <span className="font-medium">✅ I have received consent from the client to record this session.</span>
            <p className="text-xs text-yellow-300 mt-1">Required before starting any recording session</p>
          </label>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !isFormValid}
        className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap flex items-center justify-center space-x-2"
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>Processing...</span>
          </>
        ) : (
          <>
            <div className="w-4 h-4 flex items-center justify-center">
              <i className="ri-mic-line"></i>
            </div>
            <span>Start Recording</span>
          </>
        )}
      </button>

      {!consentGiven && (
        <p className="text-xs text-red-400 text-center">
          Please confirm you have client consent before proceeding
        </p>
      )}
    </form>
  );
} 