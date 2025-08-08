
'use client';

import { useState } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import TagInput from './TagInput';

interface PropertyFormProps {
  onSubmit: (data: {
    address: string;
    addressLine1: string;
    city: string;
    state: string;
    postalCode: string;
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
    status: "Active" | "Coming Soon" | "Sold";
    images: string[];
  }) => void;
  onCancel: () => void;
  loading?: boolean;
  // NEW: Edit mode props
  isEditing?: boolean;
  initialData?: {
    address: string;
    addressLine1?: string;
    city?: string;
    state?: string;
    postalCode?: string;
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
    status: "Active" | "Coming Soon" | "Sold";
    images: string[];
  };
}

const PROPERTY_TYPES = [
  'Single Family',
  'Condo',
  'Townhouse',
  'Multi-Family',
  'Other'
];

const PROPERTY_STATUSES = [
  'Active',
  'Coming Soon',
  'Sold'
];

const PROPERTY_FEATURES = [
  'Ensuite',
  'Large Backyard',
  'Fireplace',
  'In-unit Laundry',
  'Walk-in Closet',
  'Balcony/Patio',
  'Hardwood Floors',
  'Stainless Steel Appliances',
  'Central Air',
  'Swimming Pool',
  'Home Office',
  'Updated Kitchen',
  'Master Suite',
  'Fenced Yard'
];

export default function PropertyForm({ onSubmit, onCancel, loading, isEditing = false, initialData }: PropertyFormProps) {
  const [formData, setFormData] = useState({
    address: initialData?.address || '',
    addressLine1: initialData?.addressLine1 || '',
    city: initialData?.city || '',
    state: initialData?.state || '',
    postalCode: initialData?.postalCode || '',
    price: initialData?.price?.toString() || '',
    bedrooms: initialData?.bedrooms?.toString() || '3',
    bathrooms: initialData?.bathrooms?.toString() || '2',
    sqft: initialData?.sqft?.toString() || '',
    description: initialData?.description || '',
    propertyType: initialData?.propertyType || 'Single Family',
    lotSize: initialData?.lotSize?.toString() || '',
    yearBuilt: initialData?.yearBuilt?.toString() || '',
    parking: initialData?.parking || '',
    mlsNumber: initialData?.mlsNumber || '',
    status: initialData?.status || 'Active'
  });

  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(() => {
    if (!initialData?.propertyFeatures) return [];
    return initialData.propertyFeatures.filter(feature => PROPERTY_FEATURES.includes(feature));
  });
  const [customFeatures, setCustomFeatures] = useState<string[]>(() => {
    if (!initialData?.propertyFeatures) return [];
    return initialData.propertyFeatures.filter(feature => !PROPERTY_FEATURES.includes(feature));
  });
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>(initialData?.images || []);
  const [uploadingImages, setUploadingImages] = useState(false);

  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('=== ENHANCED PROPERTY FORM SUBMISSION DEBUG ===');
    console.log('Raw form data:', formData);
    console.log('Selected features:', selectedFeatures);
    console.log('Image files:', imageFiles.length);
    
    // Validate required fields
    const isAddressLine1Valid = formData.addressLine1.trim().length > 0;
    const isCityValid = formData.city.trim().length > 0;
    const isStateValid = formData.state.trim().length > 0;
    const isPostalCodeValid = formData.postalCode.trim().length > 0;
    const isPriceValid = formData.price && !isNaN(parseInt(formData.price));
    const isSqftValid = formData.sqft && !isNaN(parseInt(formData.sqft));
    const isPropertyTypeValid = formData.propertyType.length > 0;
    const isStatusValid = formData.status.length > 0;
    
    console.log('Enhanced form validation:', {
      addressLine1: { value: formData.addressLine1, isValid: isAddressLine1Valid },
      city: { value: formData.city, isValid: isCityValid },
      state: { value: formData.state, isValid: isStateValid },
      postalCode: { value: formData.postalCode, isValid: isPostalCodeValid },
      price: { value: formData.price, isValid: isPriceValid },
      sqft: { value: formData.sqft, isValid: isSqftValid },
      propertyType: { value: formData.propertyType, isValid: isPropertyTypeValid },
      status: { value: formData.status, isValid: isStatusValid },
      bedrooms: { value: formData.bedrooms, parsed: parseInt(formData.bedrooms) },
      bathrooms: { value: formData.bathrooms, parsed: parseFloat(formData.bathrooms) }
    });
    
    if (!isAddressLine1Valid || !isCityValid || !isStateValid || !isPostalCodeValid || !isPriceValid || !isSqftValid || !isPropertyTypeValid || !isStatusValid) {
      alert('Please fill in all required fields with valid values.');
      return;
    }

    setUploadingImages(true);
    let imageUrls: string[] = [];

    try {
      // Upload images to Firebase Storage
      if (imageFiles.length > 0 && user?.uid) {
        console.log('🖼️ Uploading', imageFiles.length, 'images to Firebase Storage');
        
        const uploadPromises = imageFiles.map(async (file, index) => {
          const fileName = `property-${Date.now()}-${index}.${file.name.split('.').pop()}`;
          const imageRef = ref(storage, `properties/${user.uid}/${fileName}`);
          
          await uploadBytes(imageRef, file);
          const downloadUrl = await getDownloadURL(imageRef);
          console.log('✅ Image uploaded:', fileName);
          return downloadUrl;
        });

        imageUrls = await Promise.all(uploadPromises);
        console.log('✅ All images uploaded successfully');
      }

      // Process enhanced data
      const processedData = {
        address: `${formData.addressLine1.trim()}, ${formData.city.trim()}, ${formData.state.trim()} ${formData.postalCode.trim()}`,
        addressLine1: formData.addressLine1.trim(),
        city: formData.city.trim(),
        state: formData.state.trim().toUpperCase(),
        postalCode: formData.postalCode.trim(),
        price: parseInt(formData.price),
        bedrooms: parseInt(formData.bedrooms),
        bathrooms: parseFloat(formData.bathrooms),
        sqft: parseInt(formData.sqft),
        description: formData.description.trim(),
        propertyType: formData.propertyType,
        lotSize: formData.lotSize ? parseInt(formData.lotSize) : undefined,
        yearBuilt: formData.yearBuilt ? parseInt(formData.yearBuilt) : undefined,
        parking: formData.parking.trim() || undefined,
        propertyFeatures: [...selectedFeatures, ...customFeatures],
        mlsNumber: formData.mlsNumber.trim() || undefined,
        status: formData.status as "Active" | "Coming Soon" | "Sold",
        images: isEditing ? [...imagePreviewUrls, ...imageUrls] : imageUrls
      };
      
      console.log('Enhanced processed data being sent to onSubmit:', processedData);
      console.log('=== END ENHANCED FORM DEBUG ===');
      
      onSubmit(processedData);
    } catch (error) {
      console.error('❌ Error uploading images:', error);
      alert('Failed to upload images. Please try again.');
    } finally {
      setUploadingImages(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleFeatureToggle = (feature: string) => {
    setSelectedFeatures(prev => 
      prev.includes(feature) 
        ? prev.filter(f => f !== feature)
        : [...prev, feature]
    );
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Limit to 10 images
    if (imageFiles.length + files.length > 10) {
      alert('Maximum 10 images allowed');
      return;
    }

    // Validate file types and sizes
    const validFiles = files.filter(file => {
      const isValidType = file.type.startsWith('image/');
      const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB limit
      
      if (!isValidType) {
        alert(`${file.name} is not a valid image file`);
        return false;
      }
      if (!isValidSize) {
        alert(`${file.name} is too large. Maximum size is 5MB`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setImageFiles(prev => [...prev, ...validFiles]);

    // Generate preview URLs
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreviewUrls(prev => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const currentYear = new Date().getFullYear();

  return (
    <form id="property-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Basic Information Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-white border-b border-gray-700 pb-2">Basic Information</h3>
          
          {/* Address Fields */}
          <div>
            <label htmlFor="addressLine1" className="block text-sm font-medium text-gray-300 mb-2">
              Street Address *
            </label>
            <input
              type="text"
              id="addressLine1"
              name="addressLine1"
              value={formData.addressLine1}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-700 rounded-lg bg-gray-900 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder="123 Main Street"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex flex-col">
              <label htmlFor="city" className="text-sm font-medium text-gray-300 mb-2">
                City *
              </label>
              <input
                type="text"
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-700 rounded-lg bg-gray-900 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="Windsor"
                required
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="state" className="text-sm font-medium text-gray-300 mb-2">
                State / Province *
              </label>
              <input
                type="text"
                id="state"
                name="state"
                value={formData.state}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-700 rounded-lg bg-gray-900 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="ON"
                required
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="postalCode" className="text-sm font-medium text-gray-300 mb-2">
                Postal Code *
              </label>
              <input
                type="text"
                id="postalCode"
                name="postalCode"
                value={formData.postalCode}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-700 rounded-lg bg-gray-900 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="N9B 3P4"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="propertyType" className="block text-sm font-medium text-gray-300 mb-2">
                Property Type *
              </label>
              <select
                id="propertyType"
                name="propertyType"
                value={formData.propertyType}
                onChange={handleChange}
                className="w-full px-4 py-3 pr-8 border border-gray-700 rounded-lg bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                required
              >
                {PROPERTY_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-300 mb-2">
                Status *
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-4 py-3 pr-8 border border-gray-700 rounded-lg bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                required
              >
                {PROPERTY_STATUSES.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-300 mb-2">
                Price *
              </label>
              <input
                type="number"
                id="price"
                name="price"
                value={formData.price}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-700 rounded-lg bg-gray-900 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="450000"
                required
              />
            </div>
            <div>
              <label htmlFor="sqft" className="block text-sm font-medium text-gray-300 mb-2">
                Square Feet *
              </label>
              <input
                type="number"
                id="sqft"
                name="sqft"
                value={formData.sqft}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-700 rounded-lg bg-gray-900 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="2500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="bedrooms" className="block text-sm font-medium text-gray-300 mb-2">
                Bedrooms *
              </label>
              <select
                id="bedrooms"
                name="bedrooms"
                value={formData.bedrooms}
                onChange={handleChange}
                className="w-full px-4 py-3 pr-8 border border-gray-700 rounded-lg bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                {[1, 2, 3, 4, 5, 6].map(num => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="bathrooms" className="block text-sm font-medium text-gray-300 mb-2">
                Bathrooms *
              </label>
              <select
                id="bathrooms"
                name="bathrooms"
                value={formData.bathrooms}
                onChange={handleChange}
                className="w-full px-4 py-3 pr-8 border border-gray-700 rounded-lg bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                {[1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map(num => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Additional Details Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-white border-b border-gray-700 pb-2">Additional Details</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="lotSize" className="block text-sm font-medium text-gray-300 mb-2">
                Lot Size (sq ft)
              </label>
              <input
                type="number"
                id="lotSize"
                name="lotSize"
                value={formData.lotSize}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-700 rounded-lg bg-gray-900 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="7500"
              />
            </div>
            <div>
              <label htmlFor="yearBuilt" className="block text-sm font-medium text-gray-300 mb-2">
                Year Built
              </label>
              <input
                type="number"
                id="yearBuilt"
                name="yearBuilt"
                value={formData.yearBuilt}
                onChange={handleChange}
                min="1800"
                max={currentYear}
                className="w-full px-4 py-3 border border-gray-700 rounded-lg bg-gray-900 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder={currentYear.toString()}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label htmlFor="parking" className="block text-sm font-medium text-gray-300 mb-2">
                Parking
              </label>
              <input
                type="text"
                id="parking"
                name="parking"
                value={formData.parking}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-700 rounded-lg bg-gray-900 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="2-car garage, Street parking"
              />
            </div>
            <div>
              <label htmlFor="mlsNumber" className="block text-sm font-medium text-gray-300 mb-2">
                MLS Number
              </label>
              <input
                type="text"
                id="mlsNumber"
                name="mlsNumber"
                value={formData.mlsNumber}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-700 rounded-lg bg-gray-900 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="MLS123456"
              />
            </div>
          </div>
        </div>

        {/* Property Features Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-white border-b border-gray-700 pb-2">Property Features</h3>
          
          {/* Predefined Features */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Common Features</label>
            <div className="grid grid-cols-2 gap-2">
              {PROPERTY_FEATURES.map(feature => (
                <label key={feature} className="flex items-center space-x-2 text-sm text-gray-300 cursor-pointer hover:text-white transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedFeatures.includes(feature)}
                    onChange={() => handleFeatureToggle(feature)}
                    className="w-4 h-4 bg-gray-800 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <span>{feature}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Custom Features */}
          <div>
            <TagInput
              value={customFeatures}
              onChange={setCustomFeatures}
              placeholder="Type custom features like: Zen Garden, Soundproof Walls, Smart Home System..."
              label="Custom Features"
            />
          </div>

          {/* Combined Features Preview */}
          {([...selectedFeatures, ...customFeatures].length > 0) && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">All Features</label>
              <div className="flex flex-wrap gap-1">
                {[...selectedFeatures, ...customFeatures].map((feature, index) => (
                  <span 
                    key={index} 
                    className={`px-2 py-1 rounded-full text-xs ${
                      selectedFeatures.includes(feature) 
                        ? 'bg-green-900/30 text-green-300' 
                        : 'bg-blue-900/30 text-blue-300'
                    }`}
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Images Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-white border-b border-gray-700 pb-2">Images</h3>
          
          <div>
            <label htmlFor="images" className="block text-sm font-medium text-gray-300 mb-2">
              Property Images (Max 10, 5MB each)
            </label>
            <input
              type="file"
              id="images"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
              className="w-full px-4 py-3 border border-gray-700 rounded-lg bg-gray-900 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:cursor-pointer hover:file:bg-blue-700 text-sm"
            />
          </div>

          {imagePreviewUrls.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {imagePreviewUrls.map((url, index) => (
                <div key={index} className="relative group">
                  <img
                    src={url}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-20 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <div className="w-3 h-3 flex items-center justify-center">
                      <i className="ri-close-line"></i>
                    </div>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Description Section */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            maxLength={500}
            className="w-full px-4 py-3 border border-gray-700 rounded-lg bg-gray-900 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
            placeholder="Optional property description..."
          />
          <div className="text-right text-xs text-gray-500 mt-1">
            {formData.description.length}/500
          </div>
        </div>

        </form>
      );
    }
