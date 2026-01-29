import axios from 'axios';
import type {
  AuthResponse,
  SystemStatus,
  Material,
  CreateMaterialDto,
  User,
  ProductionBatch,
  CreateProductionBatchDto,
  ProductionSummary,
  ManufacturerInventorySummary,
  RetailerInventorySummary,
  SRN,
  CreateSRNDto,
  ApproveSRNDto,
  DispatchOrder,
  GRN,
  ConfirmGRNDto,
  Invoice,
  Sale,
  CreateSaleDto,
  SaleSummary,
  Commission,
  CommissionSummary,
  ManufacturerInventoryItem,
  RetailerInventoryItem,
  // NEW types
  Assignment,
  CreateAssignmentDto,
  AssignedManufacturer,
  Return,
  CreateReturnDto,
  ResolveReturnDto,
  Notification,
  NotificationCount,
  InventoryAggregateReport,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  getStatus: () => api.get<SystemStatus>('/auth/status'),
  bootstrap: (data: { email: string; password: string; name: string }) =>
    api.post<AuthResponse>('/auth/bootstrap', data),
  login: (data: { email: string; password: string }) =>
    api.post<AuthResponse>('/auth/login', data),
};

// Users API
export const usersApi = {
  getAll: (filters?: { role?: string; isActive?: boolean }) =>
    api.get<User[]>('/users', { params: filters }),
  getManufacturers: () => api.get<User[]>('/users', { params: { role: 'MANUFACTURER' } }),
  getRetailers: () => api.get<User[]>('/users', { params: { role: 'RETAILER' } }),
  getOne: (id: string) => api.get<User>(`/users/${id}`),
  create: (data: { email: string; password: string; name: string; role: string }) =>
    api.post<User>('/users', data),
  update: (id: string, data: { name?: string; isActive?: boolean }) =>
    api.patch<User>(`/users/${id}`, data),
  changePassword: (id: string, newPassword: string) =>
    api.patch(`/users/${id}/password`, { newPassword }),
  delete: (id: string) => api.delete(`/users/${id}`),
};

// Materials API - UPDATED: Added sqCode lookup
export const materialsApi = {
  getAll: (includeInactive?: boolean) =>
    api.get<Material[]>('/materials', { params: { includeInactive } }),
  getOne: (id: string) => api.get<Material>(`/materials/${id}`),
  getBySqCode: (sqCode: string) => api.get<Material>(`/materials/by-sqcode/${sqCode}`),  // NEW
  create: (data: CreateMaterialDto) => api.post<Material>('/materials', data),
  update: (id: string, data: Partial<Material>) =>
    api.patch<Material>(`/materials/${id}`, data),
  delete: (id: string) => api.delete(`/materials/${id}`),
};

// Production API - UPDATED: Added sqCode support
export const productionApi = {
  createBatch: (data: CreateProductionBatchDto) =>
    api.post<ProductionBatch>('/production/batch', data),
  getSummary: () => api.get<ProductionSummary>('/production/summary'),
  getBatches: (params?: { materialId?: string; sqCode?: string; limit?: number }) =>  // Added sqCode
    api.get<ProductionBatch[]>('/production/batches', { params }),
  getBatch: (id: string) => api.get<ProductionBatch>(`/production/batches/${id}`),
};

// Manufacturer Inventory API
export const manufacturerInventoryApi = {
  // Manufacturer: get my inventory - endpoint is /manufacturer/inventory
  getMyInventory: () =>
    api.get<ManufacturerInventorySummary>('/manufacturer/inventory'),
  // Admin: get all manufacturer inventories via reports
  getAll: () =>
    api.get<ManufacturerInventoryItem[]>('/admin/reports/inventory/by-manufacturer'),
  getByManufacturer: (manufacturerId: string) =>
    api.get<ManufacturerInventorySummary>(`/admin/reports/inventory/manufacturer/${manufacturerId}`),
};

// Retailer Inventory API
export const retailerInventoryApi = {
  // Retailer: get my inventory - endpoint is /retailer/inventory
  getMyInventory: () =>
    api.get<RetailerInventorySummary>('/retailer/inventory'),
  // Admin: get all retailer inventories via reports
  getAll: () =>
    api.get<RetailerInventoryItem[]>('/admin/reports/inventory/retailers'),
  getByRetailer: (retailerId: string) =>
    api.get<RetailerInventorySummary>(`/admin/reports/inventory/retailer/${retailerId}`),
};

// SRN API - UPDATED: manufacturerId now required in create
export const srnApi = {
  create: (data: CreateSRNDto) => api.post<SRN>('/srn', data),
  submit: (id: string) => api.post<SRN>(`/srn/${id}/submit`),
  process: (id: string, data: ApproveSRNDto) => api.post<SRN>(`/srn/${id}/process`, data),
  // Retailer: get my SRNs
  getMy: (status?: string) => api.get<SRN[]>('/srn/my', { params: { status } }),
  // Manufacturer: get SRNs assigned to me
  getAssigned: (status?: string) => api.get<SRN[]>('/srn/assigned', { params: { status } }),
  // Admin: get all SRNs
  getAll: (status?: string) => api.get<SRN[]>('/srn', { params: { status } }),
  getOne: (id: string) => api.get<SRN>(`/srn/${id}`),
  getPendingCount: () => api.get<{ count: number }>('/srn/pending/count'),
};

// Dispatch API - UPDATED: Now MANUFACTURER creates and executes (was Admin)
export const dispatchApi = {
  // CHANGED: Manufacturer creates dispatch from approved SRN
  create: (srnId: string) => api.post<DispatchOrder>('/dispatch', { srnId }),
  // CHANGED: Manufacturer executes dispatch
  execute: (id: string, deliveryNotes?: string) =>
    api.post<DispatchOrder>(`/dispatch/${id}/execute`, { deliveryNotes }),
  getMy: () => api.get<DispatchOrder[]>('/dispatch/my'),
  getAll: (status?: string) => api.get<DispatchOrder[]>('/dispatch', { params: { status } }),
  getOne: (id: string) => api.get<DispatchOrder>(`/dispatch/${id}`),
};

// GRN API - UPDATED: Removed damagedPackets from confirm
export const grnApi = {
  confirm: (id: string, data: ConfirmGRNDto) => api.post<GRN>(`/grn/${id}/confirm`, data),
  getMy: (status?: string) => api.get<GRN[]>('/grn/my', { params: { status } }),
  getAll: (status?: string) => api.get<GRN[]>('/grn', { params: { status } }),
  getOne: (id: string) => api.get<GRN>(`/grn/${id}`),
};

// Invoice API
export const invoiceApi = {
  generate: (grnId: string, isInterstate?: boolean) =>
    api.post<Invoice>('/invoices', { grnId, isInterstate }),
  getMy: () => api.get<Invoice[]>('/invoices/my'),
  getAll: () => api.get<Invoice[]>('/invoices'),
  getOne: (id: string) => api.get<Invoice>(`/invoices/${id}`),
};

// Sale API
export const saleApi = {
  create: (data: CreateSaleDto) => api.post<Sale>('/sales', data),
  getSummary: () => api.get<SaleSummary>('/sales/summary'),
  getMy: (limit?: number) => api.get<Sale[]>('/sales/my', { params: { limit } }),
  getAll: (limit?: number) => api.get<Sale[]>('/sales', { params: { limit } }),
  getOne: (id: string) => api.get<Sale>(`/sales/${id}`),
};

// Commission API
export const commissionApi = {
  getSummary: () => api.get<CommissionSummary>('/commissions/summary'),
  getSummaryByRetailer: () => api.get('/commissions/by-retailer/summary'),
  getAll: (status?: string) => api.get<Commission[]>('/commissions', { params: { status } }),
  getByRetailer: (retailerId: string) =>
    api.get<Commission[]>(`/commissions/retailer/${retailerId}`),
  markPaid: (id: string) => api.post<Commission>(`/commissions/${id}/pay`),
  markAllPaid: (retailerId: string) =>
    api.post<{ count: number }>(`/commissions/retailer/${retailerId}/pay-all`),
};

// =====================================================
// NEW: Assignment API (Retailer-Manufacturer mapping)
// =====================================================
export const assignmentApi = {
  // Admin: Create assignment
  create: (data: CreateAssignmentDto) =>
    api.post<Assignment>('/assignments', data),
  
  // Admin: Get all assignments
  getAll: (activeOnly?: boolean) =>
    api.get<Assignment[]>('/assignments', { params: { activeOnly } }),
  
  // Admin: Get assignments by retailer
  getByRetailer: (retailerId: string) =>
    api.get<Assignment[]>(`/assignments/retailer/${retailerId}`),
  
  // Admin: Get assignments by manufacturer
  getByManufacturer: (manufacturerId: string) =>
    api.get<Assignment[]>(`/assignments/manufacturer/${manufacturerId}`),
  
  // Retailer: Get my assigned manufacturers
  getMyManufacturers: () =>
    api.get<AssignedManufacturer[]>('/assignments/my-manufacturers'),
  
  // Manufacturer: Get my assigned retailers
  getMyRetailers: () =>
    api.get<Assignment[]>('/assignments/my-retailers'),
  
  // Admin: Update assignment
  update: (id: string, data: { isActive?: boolean }) =>
    api.patch<Assignment>(`/assignments/${id}`, data),
  
  // Admin: Deactivate assignment
  deactivate: (id: string) =>
    api.delete(`/assignments/${id}`),
};

// =====================================================
// NEW: Return API (replaces damaged goods workflow)
// =====================================================
export const returnApi = {
  // Retailer: Create return
  create: (data: CreateReturnDto) =>
    api.post<Return>('/returns', data),
  
  // Admin: Resolve return
  resolve: (id: string, data: ResolveReturnDto) =>
    api.post<Return>(`/returns/${id}/resolve`, data),
  
  // Retailer: Get my returns
  getMy: (status?: string) =>
    api.get<Return[]>('/returns/my', { params: { status } }),
  
  // Admin: Get all returns
  getAll: (status?: string) =>
    api.get<Return[]>('/returns', { params: { status } }),
  
  // Get single return
  getOne: (id: string) =>
    api.get<Return>(`/returns/${id}`),
  
  // Admin: Get pending count
  getPendingCount: () =>
    api.get<{ count: number }>('/returns/pending/count'),
};

// =====================================================
// NEW: Notification API
// =====================================================
export const notificationApi = {
  // Get my notifications
  getAll: (limit?: number, unreadOnly?: boolean) =>
    api.get<Notification[]>('/notifications', { params: { limit, unreadOnly } }),
  
  // Get notification count
  getCount: () =>
    api.get<NotificationCount>('/notifications/count'),
  
  // Mark as read
  markAsRead: (id: string) =>
    api.post(`/notifications/${id}/read`),
  
  // Mark all as read
  markAllAsRead: () =>
    api.post<{ count: number }>('/notifications/read-all'),
};

// =====================================================
// NEW: Admin Reports API
// =====================================================
export const adminReportsApi = {
  // Get aggregate inventory report
  getInventoryReport: () =>
    api.get<InventoryAggregateReport>('/admin/reports/inventory'),
  
  // Get inventory by manufacturer
  getManufacturerInventory: (manufacturerId?: string) =>
    api.get('/admin/reports/inventory/manufacturer', { params: { manufacturerId } }),
  
  // Get inventory by retailer
  getRetailerInventory: (retailerId?: string) =>
    api.get('/admin/reports/inventory/retailer', { params: { retailerId } }),
};

export default api;