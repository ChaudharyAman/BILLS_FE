import React from 'react';

const Skeleton = ({ className = '', height, width, style = {} }) => {
  const styles = {
    ...style,
    height: height,
    width: width,
  };
  return (
    <div 
      className={`animate-pulse bg-slate-200 rounded ${className}`} 
      style={styles}
    />
  );
};

export default Skeleton;
