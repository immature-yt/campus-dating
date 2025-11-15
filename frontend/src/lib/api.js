// Use NEXT_PUBLIC_API_URL (for Vercel) or fallback to localhost
let backendUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

// Ensure URL has protocol (add https:// if missing)
if (backendUrl && !backendUrl.startsWith('http://') && !backendUrl.startsWith('https://')) {
  backendUrl = `https://${backendUrl}`;
}

// Remove trailing slash to prevent double slashes in API paths
backendUrl = backendUrl.replace(/\/+$/, '');

export const BACKEND_URL = backendUrl;

// Debug: Always log backend URL in browser (helps diagnose production issues)
if (typeof window !== 'undefined') {
  console.log('🔗 Backend URL:', BACKEND_URL);
  if (!process.env.NEXT_PUBLIC_API_URL && !process.env.NEXT_PUBLIC_BACKEND_URL) {
    console.warn('⚠️ WARNING: NEXT_PUBLIC_API_URL not set! Using fallback:', BACKEND_URL);
    console.warn('⚠️ Set NEXT_PUBLIC_API_URL in Vercel environment variables!');
  }
}

export function getAuthToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export function setAuthToken(token) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('token', token);
}

export async function apiGet(path) {
  const token = getAuthToken();
  const url = `${BACKEND_URL}${path}`;
  
  try {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('API Error:', {
        url,
        status: res.status,
        statusText: res.statusText,
        error: errorText
      });
      throw new Error(errorText || `HTTP ${res.status}: ${res.statusText}`);
    }
    
    return res.json();
  } catch (error) {
    // Network errors (failed to fetch)
    if (error.message.includes('fetch') || error.message.includes('Network')) {
      console.error('Network Error:', {
        url,
        message: error.message,
        backendUrl: BACKEND_URL
      });
      throw new Error(`Failed to connect to backend. Please check if ${BACKEND_URL} is correct.`);
    }
    throw error;
  }
}

export async function apiPost(path, body) {
  const token = getAuthToken();
  const url = `${BACKEND_URL}${path}`;
  
  // Debug logging
  console.log('📤 API POST Request:', {
    url,
    path,
    backendUrl: BACKEND_URL,
    hasToken: !!token
  });
  
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(body)
    });
    
    console.log('📥 API Response:', {
      url,
      status: res.status,
      statusText: res.statusText,
      ok: res.ok
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('❌ API Error:', {
        url,
        status: res.status,
        statusText: res.statusText,
        error: errorText
      });
      throw new Error(errorText || `HTTP ${res.status}: ${res.statusText}`);
    }
    
    return res.json();
  } catch (error) {
    // Network errors (failed to fetch)
    if (error.message.includes('fetch') || error.message.includes('Network') || error.name === 'TypeError') {
      console.error('🌐 Network Error Details:', {
        url,
        message: error.message,
        name: error.name,
        backendUrl: BACKEND_URL,
        env: {
          NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
          NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL
        }
      });
      throw new Error(`Failed to connect to backend at ${BACKEND_URL}. Please verify the URL is correct and the backend is running.`);
    }
    throw error;
  }
}

export async function apiDelete(path) {
  const token = getAuthToken();
  const url = `${BACKEND_URL}${path}`;
  
  try {
    const res = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || `HTTP ${res.status}: ${res.statusText}`);
    }
    
    return res.json();
  } catch (error) {
    throw error;
  }
}

export async function apiForm(path, formData) {
  const token = getAuthToken();
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: formData
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}


