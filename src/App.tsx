import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { OrgProvider, useOrg } from './contexts/OrgContext';
import { LoginPage } from './pages/auth/LoginPage';
import { SignupPage } from './pages/auth/SignupPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { PropertiesPage } from './pages/properties/PropertiesPage';
import { PropertyHubPage } from './pages/properties/PropertyHubPage';
import { WorkOrdersPage } from './pages/work-orders/WorkOrdersPage';
import { VisitorPassesPage } from './pages/visitor-passes/VisitorPassesPage';
import { GasStoreModernPage } from './pages/gas-store/GasStoreModernPage';
import { VendorsPage } from './pages/vendors/VendorsPage';
import { VendorInventoryPage } from './pages/vendors/VendorInventoryPage';
import { VendorDashboardPage } from './pages/vendor/VendorDashboardPage';
import { JobsBoardPage } from './pages/vendor/JobsBoardPage';
import { MyJobsPage } from './pages/vendor/MyJobsPage';
import { QuotesPage } from './pages/vendor/QuotesPage';
import { DocumentsPage } from './pages/vendor/DocumentsPage';
import { InvoicesPage } from './pages/vendor/InvoicesPage';

function AppContent() {
  const { user, loading: authLoading } = useAuth();
  const { loading: orgLoading } = useOrg();
  const [authPage, setAuthPage] = useState<'login' | 'signup' | 'reset-password'>('login');
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const type = hashParams.get('type');

    if (accessToken && type === 'recovery') {
      setAuthPage('reset-password');
    }
  }, []);

  if (authLoading || (user && orgLoading)) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (authPage === 'reset-password') {
      return <ResetPasswordPage onComplete={() => setAuthPage('login')} />;
    }
    if (authPage === 'signup') {
      return <SignupPage onSwitch={setAuthPage} />;
    }
    return <LoginPage onSwitch={setAuthPage} />;
  }

  const renderPage = () => {
    if (selectedPropertyId) {
      return (
        <PropertyHubPage
          propertyId={selectedPropertyId}
          onBack={() => setSelectedPropertyId(null)}
        />
      );
    }

    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage onPropertyClick={(id) => setSelectedPropertyId(id)} />;
      case 'properties':
        return <PropertiesPage />;
      case 'work-orders':
        return <WorkOrdersPage />;
      case 'visitor-passes':
        return <VisitorPassesPage />;
      case 'gas-store':
        return <GasStoreModernPage />;
      case 'vendors':
        return <VendorsPage />;
      case 'vendor-inventory':
        return <VendorInventoryPage />;
      case 'vendor-dashboard':
        return <VendorDashboardPage />;
      case 'vendor-jobs-board':
        return <JobsBoardPage />;
      case 'vendor-my-jobs':
        return <MyJobsPage />;
      case 'vendor-quotes':
        return <QuotesPage />;
      case 'vendor-documents':
        return <DocumentsPage />;
      case 'vendor-invoices':
        return <InvoicesPage />;
      case 'analytics':
      case 'settings':
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Coming Soon</h2>
            <p className="text-gray-600">This feature is under development</p>
          </div>
        );
      default:
        return <DashboardPage />;
    }
  };

  return (
    <DashboardLayout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </DashboardLayout>
  );
}

function App() {
  return (
    <AuthProvider>
      <OrgProvider>
        <AppContent />
      </OrgProvider>
    </AuthProvider>
  );
}

export default App;
