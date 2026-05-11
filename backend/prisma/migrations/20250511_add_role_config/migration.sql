-- CreateTable
CREATE TABLE "RoleConfig" (
    "id" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL,
    "permissions" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoleConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RoleConfig_role_key" ON "RoleConfig"("role");
