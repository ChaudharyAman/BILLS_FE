import React from 'react';
import { Navigate } from 'react-router-dom';

const PrivateRoute = ({ children }) => {
  let isAuthenticated = false;
  try {
    const raw = localStorage.getItem('user');
    if (raw) {
      const parsed = JSON.parse(raw);
      // Require a proper wrapped user object with an _id
      if (parsed?.user?._id) {
        isAuthenticated = true;
      }
    }
  } catch (e) {
    // Malformed JSON in localStorage — treat as logged out
    localStorage.removeItem('user');
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default PrivateRoute;
