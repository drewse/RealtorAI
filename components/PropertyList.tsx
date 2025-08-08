
'use client';

interface Property {
  id: string;
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
  clients: any[];
}

interface PropertyListProps {
  properties: Property[];
  onSelectProperty: (property: Property) => void;
  onDeleteProperty: (propertyId: string) => void;
}

export default function PropertyList({ properties, onSelectProperty, onDeleteProperty }: PropertyListProps) {
  const handleDelete = (e: React.MouseEvent, propertyId: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this property?')) {
      onDeleteProperty(propertyId);
    }
  };

  return (
    <div className="space-y-3">
      {properties.map((property) => (
        <div
          key={property.id}
          onClick={() => onSelectProperty(property)}
          className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors cursor-pointer"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="font-medium text-white mb-1">{property.address}</h3>
              <p className="text-blue-400 font-semibold text-lg">${property.price.toLocaleString()}</p>
            </div>
            <button
              onClick={(e) => handleDelete(e, property.id)}
              className="text-gray-500 hover:text-red-400 transition-colors cursor-pointer ml-2"
            >
              <div className="w-4 h-4 flex items-center justify-center">
                <i className="ri-delete-bin-line"></i>
              </div>
            </button>
          </div>
          
          <div className="flex items-center space-x-4 text-sm text-gray-400 mb-3">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 flex items-center justify-center">
                <i className="ri-hotel-bed-line"></i>
              </div>
              <span>{property.bedrooms} bed</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 flex items-center justify-center">
                <i className="ri-drop-line"></i>
              </div>
              <span>{property.bathrooms} bath</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 flex items-center justify-center">
                <i className="ri-ruler-line"></i>
              </div>
              <span>{property.sqft.toLocaleString()} sqft</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1 text-xs text-gray-500">
              <div className="w-3 h-3 flex items-center justify-center">
                <i className="ri-user-line"></i>
              </div>
              <span>{property.clients?.length || 0} clients</span>
            </div>
            <div className="w-4 h-4 flex items-center justify-center">
              <i className="ri-arrow-right-s-line text-gray-500"></i>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
