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
  getManufacturers: () => api.get<User[]>('/users/manufacturers'),
  getRetailers: () => api.get<User[]>('/users/retailers'),
  getOne: (id: string) => api.get<User>(`/users/${id}`),
  create: (data: { email: string; password: string; name: string; role: string }) =>
    api.post<User>('/users', data),
  update: (id: string, data: { name?: string; isActive?: boolean }) =>
    api.patch<User>(`/users/${id}`, data),
  changePassword: (id: string, newPassword: string) =>
    api.patch(`/users/${id}/password`, { newPassword }),
  delete: (id: string) => api.delete(`/users/${id}`),
};

// Materials API
export const materialsApi = {
  getAll: (includeInactive?: boolean) =>
    api.get<Material[]>('/materials', { params: { includeInactive } }),
  getOne: (id: string) => api.get<Material>(`/materials/${id}`),
  create: (data: CreateMaterialDto) => api.post<Material>('/materials', data),
  update: (id: string, data: Partial<Material>) =>
    api.patch<Material>(`/materials/${id}`, data),
  delete: (id: string) => api.delete(`/materials/${id}`),
};

// Production API
export const productionApi = {
  createBatch: (data: CreateProductionBatchDto) =>
    api.post<ProductionBatch>('/production/batch', data),
  getSummary: () => api.get<ProductionSummary>('/production/summary'),
  getBatches: (params?: { materialId?: string; limit?: number }) =>
    api.get<ProductionBatch[]>('/production/batches', { params }),
  getBatch: (id: string) => api.get<ProductionBatch>(`/production/batches/${id}`),
};

// Manufacturer Inventory API
export const manufacturerInventoryApi = {
  getMyInventory: () =>
    api.get<ManufacturerInventorySummary>('/manufacturer/inventory'),
};

// Retailer Inventory API
export const retailerInventoryApi = {
  getMyInventory: () =>
    api.get<RetailerInventorySummary>('/retailer/inventory'),
};

// SRN API
export const srnApi = {
  create: (data: CreateSRNDto) => api.post<SRN>('/srn', data),
  submit: (id: string) => api.post<SRN>(`/srn/${id}/submit`),
  process: (id: string, data: ApproveSRNDto) => api.post<SRN>(`/srn/${id}/process`, data),
  getMy: (status?: string) => api.get<SRN[]>('/srn/my', { params: { status } }),
  getAll: (status?: string) => api.get<SRN[]>('/srn', { params: { status } }),
  getOne: (id: string) => api.get<SRN>(`/srn/${id}`),
  getPendingCount: () => api.get<{ count: number }>('/srn/pending/count'),
};

// Dispatch API
export const dispatchApi = {
  create: (srnId: string) => api.post<DispatchOrder>('/dispatch', { srnId }),
  execute: (id: string, deliveryNotes?: string) =>
    api.post<DispatchOrder>(`/dispatch/${id}/execute`, { deliveryNotes }),
  getMy: () => api.get<DispatchOrder[]>('/dispatch/my'),
  getAll: (status?: string) => api.get<DispatchOrder[]>('/dispatch', { params: { status } }),
  getOne: (id: string) => api.get<DispatchOrder>(`/dispatch/${id}`),
};

// GRN API
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

export default api;