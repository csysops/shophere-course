-- AddColumn for password reset
ALTER TABLE "User" ADD COLUMN "resetPasswordCode" TEXT;
ALTER TABLE "User" ADD COLUMN "resetPasswordExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "User_resetPasswordCode_key" ON "User"("resetPasswordCode");
