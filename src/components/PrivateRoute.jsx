import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import api, { clearAuthSession, storeAuthSession } from '../api/axios';
import PageLoader from './PageLoader';

const PrivateRoute = ({ children }) => {
  const [authState, setAuthState] = useState('checking');

  useEffect(() => {
    let isCancelled = false;

    const verifySession = async () => {
      try {
        const response = await api.get('/auth/me');
        if (!isCancelled) {
          storeAuthSession(response.data);
          setAuthState('authenticated');
        }
      } catch (error) {
        if (!isCancelled) {
          clearAuthSession();
          setAuthState('unauthenticated');
        }
      }
    };

    verifySession();

    return () => {
      isCancelled = true;
    };
  }, []);

  if (authState === 'checking') {
    return <PageLoader />;
  }

  if (authState === 'unauthenticated') {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default PrivateRoute;
