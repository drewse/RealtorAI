
'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, updateDoc, arrayUnion } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import AuthGuard from '@/components/AuthGuard';
import Header from '@/components/Header';
import Navigation from '@/components/Navigation';
import PropertyForm from '@/components/PropertyForm';
import PropertyList from '@/components/PropertyList';
import PropertyStatusHistory from '@/components/PropertyStatusHistory';
import Toast from '@/components/Toast';
import { v4 as uuidv4 } from 'uuid';

interface Property {
  id: string;
  address: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  description: string;
  propertyType: string;
  lotSize?: number;
  yearBuilt?: number;
  parking?: string;
  propertyFeatures: string[];
  mlsNumber?: string;
  status: 'Active' | 'Coming Soon' | 'Sold';
  images: string[];
  clients: Client[];
  recordingCount?: number; 
  createdAt: any;
  statusHistory: PropertyStatusHistory[];
  priceHistory: PropertyPriceHistory[];
}

interface PropertyStatusHistory {
  id: string;
  fromStatus?: 'Active' | 'Coming Soon' | 'Sold';
  toStatus: 'Active' | 'Coming Soon' | 'Sold';
  changedBy: string;
  changedAt: any;
  reason?: string;
  notes?: string;
}

interface PropertyPriceHistory {
  id: string;
  fromPrice?: number;
  toPrice: number;
  changedBy: string;
  changedAt: any;
  reason?: string;
  notes?: string;
}

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  showingDate?: string;
  status: 'interested' | 'not_interested' | 'pending';
}

interface Recording {
  id: string;
  propertyId?: string;
}

type StatusTab = 'Active' | 'Coming Soon' | 'Sold';

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isEditingProperty, setIsEditingProperty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  // DEFAULT: Start with Active properties tab as the default view
  const [activeTab, setActiveTab] = useState<StatusTab>('Active');
  const [defaultViewLoaded, setDefaultViewLoaded] = useState(false);

  const { user } = useAuth();

  // Helper function to show toast notifications
  const displayToast = (message: string, type: 'success' | 'error') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
  };

  // Initialize default view for Properties page
  useEffect(() => {
    if (!defaultViewLoaded && user && !loading) {
      // Ensure we're showing the Active tab by default
      setActiveTab('Active');
      setDefaultViewLoaded(true);
    }
  }, [user, loading, defaultViewLoaded]);

  // Enhanced useEffect with better user authentication debugging
  useEffect(() => {
    console.log('=== PROPERTIES QUERY DEBUG ===');
    console.log('User state:', { user, uid: user?.uid, isAuthenticated: !!user });

    // Don't run query until user is authenticated
    if (!user || !user.uid) {
      console.log('User not authenticated yet, skipping properties query');
      setLoading(true);
      return;
    }

    console.log('Starting Firestore query for userId:', user.uid);

    // Query with proper filtering and ordering
    const q = query(
      collection(db, 'properties'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('Firestore snapshot received:', { 
        size: snapshot.size, 
        empty: snapshot.empty,
        docs: snapshot.docs.length 
      });

      const propertiesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Property[];

      console.log('Processed properties data:', propertiesData);

      setProperties(propertiesData);
      setLoading(false);
    }, (error) => {
      console.error('Firestore query error:', error);
      setLoading(false);
      setErrorMessage('Failed to load properties. Please try again.');
    });

    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'recordings'),
      where('uid', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const recordingsData = snapshot.docs.map(doc => ({
        id: doc.id,
        propertyId: doc.data().propertyId,
      })) as Recording[];

      setRecordings(recordingsData);
    });

    return unsubscribe;
  }, [user]);

  // Filter properties by status - DEFAULT: Active properties
  const filteredProperties = properties.filter(property => property.status === activeTab);

  const getRecordingCount = (propertyId: string): number => {
    return recordings.filter(recording => recording.propertyId === propertyId).length;
  };

  const handleAddProperty = async (propertyData: Omit<Property, 'id' | 'clients' | 'createdAt' | 'statusHistory' | 'priceHistory'>) => {
    console.log('=== ENHANCED FIRESTORE PROPERTY SAVE DEBUG ===');
    console.log('1. Enhanced property data received:', propertyData);

    try {
      const currentUser = auth.currentUser;
      console.log('2. Current user check:', {
        user: currentUser,
        uid: currentUser?.uid,
        isLoggedIn: !!currentUser
      });

      if (!currentUser || !currentUser.uid) {
        const errorMsg = "You must be logged in to add a property.";
        console.error('3. AUTHENTICATION ERROR:', errorMsg);
        displayToast(errorMsg, 'error');
        return;
      }

      const validationResult = {
        address: !!propertyData.address && propertyData.address.trim().length > 0,
        price: !!propertyData.price && !isNaN(propertyData.price) && propertyData.price > 0,
        bedrooms: !!propertyData.bedrooms && !isNaN(propertyData.bedrooms),
        bathrooms: !!propertyData.bathrooms && !isNaN(propertyData.bathrooms),
        sqft: !!propertyData.sqft && !isNaN(propertyData.sqft) && propertyData.sqft > 0,
        propertyType: !!propertyData.propertyType && propertyData.propertyType.trim().length > 0,
        status: !!propertyData.status && propertyData.status.trim().length > 0
      };

      console.log('3. Enhanced field validation results:', validationResult);
      console.log('4. Enhanced detailed field values:', {
        address: { value: propertyData.address, type: typeof propertyData.address },
        price: { value: propertyData.price, type: typeof propertyData.price },
        bedrooms: { value: propertyData.bedrooms, type: typeof propertyData.bedrooms },
        bathrooms: { value: propertyData.bathrooms, type: typeof propertyData.bathrooms },
        sqft: { value: propertyData.sqft, type: typeof propertyData.sqft },
        propertyType: { value: propertyData.propertyType, type: typeof propertyData.propertyType },
        status: { value: propertyData.status, type: typeof propertyData.status },
        propertyFeatures: { value: propertyData.propertyFeatures, length: propertyData.propertyFeatures.length },
        images: { value: propertyData.images, length: propertyData.images.length }
      });

      const isValid = Object.values(validationResult).every(result => result === true);
      if (!isValid) {
        const errorMsg = "Please fill in all required fields with valid values.";
        console.error('5. VALIDATION ERROR:', errorMsg, validationResult);
        setErrorMessage(errorMsg);
        alert(errorMsg); 
        return;
      }

      setErrorMessage('');
      setSuccessMessage('');

      const now = serverTimestamp();
      const currentTimestamp = new Date();

      // Enhanced property document with all new fields and history
      const propertyToSave = {
        address: propertyData.address.trim(),
        price: Number(propertyData.price),
        bedrooms: Number(propertyData.bedrooms),
        bathrooms: Number(propertyData.bathrooms),
        sqft: Number(propertyData.sqft),
        description: propertyData.description ? propertyData.description.trim() : '',
        propertyType: propertyData.propertyType,
        lotSize: propertyData.lotSize ? Number(propertyData.lotSize) : null,
        yearBuilt: propertyData.yearBuilt ? Number(propertyData.yearBuilt) : null,
        parking: propertyData.parking ? propertyData.parking.trim() : null,
        propertyFeatures: propertyData.propertyFeatures || [],
        mlsNumber: propertyData.mlsNumber ? propertyData.mlsNumber.trim() : null,
        status: propertyData.status,
        images: propertyData.images || [],
        userId: currentUser.uid,
        clients: [],
        // FIXED: Use regular Date objects instead of serverTimestamp() inside arrays
        statusHistory: [{
          id: uuidv4(),
          toStatus: propertyData.status,
          changedBy: currentUser.uid,
          changedAt: currentTimestamp,
          reason: 'Property created',
          notes: 'Initial property listing'
        }],
        priceHistory: [{
          id: uuidv4(),
          toPrice: Number(propertyData.price),
          changedBy: currentUser.uid,
          changedAt: currentTimestamp,
          reason: 'Initial listing price',
          notes: 'Property created with initial price'
        }],
        createdAt: now,
      };

      console.log('6. Final enhanced document to save:', propertyToSave);
      console.log('7. Firestore collection reference:', collection(db, 'properties'));
      console.log('8. Attempting enhanced addDoc to Firestore...');

      const docRef = await addDoc(collection(db, 'properties'), propertyToSave);

      console.log('9. SUCCESS: Enhanced document saved with ID:', docRef.id);
      console.log('=== END ENHANCED FIRESTORE DEBUG ===');

      const successMsg = `Property "${propertyData.address}" added successfully!`;
      displayToast(successMsg, 'success');
      setShowAddForm(false);

    } catch (error) {
      console.error('=== ENHANCED FIRESTORE ERROR DEBUG ===');
      console.error('Error details:', error);
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('=== END ENHANCED ERROR DEBUG ===');

      const errorMsg = `Failed to add property: ${error instanceof Error ? error.message : 'Unknown error'}`;
      displayToast(errorMsg, 'error');
    }
  };

  const handleDeleteProperty = async (propertyId: string) => {
    try {
      await deleteDoc(doc(db, 'properties', propertyId));
    } catch (error) {
      console.error('Error deleting property:', error);
    }
  };

  // NEW: Handle property updates
  const handleUpdateProperty = async (propertyData: Omit<Property, 'id' | 'clients' | 'createdAt' | 'statusHistory' | 'priceHistory'>) => {
    if (!selectedProperty || !user?.uid) return;

    console.log('=== PROPERTY UPDATE DEBUG ===');
    console.log('1. Property data received:', propertyData);
    console.log('2. Selected property ID:', selectedProperty.id);

    try {
      // Validate required fields
      const validationResult = {
        address: !!propertyData.address && propertyData.address.trim().length > 0,
        price: !!propertyData.price && !isNaN(propertyData.price) && propertyData.price > 0,
        bedrooms: !!propertyData.bedrooms && !isNaN(propertyData.bedrooms),
        bathrooms: !!propertyData.bathrooms && !isNaN(propertyData.bathrooms),
        sqft: !!propertyData.sqft && !isNaN(propertyData.sqft) && propertyData.sqft > 0,
        propertyType: !!propertyData.propertyType && propertyData.propertyType.trim().length > 0,
        status: !!propertyData.status && propertyData.status.trim().length > 0
      };

      console.log('3. Field validation results:', validationResult);

      if (!validationResult.address || !validationResult.price || !validationResult.sqft || 
          !validationResult.propertyType || !validationResult.status) {
        const errorMsg = 'Please fill in all required fields with valid values.';
        console.error('4. VALIDATION ERROR:', errorMsg);
        displayToast(errorMsg, 'error');
        return;
      }

      const now = new Date();
      const currentTimestamp = now.toISOString();

      // Check if status or price changed to add to history
      const statusChanged = selectedProperty.status !== propertyData.status;
      const priceChanged = selectedProperty.price !== propertyData.price;

      // Prepare update data
      const updateData: any = {
        address: propertyData.address.trim(),
        price: Number(propertyData.price),
        bedrooms: Number(propertyData.bedrooms),
        bathrooms: Number(propertyData.bathrooms),
        sqft: Number(propertyData.sqft),
        description: propertyData.description ? propertyData.description.trim() : '',
        propertyType: propertyData.propertyType,
        lotSize: propertyData.lotSize ? Number(propertyData.lotSize) : null,
        yearBuilt: propertyData.yearBuilt ? Number(propertyData.yearBuilt) : null,
        parking: propertyData.parking ? propertyData.parking.trim() : null,
        propertyFeatures: propertyData.propertyFeatures || [],
        mlsNumber: propertyData.mlsNumber ? propertyData.mlsNumber.trim() : null,
        status: propertyData.status,
        images: propertyData.images || [],
        updatedAt: serverTimestamp(),
      };

      // Add status history if status changed
      if (statusChanged) {
        const statusHistoryEntry = {
          id: uuidv4(),
          fromStatus: selectedProperty.status,
          toStatus: propertyData.status,
          changedBy: user.uid,
          changedAt: currentTimestamp,
          reason: 'Property details updated',
          notes: 'Status changed during property update'
        };
        updateData.statusHistory = arrayUnion(statusHistoryEntry);
      }

      // Add price history if price changed
      if (priceChanged) {
        const priceHistoryEntry = {
          id: uuidv4(),
          fromPrice: selectedProperty.price,
          toPrice: Number(propertyData.price),
          changedBy: user.uid,
          changedAt: currentTimestamp,
          reason: 'Property details updated',
          notes: 'Price changed during property update'
        };
        updateData.priceHistory = arrayUnion(priceHistoryEntry);
      }

      console.log('5. Final update data:', updateData);
      console.log('6. Updating property document...');

      const propertyRef = doc(db, 'properties', selectedProperty.id);
      await updateDoc(propertyRef, updateData);

      console.log('7. SUCCESS: Property updated successfully');
      console.log('=== END PROPERTY UPDATE DEBUG ===');

      const successMsg = `Property "${propertyData.address}" updated successfully!`;
              displayToast(successMsg, 'success');
      
      // Exit edit mode and refresh the selected property
      setIsEditingProperty(false);
      setSelectedProperty(null);

    } catch (error) {
      console.error('=== PROPERTY UPDATE ERROR DEBUG ===');
      console.error('Error details:', error);
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('=== END PROPERTY UPDATE ERROR DEBUG ===');

      const errorMsg = `Failed to update property: ${error instanceof Error ? error.message : 'Unknown error'}`;
              displayToast(errorMsg, 'error');
    }
  };

  // FIXED: Handle status change with history tracking using regular Date
  const handleStatusChange = async (propertyId: string, newStatus: 'Active' | 'Coming Soon' | 'Sold', reason?: string, notes?: string) => {
    if (!user?.uid) return;

    try {
      const property = properties.find(p => p.id === propertyId);
      if (!property) return;

      const statusHistoryEntry = {
        id: uuidv4(),
        fromStatus: property.status,
        toStatus: newStatus,
        changedBy: user.uid,
        changedAt: new Date(), // FIXED: Use regular Date instead of serverTimestamp()
        reason: reason || `Status changed to ${newStatus}`,
        notes: notes || ''
      };

      const propertyRef = doc(db, 'properties', propertyId);
      await updateDoc(propertyRef, {
        status: newStatus,
        statusHistory: arrayUnion(statusHistoryEntry),
        updatedAt: serverTimestamp()
      });

      console.log(`✅ Property status updated to ${newStatus}`);
    } catch (error) {
      console.error('❌ Error updating property status:', error);
    }
  };

  // FIXED: Handle price change with history tracking using regular Date
  const handlePriceChange = async (propertyId: string, newPrice: number, reason?: string, notes?: string) => {
    if (!user?.uid) return;

    try {
      const property = properties.find(p => p.id === propertyId);
      if (!property) return;

      const priceHistoryEntry = {
        id: uuidv4(),
        fromPrice: property.price,
        toPrice: newPrice,
        changedBy: user.uid,
        changedAt: new Date(), // FIXED: Use regular Date instead of serverTimestamp()
        reason: reason || 'Price updated',
        notes: notes || ''
      };

      const propertyRef = doc(db, 'properties', propertyId);
      await updateDoc(propertyRef, {
        price: newPrice,
        priceHistory: arrayUnion(priceHistoryEntry),
        updatedAt: serverTimestamp()
      });

      console.log(`✅ Property price updated to $${newPrice.toLocaleString()}`);
    } catch (error) {
      console.error('❌ Error updating property price:', error);
    }
  };

  const getStatusCount = (status: StatusTab): number => {
    return properties.filter(property => property.status === status).length;
  };

  if (selectedProperty) {
    const recordingCount = getRecordingCount(selectedProperty.id);

    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-900 pb-20">
          <Header />

          <div className="max-w-md mx-auto px-4 py-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => {
                    setSelectedProperty(null);
                    setIsEditingProperty(false);
                  }}
                  className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    <i className="ri-arrow-left-line text-xl"></i>
                  </div>
                </button>
                <div>
                  <h1 className="text-xl font-bold text-white">Property Details</h1>
                  <p className="text-gray-400 text-sm">{selectedProperty.address}</p>
                </div>
              </div>
              
              {/* Edit Button */}
              {!isEditingProperty && (
                <button
                  onClick={() => setIsEditingProperty(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors cursor-pointer flex items-center space-x-2"
                >
                  <div className="w-4 h-4 flex items-center justify-center">
                    <i className="ri-edit-line"></i>
                  </div>
                  <span>Edit</span>
                </button>
              )}
            </div>

            {/* Edit Property Form */}
            {isEditingProperty && (
              <PropertyForm
                onSubmit={handleUpdateProperty}
                onCancel={() => setIsEditingProperty(false)}
                loading={false}
                isEditing={true}
                initialData={{
                  address: selectedProperty.address,
                  price: selectedProperty.price,
                  bedrooms: selectedProperty.bedrooms,
                  bathrooms: selectedProperty.bathrooms,
                  sqft: selectedProperty.sqft,
                  description: selectedProperty.description,
                  propertyType: selectedProperty.propertyType,
                  lotSize: selectedProperty.lotSize,
                  yearBuilt: selectedProperty.yearBuilt,
                  parking: selectedProperty.parking,
                  propertyFeatures: selectedProperty.propertyFeatures,
                  mlsNumber: selectedProperty.mlsNumber,
                  status: selectedProperty.status,
                  images: selectedProperty.images
                }}
              />
            )}

            {/* Enhanced Property Images */}
            {!isEditingProperty && selectedProperty.images && selectedProperty.images.length > 0 && (
              <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
                <div className="grid grid-cols-2 gap-1">
                  {selectedProperty.images.slice(0, 4).map((imageUrl, index) => (
                    <div key={index} className={`${index === 0 && selectedProperty.images.length === 1 ? 'col-span-2' : ''} aspect-square`}>
                      <img
                        src={imageUrl}
                        alt={`Property ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                  {selectedProperty.images.length > 4 && (
                    <div className="absolute bottom-2 right-2 bg-black/60 text-white px-2 py-1 rounded text-xs">
                      +{selectedProperty.images.length - 4} more
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Enhanced Property Details */}
            {!isEditingProperty && (
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Status</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${ 
                      selectedProperty.status === 'Active' ? 'bg-green-900/30 text-green-300' :
                      selectedProperty.status === 'Coming Soon' ? 'bg-yellow-900/30 text-yellow-300' :
                      'bg-red-900/30 text-red-300'
                    }`}>
                      {selectedProperty.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Property Type</span>
                    <span className="text-white font-medium">{selectedProperty.propertyType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Price</span>
                    <span className="text-white font-medium">${selectedProperty.price.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Bedrooms</span>
                    <span className="text-white">{selectedProperty.bedrooms}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Bathrooms</span>
                    <span className="text-white">{selectedProperty.bathrooms}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Square Feet</span>
                    <span className="text-white">{selectedProperty.sqft.toLocaleString()}</span>
                  </div>
                  {selectedProperty.lotSize && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Lot Size</span>
                      <span className="text-white">{selectedProperty.lotSize.toLocaleString()} sq ft</span>
                    </div>
                  )}
                  {selectedProperty.yearBuilt && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Year Built</span>
                      <span className="text-white">{selectedProperty.yearBuilt}</span>
                    </div>
                  )}
                  {selectedProperty.parking && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Parking</span>
                      <span className="text-white">{selectedProperty.parking}</span>
                    </div>
                  )}
                  {selectedProperty.mlsNumber && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">MLS Number</span>
                      <span className="text-white">{selectedProperty.mlsNumber}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-400">Linked Recordings</span>
                    <span className="text-blue-400 font-medium">{recordingCount}</span>
                  </div>
                </div>
                
                {/* Property Features */}
                {selectedProperty.propertyFeatures && selectedProperty.propertyFeatures.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <h4 className="text-gray-400 text-sm font-medium mb-2">Features</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedProperty.propertyFeatures.map((feature, index) => (
                        <span key={index} className="px-2 py-1 bg-blue-900/30 text-blue-300 rounded-full text-xs">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {selectedProperty.description && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <p className="text-gray-300 text-sm">{selectedProperty.description}</p>
                  </div>
                )}
              </div>
            )}

            {/* NEW: Property Status History Component */}
            {!isEditingProperty && (
              <PropertyStatusHistory
                statusHistory={selectedProperty.statusHistory || []}
                priceHistory={selectedProperty.priceHistory || []}
                loading={false}
              />
            )}

            {/* Clients Section */}
            {!isEditingProperty && (
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-4 h-4 flex items-center justify-center">
                    <i className="ri-user-line text-blue-500"></i>
                  </div>
                  <h3 className="font-medium text-white">Clients</h3>
                </div>

                {selectedProperty.clients?.length === 0 ? (
                  <p className="text-gray-400 text-sm">No clients recorded for this property yet</p>
                ) : (
                  <div className="space-y-3">
                    {selectedProperty.clients?.map((client) => (
                      <div key={client.id} className="bg-gray-900 rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="text-white font-medium">{client.name}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs ${ 
                            client.status === 'interested' ? 'bg-green-900 text-green-300' :
                            client.status === 'not_interested' ? 'bg-red-900 text-red-300' :
                            'bg-yellow-900 text-yellow-300'
                          }`}>
                            {client.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="space-y-1 text-sm text-gray-400">
                          <p>{client.email}</p>
                          <p>{client.phone}</p>
                          {client.showingDate && <p>Showing: {client.showingDate}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <Navigation />
        </div>
        
        {/* Toast Notifications */}
        {showToast && (
          <Toast
            message={toastMessage}
            type={toastType}
            onClose={() => setShowToast(false)}
          />
        )}
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-900 pb-20">
        <Header />

        <div className="max-w-md mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">Properties</h1>
              <p className="text-gray-400">Manage your property listings</p>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="w-10 h-10 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center transition-colors cursor-pointer whitespace-nowrap"
            >
              <div className="w-5 h-5 flex items-center justify-center">
                <i className="ri-add-line text-white text-xl"></i>
              </div>
            </button>
          </div>

          {/* Status Tabs - DEFAULT: Active is selected */}
          <div className="flex bg-gray-800 rounded-lg p-1 mb-6">
            {(['Active', 'Coming Soon', 'Sold'] as StatusTab[]).map((status) => {
              const count = getStatusCount(status);
              return (
                <button
                  key={status}
                  onClick={() => setActiveTab(status)}
                  className={`flex-1 px-1 py-1 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap rounded-full flex items-center justify-center space-x-1 ${ 
                    activeTab === status
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <span>{status}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${ 
                    activeTab === status
                      ? 'bg-blue-700 text-blue-100'
                      : 'bg-gray-700 text-gray-300'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg">
              <p className="text-red-300 text-sm">{errorMessage}</p>
              <button
                onClick={() => setErrorMessage('')}
                className="text-red-400 hover:text-red-300 text-xs mt-1 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 bg-green-900/30 border border-green-700 rounded-lg">
              <p className="text-green-300 text-sm">{successMessage}</p>
              <button
                onClick={() => setSuccessMessage('')}
                className="text-green-400 hover:text-green-300 text-xs mt-1 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {showAddForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white">Add New Property</h2>
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      setErrorMessage(''); 
                      setSuccessMessage(''); 
                    }}
                    className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <div className="w-5 h-5 flex items-center justify-center">
                      <i className="ri-close-line text-xl"></i>
                    </div>
                  </button>
                </div>
                <PropertyForm
                  onSubmit={handleAddProperty}
                  onCancel={() => {
                    setShowAddForm(false);
                    setErrorMessage(''); 
                    setSuccessMessage(''); 
                  }}
                />
              </div>
            </div>
          )}

          {/* Enhanced loading and empty states with proper defaults */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
              <p className="text-gray-400 text-sm">Loading your properties...</p>
            </div>
          ) : !user ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <i className="ri-user-line text-4xl text-gray-600"></i>
              </div>
              <h3 className="text-lg font-medium text-gray-400 mb-2">Authentication Required</h3>
              <p className="text-gray-500">Please log in to view your properties</p>
            </div>
          ) : filteredProperties.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <i className="ri-home-line text-4xl text-gray-600"></i>
              </div>
              <h3 className="text-lg font-medium text-gray-400 mb-2">No {activeTab.toLowerCase()} properties</h3>
              <p className="text-gray-500">
                {properties.length === 0 
                  ? 'Add your first property to get started'
                  : `Switch to another tab or add your first ${activeTab.toLowerCase()} property`
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProperties.map((property) => {
                const recordingCount = getRecordingCount(property.id);
                return (
                  <div
                    key={property.id}
                    onClick={() => setSelectedProperty(property)}
                    className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors cursor-pointer"
                  >
                    {/* Property Image Preview */}
                    {property.images && property.images.length > 0 && (
                      <div className="mb-3 rounded-lg overflow-hidden">
                        <img
                          src={property.images[0]}
                          alt="Property"
                          className="w-full h-32 object-cover"
                        />
                        {property.images.length > 1 && (
                          <div className="absolute top-2 right-2 bg-black/60 text-white px-2 py-1 rounded text-xs">
                            +{property.images.length - 1}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-white truncate">{property.address}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${ 
                          property.status === 'Active' ? 'bg-green-900/30 text-green-300' :
                          property.status === 'Coming Soon' ? 'bg-yellow-900/30 text-yellow-300' :
                          'bg-red-900/30 text-red-300'
                        }`}>
                          {property.status}
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProperty(property.id);
                        }}
                        className="text-gray-400 hover:text-red-400 transition-colors cursor-pointer"
                      >
                        <div className="w-5 h-5 flex items-center justify-center">
                          <i className="ri-delete-bin-line"></i>
                        </div>
                      </button>
                    </div>

                    <div className="mb-2">
                      <p className="text-blue-400 font-semibold text-lg">${property.price.toLocaleString()}</p>
                      <p className="text-gray-400 text-sm">{property.propertyType}</p>
                    </div>

                    <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
                      <div className="flex items-center space-x-4">
                        <span>{property.bedrooms} bed</span>
                        <span>{property.bathrooms} bath</span>
                        <span>{property.sqft.toLocaleString()} sqft</span>
                      </div>
                    </div>

                    {/* Property Features Preview */}
                    {property.propertyFeatures && property.propertyFeatures.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {property.propertyFeatures.slice(0, 3).map((feature, index) => (
                          <span key={index} className="px-2 py-1 bg-blue-900/30 text-blue-300 rounded-full text-xs">
                            {feature}
                          </span>
                        ))}
                        {property.propertyFeatures.length > 3 && (
                          <span className="px-2 py-1 bg-gray-700 text-gray-400 rounded-full text-xs">
                            +{property.propertyFeatures.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {recordingCount > 0 && (
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-4 h-4 flex items-center justify-center">
                          <i className="ri-mic-line text-blue-500"></i>
                        </div>
                        <span className="text-xs text-blue-400">
                          {recordingCount} recording{recordingCount !== 1 ? 's' : ''} linked
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {property.clients?.length || 0} client{(property.clients?.length || 0) !== 1 ? 's' : ''}
                      </span>
                      <div className="w-4 h-4 flex items-center justify-center">
                        <i className="ri-arrow-right-s-line text-gray-500"></i>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <Navigation />
        
        {/* Toast Notifications */}
        {showToast && (
          <Toast
            message={toastMessage}
            type={toastType}
            onClose={() => setShowToast(false)}
          />
        )}
      </div>
    </AuthGuard>
  );
}
