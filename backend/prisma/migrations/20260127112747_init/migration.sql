-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MANUFACTURER', 'RETAILER');

-- CreateEnum
CREATE TYPE "SRNStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'PARTIAL', 'REJECTED');

-- CreateEnum
CREATE TYPE "DispatchStatus" AS ENUM ('PENDING', 'IN_TRANSIT', 'DELIVERED');

-- CreateEnum
CREATE TYPE "GRNStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "CommissionType" AS ENUM ('PERCENTAGE', 'FLAT_PER_UNIT');

-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('PENDING', 'PAID');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('PRODUCTION', 'DISPATCH_BLOCK', 'DISPATCH_EXECUTE', 'GRN_RECEIVE', 'SALE', 'PACKET_OPEN');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materials" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "hsnCode" TEXT NOT NULL,
    "gstRate" DECIMAL(5,2) NOT NULL,
    "unitsPerPacket" INTEGER NOT NULL,
    "mrpPerPacket" DECIMAL(10,2) NOT NULL,
    "commissionType" "CommissionType" NOT NULL,
    "commissionValue" DECIMAL(10,2) NOT NULL,
    "hasProduction" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_batches" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "manufacturerId" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "manufactureDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "packetsProduced" INTEGER NOT NULL,
    "hsnCodeSnapshot" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "production_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manufacturer_inventory" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "manufacturerId" TEXT NOT NULL,
    "fullPackets" INTEGER NOT NULL DEFAULT 0,
    "blockedPackets" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manufacturer_inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retailer_inventory" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "retailerId" TEXT NOT NULL,
    "fullPackets" INTEGER NOT NULL DEFAULT 0,
    "looseUnits" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "retailer_inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "srns" (
    "id" TEXT NOT NULL,
    "srnNumber" TEXT NOT NULL,
    "retailerId" TEXT NOT NULL,
    "status" "SRNStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "rejectionNote" TEXT,

    CONSTRAINT "srns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "srn_items" (
    "id" TEXT NOT NULL,
    "srnId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "requestedPackets" INTEGER NOT NULL,
    "approvedPackets" INTEGER,

    CONSTRAINT "srn_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispatch_orders" (
    "id" TEXT NOT NULL,
    "dispatchNumber" TEXT NOT NULL,
    "srnId" TEXT NOT NULL,
    "manufacturerId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "status" "DispatchStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "executedAt" TIMESTAMP(3),
    "deliveryNotes" TEXT,
    "totalPackets" INTEGER NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "dispatch_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispatch_items" (
    "id" TEXT NOT NULL,
    "dispatchId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "packets" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "lineTotal" DECIMAL(12,2) NOT NULL,
    "hsnCode" TEXT NOT NULL,
    "gstRate" DECIMAL(5,2) NOT NULL,

    CONSTRAINT "dispatch_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grns" (
    "id" TEXT NOT NULL,
    "grnNumber" TEXT NOT NULL,
    "dispatchId" TEXT NOT NULL,
    "retailerId" TEXT NOT NULL,
    "status" "GRNStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "grns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grn_items" (
    "id" TEXT NOT NULL,
    "grnId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "expectedPackets" INTEGER NOT NULL,
    "receivedPackets" INTEGER,
    "damagedPackets" INTEGER DEFAULT 0,

    CONSTRAINT "grn_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "grnId" TEXT NOT NULL,
    "retailerId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "cgst" DECIMAL(12,2),
    "sgst" DECIMAL(12,2),
    "igst" DECIMAL(12,2),
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "isInterstate" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "materialName" TEXT NOT NULL,
    "hsnCode" TEXT NOT NULL,
    "gstRate" DECIMAL(5,2) NOT NULL,
    "packets" INTEGER NOT NULL,
    "unitsPerPacket" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "lineTotal" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" TEXT NOT NULL,
    "saleNumber" TEXT NOT NULL,
    "retailerId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "unitsSold" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "packetsOpened" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commissions" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "retailerId" TEXT NOT NULL,
    "commissionType" "CommissionType" NOT NULL,
    "commissionRate" DECIMAL(10,2) NOT NULL,
    "unitsSold" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "CommissionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_transactions" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "transactionType" "TransactionType" NOT NULL,
    "locationType" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "packetsChange" INTEGER NOT NULL,
    "unitsChange" INTEGER NOT NULL DEFAULT 0,
    "referenceType" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "packetsAfter" INTEGER NOT NULL,
    "unitsAfter" INTEGER NOT NULL DEFAULT 0,
    "blockedAfter" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sequence_counters" (
    "id" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "currentValue" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "sequence_counters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "production_batches_manufacturerId_batchNumber_key" ON "production_batches"("manufacturerId", "batchNumber");

-- CreateIndex
CREATE UNIQUE INDEX "manufacturer_inventory_materialId_manufacturerId_key" ON "manufacturer_inventory"("materialId", "manufacturerId");

-- CreateIndex
CREATE UNIQUE INDEX "retailer_inventory_materialId_retailerId_key" ON "retailer_inventory"("materialId", "retailerId");

-- CreateIndex
CREATE UNIQUE INDEX "srns_srnNumber_key" ON "srns"("srnNumber");

-- CreateIndex
CREATE UNIQUE INDEX "srn_items_srnId_materialId_key" ON "srn_items"("srnId", "materialId");

-- CreateIndex
CREATE UNIQUE INDEX "dispatch_orders_dispatchNumber_key" ON "dispatch_orders"("dispatchNumber");

-- CreateIndex
CREATE UNIQUE INDEX "dispatch_orders_srnId_key" ON "dispatch_orders"("srnId");

-- CreateIndex
CREATE UNIQUE INDEX "dispatch_items_dispatchId_materialId_key" ON "dispatch_items"("dispatchId", "materialId");

-- CreateIndex
CREATE UNIQUE INDEX "grns_grnNumber_key" ON "grns"("grnNumber");

-- CreateIndex
CREATE UNIQUE INDEX "grns_dispatchId_key" ON "grns"("dispatchId");

-- CreateIndex
CREATE UNIQUE INDEX "grn_items_grnId_materialId_key" ON "grn_items"("grnId", "materialId");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "invoices"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_grnId_key" ON "invoices"("grnId");

-- CreateIndex
CREATE UNIQUE INDEX "sales_saleNumber_key" ON "sales"("saleNumber");

-- CreateIndex
CREATE UNIQUE INDEX "commissions_saleId_key" ON "commissions"("saleId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manufacturer_inventory" ADD CONSTRAINT "manufacturer_inventory_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manufacturer_inventory" ADD CONSTRAINT "manufacturer_inventory_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retailer_inventory" ADD CONSTRAINT "retailer_inventory_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retailer_inventory" ADD CONSTRAINT "retailer_inventory_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "srns" ADD CONSTRAINT "srns_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "srns" ADD CONSTRAINT "srns_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "srn_items" ADD CONSTRAINT "srn_items_srnId_fkey" FOREIGN KEY ("srnId") REFERENCES "srns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "srn_items" ADD CONSTRAINT "srn_items_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_orders" ADD CONSTRAINT "dispatch_orders_srnId_fkey" FOREIGN KEY ("srnId") REFERENCES "srns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_orders" ADD CONSTRAINT "dispatch_orders_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_orders" ADD CONSTRAINT "dispatch_orders_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_items" ADD CONSTRAINT "dispatch_items_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES "dispatch_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_items" ADD CONSTRAINT "dispatch_items_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grns" ADD CONSTRAINT "grns_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES "dispatch_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grns" ADD CONSTRAINT "grns_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grn_items" ADD CONSTRAINT "grn_items_grnId_fkey" FOREIGN KEY ("grnId") REFERENCES "grns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grn_items" ADD CONSTRAINT "grn_items_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_grnId_fkey" FOREIGN KEY ("grnId") REFERENCES "grns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
