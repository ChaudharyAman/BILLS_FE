import React, { useEffect } from 'react';
import CompanyDocumentsVault from '../components/CompanyDocumentsVault';

export default function CompanyDocuments() {
  useEffect(() => {
    document.title = 'Company Documents – Flance';
    return () => {
      document.title = 'Flance';
    };
  }, []);

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-6xl font-sans text-slate-900 dark:text-slate-100 min-h-screen transition-colors">
      <CompanyDocumentsVault hideBanner={false} />
    </div>
  );
}
