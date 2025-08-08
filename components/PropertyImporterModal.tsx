'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface PropertyData {
  address: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  propertyType: string;
  status: string;
  price: number;
  squareFeet: number;
  bedrooms: number;
  bathrooms: number;
  lotSizeSqFt: number;
  yearBuilt?: number;
  parking: string;
  mlsNumber: string;
  features: { [key: string]: boolean };
  customFeatures: string;
  images: string[];
  description: string;
}

interface PropertyImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (propertyData: PropertyData) => void;
}

export default function PropertyImporterModal({ 
  isOpen, 
  onClose, 
  onImportSuccess 
}: PropertyImporterModalProps) {
  const [content, setContent] = useState('');
  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const { user } = useAuth();

  const handleImport = async () => {
    if (!content.trim()) {
      setError('Please enter a listing link or description');
      return;
    }

    if (!hasPermission) {
      setError('Please confirm you have permission to use this data');
      return;
    }

    if (!user?.uid) {
      setError('You must be logged in to import properties');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const functionUrl = process.env.NEXT_PUBLIC_IS_DEV === 'true' 
        ? 'http://127.0.0.1:5001/showai-23713/us-central1/importPropertyFromText'
        : 'https://importpropertyfromtext-x5dsxztz7q-uc.a.run.app';

      // Prepare request body with text field
      const requestBody = {
        text: content.trim(),
        userId: user.uid,
      };

      // Log the full request being sent
      console.log('📤 Sending request to:', functionUrl);
      console.log('📤 Request body:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      // Log the full response
      console.log('📥 Response status:', response.status);
      console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Error response:', errorData);
        throw new Error(errorData.error || errorData.message || `HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Success response:', result);
      
      if (result.success) {
        setSuccess(true);
        console.log('🎉 Property import successful!');
        // Pass the parsed data to the parent component
        onImportSuccess(result.data);
        // Close modal after a brief delay to show success state
        setTimeout(() => {
          onClose();
          setContent('');
          setHasPermission(false);
          setSuccess(false);
        }, 1500);
      } else {
        throw new Error(result.message || 'Import failed');
      }
    } catch (error) {
      console.error('❌ Property import error:', error);
      setError(error instanceof Error ? error.message : 'Failed to import property');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
      setContent('');
      setHasPermission(false);
      setError('');
      setSuccess(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-3xl h-[100svh] max-h-[100svh] flex flex-col bg-neutral-900 rounded-xl">
        {/* Header */}
        <header className="sticky top-0 z-10 border-b bg-neutral-900 px-4 py-3 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">AI Property Importer</h2>
            <p className="text-gray-400 text-sm mt-1">
              Import property details from listing URLs or descriptions
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-gray-400 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
          >
            <div className="w-6 h-6 flex items-center justify-center">
              <i className="ri-close-line text-xl"></i>
            </div>
          </button>
        </header>

        {/* Body - the ONLY scroll area */}
        <div className="flex-1 overflow-y-auto px-4 pb-24 mobile-scroll scroll-contain">
          <div className="space-y-4 py-4">
            {/* Input Field */}
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-300 mb-2">
                Paste public listing link or description
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="https://example.com/property-listing OR paste a property description..."
                rows={6}
                className="w-full px-4 py-3 border border-gray-700 rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                disabled={loading}
              />
            </div>

            {/* Permission Checkbox */}
            <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="permission"
                  checked={hasPermission}
                  onChange={(e) => setHasPermission(e.target.checked)}
                  disabled={loading}
                  className="mt-1 w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                />
                <label htmlFor="permission" className="text-sm text-yellow-200">
                  <span className="font-medium">✅ I confirm I have permission to use this data</span>
                  <p className="text-xs text-yellow-300 mt-1">
                    Ensure you have the right to import and use this property information
                  </p>
                </label>
              </div>
            </div>

            {/* Status Messages */}
            {error && (
              <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 flex items-center justify-center">
                    <i className="ri-error-warning-line text-red-400"></i>
                  </div>
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              </div>
            )}

            {success && (
              <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 flex items-center justify-center">
                    <i className="ri-check-line text-green-400"></i>
                  </div>
                  <p className="text-green-300 text-sm">Property imported successfully! Opening form...</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="sticky bottom-0 z-10 border-t bg-neutral-900 safe-bottom px-4 py-3">
          <div className="flex space-x-3">
            <button
              onClick={handleClose}
              disabled={loading}
              className="flex-1 px-4 py-3 border border-gray-700 rounded-lg bg-gray-800 text-white hover:bg-gray-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={loading || !content.trim() || !hasPermission}
              className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white font-medium rounded-lg transition-colors cursor-pointer flex items-center justify-center space-x-2 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Importing...</span>
                </>
              ) : (
                <>
                  <div className="w-4 h-4 flex items-center justify-center">
                    <i className="ri-download-line"></i>
                  </div>
                  <span>Import</span>
                </>
              )}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
} 