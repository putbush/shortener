-- Создание базы данных и основных расширений
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Автоматическая миграция Prisma схемы
-- CreateTable
CREATE TABLE IF NOT EXISTS "Link" (
    "id" SERIAL NOT NULL,
    "originalUrl" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "visits" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Link_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Link_code_key" ON "Link"("code");

-- Создание таблицы миграций Prisma (чтобы избежать повторного применения)
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id" VARCHAR(36) NOT NULL,
    "checksum" VARCHAR(64) NOT NULL,
    "finished_at" TIMESTAMPTZ,
    "migration_name" VARCHAR(255) NOT NULL,
    "logs" TEXT,
    "rolled_back_at" TIMESTAMPTZ,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "applied_steps_count" INTEGER NOT NULL DEFAULT 0,
    
    CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id")
);

-- Отмечаем миграцию как примененную
INSERT INTO "_prisma_migrations" ("id", "checksum", "migration_name", "finished_at", "applied_steps_count")
VALUES ('001-init', '001-init-checksum', '001_init', now(), 1)
ON CONFLICT ("id") DO NOTHING;
