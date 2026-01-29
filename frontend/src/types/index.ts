// Enums
export type Role = 'ADMIN' | 'MANUFACTURER' | 'RETAILER';
export type CommissionType = 'PERCENTAGE' | 'FLAT_PER_UNIT';
export type SRNStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'PARTIAL' | 'REJECTED';
export type DispatchStatus = 'PENDING' | 'IN_TRANSIT' | 'DELIVERED';
export type GRNStatus = 'PENDING' | 'CONFIRMED' | 'DISPUTED';
export type CommissionStatus = 'PENDING' | 'PAID';

// NEW: Return enums
export type ReturnReason = 'DAMAGED_GOODS' | 'MISSING_UNITS' | 'QUALITY_ISSUE' | 'WRONG_PRODUCT' | 'OTHER';
export type ReturnStatus = 'RAISED' | 'UNDER_REVIEW' | 'APPROVED_RESTOCK' | 'APPROVED_REPLACE' | 'REJECTED' | 'RESOLVED';

// NEW: Notification types
export type NotificationType = 
  | 'RETURN_RAISED' 
  | 'RETURN_RESOLVED' 
  | 'SRN_SUBMITTED' 
  | 'SRN_APPROVED' 
  | 'SRN_REJECTED' 
  | 'DISPATCH_CREATED' 
  | 'DISPATCH_EXECUTED' 
  | 'GRN_CONFIRMED';

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

// Material - UPDATED: Added sqCode
export interface Material {
  id: string;
  name: string;
  sqCode: string;  // NEW: Required unique stock code
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

// UPDATED: Added sqCode
export interface CreateMaterialDto {
  name: string;
  sqCode: string;  // NEW: Required
  description?: string;
  hsnCode: string;
  gstRate: number;
  unitsPerPacket: number;
  mrpPerPacket: number;
  commissionType: CommissionType;
  commissionValue: number;
}

// Production - UPDATED: Added sqCode and looseUnits support
export interface ProductionBatch {
  id: string;
  materialId: string;
  materialName: string;
  sqCode?: string;  // NEW
  manufacturerId: string;
  manufacturerName?: string;
  batchNumber: string;
  manufactureDate: string;
  expiryDate: string;
  packetsProduced: number;
  looseUnitsProduced: number;  // NEW
  hsnCodeSnapshot: string;
  createdAt: string;
}

// UPDATED: Can now use sqCode OR materialId, added looseUnits
export interface CreateProductionBatchDto {
  materialId?: string;  // Now optional - provide either materialId OR sqCode
  sqCode?: string;      // NEW: Alternative to materialId
  batchNumber: string;
  manufactureDate: string;
  expiryDate: string;
  packetsProduced: number;
  looseUnitsProduced?: number;  // NEW: Optional loose units
}

export interface ProductionSummary {
  totalBatches: number;
  totalPacketsProduced: number;
  totalLooseUnitsProduced?: number;  // NEW
  recentBatches: ProductionBatch[];
}

// Manufacturer Inventory - UPDATED: Added loose units and blocking
export interface ManufacturerInventoryItem {
  id: string;
  materialId: string;
  materialName: string;
  sqCode?: string;  // NEW
  manufacturerId: string;
  manufacturerName?: string;
  availablePackets: number;
  blockedPackets: number;
  totalPackets: number;
  looseUnits: number;         // NEW
  blockedLooseUnits: number;  // NEW
  updatedAt: string;
}

export interface ManufacturerInventorySummary {
  totalMaterials: number;
  totalAvailablePackets: number;
  totalBlockedPackets: number;
  totalLooseUnits?: number;         // NEW
  totalBlockedLooseUnits?: number;  // NEW
  items: ManufacturerInventoryItem[];
}

// Retailer Inventory (unchanged structure, just noting sqCode support)
export interface RetailerInventoryItem {
  id: string;
  materialId: string;
  materialName: string;
  sqCode?: string;  // NEW
  retailerId: string;
  retailerName?: string;
  fullPackets: number;
  looseUnits: number;
  unitsPerPacket: number;
  totalPackets: number;
  totalUnits: number;
  updatedAt: string;
}

export interface RetailerInventorySummary {
  totalMaterials: number;
  totalPackets: number;
  totalLooseUnits: number;
  items: RetailerInventoryItem[];
}

// SRN - UPDATED: manufacturerId now required, added loose units
export interface SRNItem {
  id: string;
  materialId: string;
  materialName: string;
  sqCode?: string;  // NEW
  requestedPackets: number;
  requestedLooseUnits: number;  // NEW
  approvedPackets?: number;
  approvedLooseUnits?: number;  // NEW
}

export interface SRN {
  id: string;
  srnNumber: string;
  retailerId: string;
  retailerName: string;
  manufacturerId: string;  // CHANGED: Now required (was optional)
  manufacturerName: string;  // CHANGED: Now required
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

// UPDATED: manufacturerId now required, added loose units
export interface CreateSRNDto {
  manufacturerId: string;  // NEW: Required - from assigned manufacturers
  items: { 
    materialId: string; 
    requestedPackets: number;
    requestedLooseUnits?: number;  // NEW
  }[];
}

// UPDATED: manufacturerId no longer needed here (already set on SRN)
export interface ApproveSRNDto {
  action: 'APPROVED' | 'PARTIAL' | 'REJECTED';
  items?: { 
    materialId: string; 
    approvedPackets: number;
    approvedLooseUnits?: number;  // NEW
  }[];
  rejectionNote?: string;
}

// Dispatch - UPDATED: Added loose units
export interface DispatchItem {
  id: string;
  materialId: string;
  materialName: string;
  sqCode?: string;  // NEW
  packets: number;
  looseUnits: number;  // NEW
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
  manufacturerName?: string;
  retailerId: string;
  retailerName: string;
  status: DispatchStatus;
  totalPackets: number;
  totalLooseUnits: number;  // NEW
  subtotal?: number;
  items: DispatchItem[];
  createdAt: string;
  executedAt?: string;
  deliveryNotes?: string;
  createdBy?: string;  // Now manufacturer ID
  createdByName?: string;
}

// GRN - UPDATED: Removed damagedPackets, added loose units
export interface GRNItem {
  id: string;
  materialId: string;
  materialName: string;
  sqCode?: string;  // NEW
  expectedPackets: number;
  expectedLooseUnits: number;  // NEW
  receivedPackets?: number;
  receivedLooseUnits?: number;  // NEW
  // REMOVED: damagedPackets - use Return workflow instead
}

export interface GRN {
  id: string;
  grnNumber: string;
  dispatchId: string;
  dispatchNumber: string;
  retailerId: string;
  retailerName: string;
  manufacturerId?: string;  // NEW
  manufacturerName?: string;  // NEW
  status: GRNStatus;
  items: GRNItem[];
  createdAt: string;
  confirmedAt?: string;
  notes?: string;
  hasInvoice: boolean;
}

// UPDATED: Removed damagedPackets, added loose units
export interface ConfirmGRNDto {
  items: { 
    materialId: string; 
    receivedPackets: number;
    receivedLooseUnits?: number;  // NEW
    // REMOVED: damagedPackets
  }[];
  notes?: string;
}

// Invoice - UPDATED: Added loose units
export interface InvoiceItem {
  id: string;
  materialId: string;
  materialName: string;
  sqCode?: string;  // NEW
  hsnCode: string;
  gstRate: number;
  packets: number;
  looseUnits: number;  // NEW
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

// Sale (unchanged)
export interface Sale {
  id: string;
  saleNumber: string;
  retailerId: string;
  retailerName?: string;
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

// Commission (unchanged)
export interface Commission {
  id: string;
  saleId: string;
  saleNumber: string;
  retailerId: string;
  retailerName: string;
  materialId?: string;
  materialName?: string;
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

// =====================================================
// NEW: Assignment Types (Retailer-Manufacturer mapping)
// =====================================================
export interface Assignment {
  id: string;
  retailerId: string;
  retailerName: string;
  retailerEmail: string;
  manufacturerId: string;
  manufacturerName: string;
  manufacturerEmail: string;
  assignedAt: string;
  assignedBy: string;
  assignedByName: string;
  isActive: boolean;
}

export interface CreateAssignmentDto {
  retailerId: string;
  manufacturerId: string;
}

export interface AssignedManufacturer {
  id: string;
  name: string;
  email: string;
}

// =====================================================
// NEW: Return Types (replaces damaged goods workflow)
// =====================================================
export interface ReturnItem {
  id: string;
  materialId: string;
  materialName: string;
  sqCode?: string;
  packets: number;
  looseUnits: number;
}

export interface Return {
  id: string;
  returnNumber: string;
  retailerId: string;
  retailerName: string;
  manufacturerId: string;
  manufacturerName: string;
  grnId?: string;
  grnNumber?: string;
  status: ReturnStatus;
  reason: ReturnReason;
  reasonDetails?: string;
  items: ReturnItem[];
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolverName?: string;
  resolutionNotes?: string;
}

export interface CreateReturnDto {
  manufacturerId: string;
  grnId?: string;
  reason: ReturnReason;
  reasonDetails?: string;
  items: {
    materialId: string;
    packets?: number;
    looseUnits?: number;
  }[];
}

export interface ResolveReturnDto {
  resolution: 'APPROVED_RESTOCK' | 'APPROVED_REPLACE' | 'REJECTED';
  resolutionNotes?: string;
}

// =====================================================
// NEW: Notification Types
// =====================================================
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  referenceId?: string;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
}

export interface NotificationCount {
  total: number;
  unread: number;
}

// =====================================================
// NEW: Admin Report Types
// =====================================================
export interface ManufacturerInventoryReport {
  manufacturerId: string;
  manufacturerName: string;
  totalMaterials: number;
  totalAvailablePackets: number;
  totalBlockedPackets: number;
  totalLooseUnits: number;
  totalBlockedLooseUnits: number;
}

export interface RetailerInventoryReport {
  retailerId: string;
  retailerName: string;
  totalMaterials: number;
  totalPackets: number;
  totalLooseUnits: number;
  totalUnits: number;
}

export interface InventoryAggregateReport {
  totalManufacturers: number;
  totalRetailers: number;
  manufacturerInventory: ManufacturerInventoryReport[];
  retailerInventory: RetailerInventoryReport[];
}

// API Response wrapper
export interface ApiResponse<T> {
  data: T;
  status: number;
}