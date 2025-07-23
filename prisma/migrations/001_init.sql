CREATE TABLE "Link" (
    "id" BIGSERIAL NOT NULL,
    "originalUrl" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "visits" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Link_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Link_code_key" ON "Link"("code");
CREATE INDEX "Link_code_expiresAt_idx" ON "Link"("code", "expiresAt");

