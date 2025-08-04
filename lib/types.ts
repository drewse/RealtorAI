// Shared types for the ShowAI application

export interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  tags: string[];
  status: 'Active' | 'Cold' | 'Hot Lead';
  preferences: {
    priceRange: { min: number; max: number; };
    preferredAreas: string[];
    propertyTypes: string[];
    bedrooms: { min: number; max: number; };
    bathrooms: { min: number; max: number; };
    features: string[];
    urgency: 'low' | 'medium' | 'high';
  };
  notes: any[];
  createdAt?: any;
  updatedAt?: any;
  userId?: string;
}

export interface ClientFormData {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  tags: string[];
  status: 'Active' | 'Cold' | 'Hot Lead';
  preferences: {
    priceRange: { min: number; max: number; };
    preferredAreas: string[];
    propertyTypes: string[];
    bedrooms: { min: number; max: number; };
    bathrooms: { min: number; max: number; };
    features: string[];
    urgency: 'low' | 'medium' | 'high';
  };
  notes: any[];
  createdAt?: any;
  updatedAt?: any;
  userId?: string;
} 