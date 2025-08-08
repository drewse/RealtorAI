// Address parsing utilities for property management
// Supports US ZIP and Canadian Postal codes

export interface AddressParts {
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
}

// Supports US ZIP and Canadian Postal (loosely)
export function parseAddressParts(address: string): AddressParts {
  const cleaned = address.replace(/\s+/g, ' ').trim();

  // Try patterns like: "123 Main St, Windsor, ON N9B 3P4"
  const caMatch = cleaned.match(/^(.*?),\s*([^,]+?),\s*([A-Z]{2})\s*([A-Z]\d[A-Z]\s?\d[A-Z]\d)$/i);
  if (caMatch) {
    return {
      addressLine1: caMatch[1].trim(),
      city: caMatch[2].trim(),
      state: caMatch[3].toUpperCase(),
      postalCode: caMatch[4].toUpperCase().replace(/\s+/g, ' ').trim(),
    };
  }

  // US-ish: "123 Main St, Detroit, MI 48226"
  const usMatch = cleaned.match(/^(.*?),\s*([^,]+?),\s*([A-Z]{2})\s*(\d{5}(?:-\d{4})?)$/i);
  if (usMatch) {
    return {
      addressLine1: usMatch[1].trim(),
      city: usMatch[2].trim(),
      state: usMatch[3].toUpperCase(),
      postalCode: usMatch[4],
    };
  }

  // Fallback: split by commas
  const parts = cleaned.split(',').map(p => p.trim());
  return {
    addressLine1: parts[0] || '',
    city: parts[1] || '',
    state: parts[2]?.split(' ')[0] || '',
    postalCode: parts[2]?.split(' ').slice(1).join(' ') || '',
  };
}

// Normalize postal code formatting
export function normalizePostalCode(postalCode: string): string {
  if (!postalCode) return '';
  
  const cleaned = postalCode.toUpperCase().replace(/\s+/g, ' ').trim();
  
  // Canadian format: ensure space in middle (N9B 3P4)
  const caMatch = cleaned.match(/^([A-Z]\d[A-Z])\s*(\d[A-Z]\d)$/);
  if (caMatch) {
    return `${caMatch[1]} ${caMatch[2]}`;
  }
  
  return cleaned;
}

// Normalize state/province abbreviation
export function normalizeState(state: string): string {
  if (!state) return '';
  return state.toUpperCase().trim();
}

// Validate postal code format
export function isValidPostalCode(postalCode: string): boolean {
  if (!postalCode) return false;
  
  const cleaned = postalCode.toUpperCase().replace(/\s+/g, '');
  
  // Canadian format: A1A1A1
  const caFormat = /^[A-Z]\d[A-Z]\d[A-Z]\d$/;
  
  // US format: 12345 or 12345-1234
  const usFormat = /^\d{5}(-\d{4})?$/;
  
  return caFormat.test(cleaned) || usFormat.test(cleaned);
} 