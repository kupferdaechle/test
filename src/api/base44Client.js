import { createClient } from '@base44/sdk';
// import { getAccessToken } from '@base44/sdk/utils/auth-utils';

// Create a client with authentication required
export const base44 = createClient({
  appId: "68ee08ea13f9f567b315d01a", 
  requiresAuth: true // Ensure authentication is required for all operations
});
