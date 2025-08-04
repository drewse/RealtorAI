
'use client';

import AuthGuard from '@/components/AuthGuard';
import Header from '@/components/Header';
import Navigation from '@/components/Navigation';
import ClientsManagementPage from '@/components/ClientsManagementPage';

export default function ClientsPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-900 pb-20">
        <Header />
        <ClientsManagementPage />
        <Navigation />
      </div>
    </AuthGuard>
  );
}
