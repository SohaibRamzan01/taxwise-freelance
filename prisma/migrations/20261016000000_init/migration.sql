-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "FilingStatus" AS ENUM ('SINGLE', 'MARRIED_FILING_JOINTLY', 'HEAD_OF_HOUSEHOLD');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'VOID');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('ADVERTISING', 'CAR_AND_TRUCK', 'CONTRACT_LABOR', 'INSURANCE', 'LEGAL_AND_PROFESSIONAL', 'OFFICE_EXPENSE', 'RENT_AND_LEASE', 'SUPPLIES', 'TRAVEL', 'MEALS', 'UTILITIES', 'SOFTWARE_AND_SUBSCRIPTIONS', 'HOME_OFFICE', 'EDUCATION', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER', 'OTHER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "filingStatus" "FilingStatus" NOT NULL DEFAULT 'SINGLE',
    "taxYear" INTEGER NOT NULL DEFAULT 2026,
    "priorYearTaxCents" INTEGER NOT NULL DEFAULT 0,
    "priorYearAgiCents" INTEGER NOT NULL DEFAULT 0,
    "useSafeHarbour" BOOLEAN NOT NULL DEFAULT false,
    "businessName" TEXT,
    "businessAddress" TEXT,
    "businessEmail" TEXT,
    "businessPhone" TEXT,
    "currency" CHAR(3) NOT NULL DEFAULT 'USD',
    "nextInvoiceNumber" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "company" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "issueDate" DATE NOT NULL,
    "dueDate" DATE NOT NULL,
    "paidAt" TIMESTAMP(3),
    "subtotalCents" INTEGER NOT NULL DEFAULT 0,
    "discountCents" INTEGER NOT NULL DEFAULT 0,
    "taxRateBasisPoints" INTEGER NOT NULL DEFAULT 0,
    "taxCents" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL DEFAULT 0,
    "currency" CHAR(3) NOT NULL DEFAULT 'USD',
    "notes" TEXT,
    "terms" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(12,4) NOT NULL DEFAULT 1,
    "unitPriceCents" INTEGER NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "vendor" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "category" "ExpenseCategory" NOT NULL DEFAULT 'OTHER',
    "businessUsePercent" INTEGER NOT NULL DEFAULT 100,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'OTHER',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Income" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "date" DATE NOT NULL,
    "source" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Income_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstimatedPayment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "taxYear" INTEGER NOT NULL,
    "quarter" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "confirmation" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstimatedPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Client_userId_idx" ON "Client"("userId");

-- CreateIndex
CREATE INDEX "Client_userId_name_idx" ON "Client"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Client_id_userId_key" ON "Client"("id", "userId");

-- CreateIndex
CREATE INDEX "Invoice_userId_idx" ON "Invoice"("userId");

-- CreateIndex
CREATE INDEX "Invoice_userId_status_idx" ON "Invoice"("userId", "status");

-- CreateIndex
CREATE INDEX "Invoice_userId_issueDate_idx" ON "Invoice"("userId", "issueDate");

-- CreateIndex
CREATE INDEX "Invoice_userId_dueDate_idx" ON "Invoice"("userId", "dueDate");

-- CreateIndex
CREATE INDEX "Invoice_clientId_userId_idx" ON "Invoice"("clientId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_id_userId_key" ON "Invoice"("id", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_userId_number_key" ON "Invoice"("userId", "number");

-- CreateIndex
CREATE INDEX "InvoiceItem_userId_idx" ON "InvoiceItem"("userId");

-- CreateIndex
CREATE INDEX "InvoiceItem_invoiceId_userId_idx" ON "InvoiceItem"("invoiceId", "userId");

-- CreateIndex
CREATE INDEX "InvoiceItem_userId_invoiceId_position_idx" ON "InvoiceItem"("userId", "invoiceId", "position");

-- CreateIndex
CREATE INDEX "Expense_userId_idx" ON "Expense"("userId");

-- CreateIndex
CREATE INDEX "Expense_userId_date_idx" ON "Expense"("userId", "date");

-- CreateIndex
CREATE INDEX "Expense_userId_category_idx" ON "Expense"("userId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "Income_invoiceId_key" ON "Income"("invoiceId");

-- CreateIndex
CREATE INDEX "Income_userId_idx" ON "Income"("userId");

-- CreateIndex
CREATE INDEX "Income_userId_date_idx" ON "Income"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Income_invoiceId_userId_key" ON "Income"("invoiceId", "userId");

-- CreateIndex
CREATE INDEX "EstimatedPayment_userId_idx" ON "EstimatedPayment"("userId");

-- CreateIndex
CREATE INDEX "EstimatedPayment_userId_date_idx" ON "EstimatedPayment"("userId", "date");

-- CreateIndex
CREATE INDEX "EstimatedPayment_userId_taxYear_quarter_idx" ON "EstimatedPayment"("userId", "taxYear", "quarter");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_action_idx" ON "AuditLog"("userId", "action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_clientId_userId_fkey" FOREIGN KEY ("clientId", "userId") REFERENCES "Client"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_userId_fkey" FOREIGN KEY ("invoiceId", "userId") REFERENCES "Invoice"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Income" ADD CONSTRAINT "Income_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Income" ADD CONSTRAINT "Income_invoiceId_userId_fkey" FOREIGN KEY ("invoiceId", "userId") REFERENCES "Invoice"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimatedPayment" ADD CONSTRAINT "EstimatedPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
