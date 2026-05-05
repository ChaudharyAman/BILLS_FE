import React from 'react';
import { Navigate } from 'react-router-dom';
import { clearAuthSession } from '../api/axios';

const PrivateRoute = ({ children }) => {
  let isAuthenticated = false;

  try {
    const rawUser = localStorage.getItem('user');
    const authToken = localStorage.getItem('authToken');

    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      if (parsed?.user?._id) {
        isAuthenticated = true;
      }
    }

    if (!isAuthenticated && authToken) {
      isAuthenticated = true;
    }
  } catch (error) {
    clearAuthSession();
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default PrivateRoute;
