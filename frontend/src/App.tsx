import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Pages
import Landing from './pages/Landing';
import Bootstrap from './pages/Bootstrap';
import Login from './pages/Login';

// Admin pages - eager load dashboard and materials
import AdminDashboard from './pages/admin/Dashboard';
import AdminMaterials from './pages/admin/Materials';

// Lazy load other pages to reduce bundle size
const AdminAssignments = React.lazy(() => import('./pages/admin/Assignments'));  // NEW
const AdminInventory = React.lazy(() => import('./pages/admin/Inventory'));
const AdminRequests = React.lazy(() => import('./pages/admin/Requests'));
const AdminDispatch = React.lazy(() => import('./pages/admin/Dispatch'));
const AdminReturns = React.lazy(() => import('./pages/admin/Returns'));  // NEW
const AdminInvoices = React.lazy(() => import('./pages/admin/Invoices'));
const AdminCommission = React.lazy(() => import('./pages/admin/Commission'));
const AdminUsers = React.lazy(() => import('./pages/admin/Users'));

const ManufacturerDashboard = React.lazy(() => import('./pages/manufacturer/Dashboard'));
const ManufacturerProduction = React.lazy(() => import('./pages/manufacturer/Production'));
const ManufacturerInventory = React.lazy(() => import('./pages/manufacturer/Inventory'));
const ManufacturerDispatch = React.lazy(() => import('./pages/manufacturer/Dispatch'));

const RetailerDashboard = React.lazy(() => import('./pages/retailer/Dashboard'));
const RetailerCatalog = React.lazy(() => import('./pages/retailer/Catalog'));
const RetailerRequests = React.lazy(() => import('./pages/retailer/Requests'));
const RetailerReceiving = React.lazy(() => import('./pages/retailer/Receiving'));
const RetailerReturns = React.lazy(() => import('./pages/retailer/Returns'));  // NEW
const RetailerSales = React.lazy(() => import('./pages/retailer/Sales'));
const RetailerInvoices = React.lazy(() => import('./pages/retailer/Invoices'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 1,
    },
  },
});

// Protected route wrapper
function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-950">
        <div className="w-12 h-12 border-2 border-dark-600 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    // Redirect to appropriate dashboard
    switch (user.role) {
      case 'ADMIN':
        return <Navigate to="/admin/dashboard" replace />;
      case 'MANUFACTURER':
        return <Navigate to="/manufacturer/dashboard" replace />;
      case 'RETAILER':
        return <Navigate to="/retailer/dashboard" replace />;
      default:
        return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}

// Loading fallback
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-950">
      <div className="w-12 h-12 border-2 border-dark-600 border-t-primary-500 rounded-full animate-spin" />
    </div>
  );
}

function AppRoutes() {
  return (
    <React.Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/bootstrap" element={<Bootstrap />} />
        <Route path="/login" element={<Login />} />

        {/* Admin routes */}
        <Route path="/admin/dashboard" element={
          <ProtectedRoute allowedRoles={['ADMIN']}><AdminDashboard /></ProtectedRoute>
        } />
        <Route path="/admin/materials" element={
          <ProtectedRoute allowedRoles={['ADMIN']}><AdminMaterials /></ProtectedRoute>
        } />
        <Route path="/admin/assignments" element={
          <ProtectedRoute allowedRoles={['ADMIN']}><AdminAssignments /></ProtectedRoute>
        } />
        <Route path="/admin/inventory" element={
          <ProtectedRoute allowedRoles={['ADMIN']}><AdminInventory /></ProtectedRoute>
        } />
        <Route path="/admin/requests" element={
          <ProtectedRoute allowedRoles={['ADMIN']}><AdminRequests /></ProtectedRoute>
        } />
        <Route path="/admin/dispatch" element={
          <ProtectedRoute allowedRoles={['ADMIN']}><AdminDispatch /></ProtectedRoute>
        } />
        <Route path="/admin/returns" element={
          <ProtectedRoute allowedRoles={['ADMIN']}><AdminReturns /></ProtectedRoute>
        } />
        <Route path="/admin/invoices" element={
          <ProtectedRoute allowedRoles={['ADMIN']}><AdminInvoices /></ProtectedRoute>
        } />
        <Route path="/admin/commission" element={
          <ProtectedRoute allowedRoles={['ADMIN']}><AdminCommission /></ProtectedRoute>
        } />
        <Route path="/admin/users" element={
          <ProtectedRoute allowedRoles={['ADMIN']}><AdminUsers /></ProtectedRoute>
        } />

        {/* Manufacturer routes */}
        <Route path="/manufacturer/dashboard" element={
          <ProtectedRoute allowedRoles={['MANUFACTURER']}><ManufacturerDashboard /></ProtectedRoute>
        } />
        <Route path="/manufacturer/production" element={
          <ProtectedRoute allowedRoles={['MANUFACTURER']}><ManufacturerProduction /></ProtectedRoute>
        } />
        <Route path="/manufacturer/inventory" element={
          <ProtectedRoute allowedRoles={['MANUFACTURER']}><ManufacturerInventory /></ProtectedRoute>
        } />
        <Route path="/manufacturer/dispatch" element={
          <ProtectedRoute allowedRoles={['MANUFACTURER']}><ManufacturerDispatch /></ProtectedRoute>
        } />

        {/* Retailer routes */}
        <Route path="/retailer/dashboard" element={
          <ProtectedRoute allowedRoles={['RETAILER']}><RetailerDashboard /></ProtectedRoute>
        } />
        <Route path="/retailer/catalog" element={
          <ProtectedRoute allowedRoles={['RETAILER']}><RetailerCatalog /></ProtectedRoute>
        } />
        <Route path="/retailer/requests" element={
          <ProtectedRoute allowedRoles={['RETAILER']}><RetailerRequests /></ProtectedRoute>
        } />
        <Route path="/retailer/receiving" element={
          <ProtectedRoute allowedRoles={['RETAILER']}><RetailerReceiving /></ProtectedRoute>
        } />
        <Route path="/retailer/returns" element={
          <ProtectedRoute allowedRoles={['RETAILER']}><RetailerReturns /></ProtectedRoute>
        } />
        <Route path="/retailer/sales" element={
          <ProtectedRoute allowedRoles={['RETAILER']}><RetailerSales /></ProtectedRoute>
        } />
        <Route path="/retailer/invoices" element={
          <ProtectedRoute allowedRoles={['RETAILER']}><RetailerInvoices /></ProtectedRoute>
        } />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </React.Suspense>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              className: 'bg-dark-800 text-white border border-dark-600',
              duration: 4000,
            }}
          />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}