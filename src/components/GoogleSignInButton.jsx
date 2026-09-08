import React, { useEffect, useRef, useState } from 'react';
import { FaSpinner } from 'react-icons/fa';

/**
 * GoogleSignInButton
 *
 * Utilizes Google Identity Services (GIS) to render the official Google Sign-In button.
 * Automatically loads the client script if not already present.
 */
export default function GoogleSignInButton({
  clientId: propClientId,
  onSuccess,
  onError,
  disabled = false,
  text = 'signin_with', // 'signin_with' | 'signup_with' | 'continue_with'
  theme = 'outline',    // 'outline' | 'filled_blue' | 'filled_black'
  size = 'large',       // 'large' | 'medium' | 'small'
  shape = 'rectangular',// 'rectangular' | 'pill' | 'circle'
  width = 320,
}) {
  const containerRef = useRef(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [initFailed, setInitFailed] = useState(false);

  // Resolution: prop > env > fallback to project client id
  const clientId =
    propClientId ||
    import.meta.env.VITE_GOOGLE_CLIENT_ID ||
    '725664292682-ck24ngvdki7hs66qrvnm79lis1ov5e07.apps.googleusercontent.com';

  // Ensure GIS script is loaded
  useEffect(() => {
    if (window.google?.accounts?.id) {
      setScriptLoaded(true);
      return;
    }

    // Check if script tag already exists
    const existingScript = document.getElementById('google-gsi-client');
    if (existingScript) {
      existingScript.addEventListener('load', () => setScriptLoaded(true));
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-gsi-client';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => {
      console.error('Failed to load Google Identity Services SDK');
      setInitFailed(true);
      if (onError) onError('Failed to load Google Sign-In SDK. Please check your network connection.');
    };
    document.head.appendChild(script);
  }, [onError]);

  // Initialize GIS and render button
  useEffect(() => {
    if (!scriptLoaded || !containerRef.current || !clientId) {
      if (!clientId && scriptLoaded) {
        console.warn('VITE_GOOGLE_CLIENT_ID is not configured');
      }
      return;
    }

    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          if (response?.credential) {
            if (onSuccess) onSuccess(response.credential);
          } else {
            console.error('Google Sign-In returned no credential', response);
            if (onError) onError('Google Sign-In failed to return credentials.');
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      // Clear previous button render if any
      containerRef.current.innerHTML = '';

      window.google.accounts.id.renderButton(containerRef.current, {
        theme,
        size,
        type: 'standard',
        text,
        shape,
        logo_alignment: 'left',
        width: typeof width === 'number' ? Math.min(Math.max(width, 200), 400) : 320,
      });
    } catch (err) {
      console.error('Error rendering Google Sign-In button:', err);
      setInitFailed(true);
      if (onError) onError('Failed to initialize Google Sign-In button.');
    }
  }, [scriptLoaded, clientId, onSuccess, onError, text, theme, size, shape, width]);

  if (!clientId) {
    return (
      <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
        Google Client ID is not configured in client environment.
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center justify-center min-h-[44px]">
      <div
        ref={containerRef}
        className={`flex justify-center transition-opacity duration-200 ${
          disabled ? 'opacity-50 pointer-events-none' : 'opacity-100'
        }`}
      />
      {!scriptLoaded && !initFailed && (
        <div className="flex items-center justify-center gap-2 py-2 text-xs text-slate-500 font-medium">
          <FaSpinner className="animate-spin text-blue-600" size={16} />
          <span>Loading Google Sign-In...</span>
        </div>
      )}
    </div>
  );
}
