
export const getStoredAPIKey = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('openai-api-key');
  }
  return null;
};

export const setStoredAPIKey = (apiKey: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('openai-api-key', apiKey);
  }
};

export const removeStoredAPIKey = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('openai-api-key');
  }
};
