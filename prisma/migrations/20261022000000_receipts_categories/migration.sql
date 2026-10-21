ALTER TYPE "ExpenseCategory" ADD VALUE 'COMPUTER_HARDWARE';
ALTER TYPE "ExpenseCategory" ADD VALUE 'INTERNET_PHONE';
CREATE UNIQUE INDEX "Expense_id_userId_key" ON "Expense"("id", "userId");
CREATE TABLE "Receipt" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expenseId" TEXT,
  "image" BYTEA NOT NULL,
  "mimeType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Receipt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Receipt_size_check" CHECK ("size" > 0 AND "size" <= 5242880 AND octet_length("image") = "size"),
  CONSTRAINT "Receipt_mime_check" CHECK ("mimeType" IN ('image/jpeg', 'image/png', 'image/webp')),
  CONSTRAINT "Receipt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Receipt_expenseId_userId_fkey" FOREIGN KEY ("expenseId", "userId") REFERENCES "Expense"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Receipt_expenseId_key" ON "Receipt"("expenseId");
CREATE INDEX "Receipt_userId_createdAt_idx" ON "Receipt"("userId", "createdAt");
CREATE UNIQUE INDEX "Receipt_expenseId_userId_key" ON "Receipt"("expenseId", "userId");
