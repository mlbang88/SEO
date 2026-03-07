/**
 * TokenValidator.js
 * Validates access tokens from URL for order form access
 * Tokens are stored in a separate 'tokens' collection in Firebase
 */

const FIREBASE_DB_URL = 'https://firestore.googleapis.com/v1/projects/seo-description-fiverr/databases/(default)/documents';

/**
 * Validate and consume a token
 * @param {string} token - The token from URL query parameter
 * @returns {Promise<{valid: boolean, orderId?: string, error?: string}>}
 */
export async function validateToken(token) {
  if (!token) {
    return { valid: false, error: 'No token provided' };
  }

  try {
    // Get all tokens from the 'tokens' collection
    const response = await fetch(
      `${FIREBASE_DB_URL}/tokens?pageSize=100`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (!response.ok) {
      console.error('Firebase fetch error:', response.status);
      return { valid: false, error: 'Unable to validate token' };
    }

    const data = await response.json();

    if (!data.documents || data.documents.length === 0) {
      return { valid: false, error: 'Invalid or expired token' };
    }

    // Find and validate the token
    for (const doc of data.documents) {
      const docToken = doc.fields?.token?.stringValue;
      const expiresAt = doc.fields?.expiresAt?.stringValue;
      const used = doc.fields?.used?.booleanValue;

      if (docToken === token) {
        // Check if already used
        if (used === true) {
          return { valid: false, error: 'Token already used' };
        }

        // Check expiration
        if (expiresAt) {
          const expirationTime = new Date(expiresAt).getTime();
          const currentTime = new Date().getTime();

          if (currentTime > expirationTime) {
            return { valid: false, error: 'Token expired' };
          }
        }

        // Mark token as used
        try {
          const docPath = doc.name; // Get the full document path
          await fetch(docPath, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fields: {
                used: { booleanValue: true },
                usedAt: { stringValue: new Date().toISOString() },
              }
            })
          });
        } catch (err) {
          console.warn('Could not mark token as used:', err);
          // Still allow the form to proceed even if marking fails
        }

        return { valid: true, token };
      }
    }

    return { valid: false, error: 'Invalid token' };
  } catch (error) {
    console.error('Token validation error:', error);
    return { valid: false, error: 'Validation error: ' + error.message };
  }
}
