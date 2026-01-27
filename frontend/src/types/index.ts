// Enums
export type Role = 'ADMIN' | 'MANUFACTURER' | 'RETAILER';
export type CommissionType = 'PERCENTAGE' | 'FLAT_PER_UNIT';
export type SRNStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'PARTIAL' | 'REJECTED';
export type DispatchStatus = 'PENDING' | 'IN_TRANSIT' | 'DELIVERED';
export type GRNStatus = 'PENDING' | 'CONFIRMED' | 'DISPUTED';
export type CommissionStatus = 'PENDING' | 'PAID';

// User
export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive?: boolean;
  createdAt?: string;
}

// Auth
export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface SystemStatus {
  bootstrapped: boolean;
}

// Material
export interface Material {
  id: string;
  name: string;
  description?: string;
  hsnCode: string;
  gstRate: number;
  unitsPerPacket: number;
  mrpPerPacket: number;
  unitPrice: number;
  commissionType: CommissionType;
  commissionValue: number;
  hasProduction: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface CreateMaterialDto {
  name: string;
  description?: string;
  hsnCode: string;
  gstRate: number;
  unitsPerPacket: number;
  mrpPerPacket: number;
  commissionType: CommissionType;
  commissionValue: number;
}

// Production
export interface ProductionBatch {
  id: string;
  materialId: string;
  materialName: string;
  manufacturerId: string;
  batchNumber: string;
  manufactureDate: string;
  expiryDate: string;
  packetsProduced: number;
  hsnCodeSnapshot: string;
  createdAt: string;
}

export interface CreateProductionBatchDto {
  materialId: string;
  batchNumber: string;
  manufactureDate: string;
  expiryDate: string;
  packetsProduced: number;
}

export interface ProductionSummary {
  totalBatches: number;
  totalPacketsProduced: number;
  recentBatches: ProductionBatch[];
}

// Manufacturer Inventory
export interface ManufacturerInventoryItem {
  id: string;
  materialId: string;
  materialName: string;
  manufacturerId: string;
  availablePackets: number;
  blockedPackets: number;
  totalPackets: number;
  updatedAt: string;
}

export interface ManufacturerInventorySummary {
  totalMaterials: number;
  totalAvailablePackets: number;
  totalBlockedPackets: number;
  items: ManufacturerInventoryItem[];
}

// Retailer Inventory
export interface RetailerInventoryItem {
  id: string;
  materialId: string;
  materialName: string;
  retailerId: string;
  fullPackets: number;
  looseUnits: number;
  unitsPerPacket: number;
  totalUnits: number;
  updatedAt: string;
}

export interface RetailerInventorySummary {
  totalMaterials: number;
  totalPackets: number;
  totalLooseUnits: number;
  items: RetailerInventoryItem[];
}

// SRN
export interface SRNItem {
  id: string;
  materialId: string;
  materialName: string;
  requestedPackets: number;
  approvedPackets?: number;
}

export interface SRN {
  id: string;
  srnNumber: string;
  retailerId: string;
  retailerName: string;
  status: SRNStatus;
  items: SRNItem[];
  createdAt: string;
  submittedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  approvedBy?: string;
  approverName?: string;
  rejectionNote?: string;
}

export interface CreateSRNDto {
  items: { materialId: string; requestedPackets: number }[];
}

export interface ApproveSRNDto {
  action: 'APPROVED' | 'PARTIAL' | 'REJECTED';
  manufacturerId: string;
  items?: { materialId: string; approvedPackets: number }[];
  rejectionNote?: string;
}

// Dispatch
export interface DispatchItem {
  id: string;
  materialId: string;
  materialName: string;
  packets: number;
  unitPrice?: number;
  lineTotal?: number;
  hsnCode?: string;
  gstRate?: number;
}

export interface DispatchOrder {
  id: string;
  dispatchNumber: string;
  srnId: string;
  srnNumber: string;
  manufacturerId: string;
  retailerName: string;
  status: DispatchStatus;
  totalPackets: number;
  subtotal?: number;
  items: DispatchItem[];
  createdAt: string;
  executedAt?: string;
  deliveryNotes?: string;
  createdBy?: string;
  createdByName?: string;
}

// GRN
export interface GRNItem {
  id: string;
  materialId: string;
  materialName: string;
  expectedPackets: number;
  receivedPackets?: number;
  damagedPackets?: number;
}

export interface GRN {
  id: string;
  grnNumber: string;
  dispatchId: string;
  dispatchNumber: string;
  retailerId: string;
  retailerName: string;
  status: GRNStatus;
  items: GRNItem[];
  createdAt: string;
  confirmedAt?: string;
  notes?: string;
  hasInvoice: boolean;
}

export interface ConfirmGRNDto {
  items: { materialId: string; receivedPackets: number; damagedPackets?: number }[];
  notes?: string;
}

// Invoice
export interface InvoiceItem {
  id: string;
  materialId: string;
  materialName: string;
  hsnCode: string;
  gstRate: number;
  packets: number;
  unitsPerPacket: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  grnId: string;
  grnNumber: string;
  retailerId: string;
  retailerName: string;
  subtotal: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  totalAmount: number;
  isInterstate: boolean;
  items: InvoiceItem[];
  createdAt: string;
}

// Sale
export interface Sale {
  id: string;
  saleNumber: string;
  retailerId: string;
  materialId: string;
  materialName: string;
  unitsSold: number;
  unitPrice: number;
  totalAmount: number;
  packetsOpened: number;
  createdAt: string;
}

export interface CreateSaleDto {
  materialId: string;
  unitsSold: number;
}

export interface SaleSummary {
  totalSales: number;
  totalUnitsSold: number;
  totalRevenue: number;
  recentSales: Sale[];
}

// Commission
export interface Commission {
  id: string;
  saleId: string;
  saleNumber: string;
  retailerId: string;
  retailerName: string;
  commissionType: CommissionType;
  commissionRate: number;
  unitsSold: number;
  amount: number;
  status: CommissionStatus;
  paidAt?: string;
  createdAt: string;
}

export interface CommissionSummary {
  totalCommissions: number;
  totalPending: number;
  totalPaid: number;
  pendingAmount: number;
  paidAmount: number;
}

// API Response wrapper
export interface ApiResponse<T> {
  data: T;
  status: number;
}