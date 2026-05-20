-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'BERATER');

-- CreateEnum
CREATE TYPE "StudyStatus" AS ENUM ('DRAFT', 'READY', 'GENERATED');

-- CreateEnum
CREATE TYPE "ImageType" AS ENUM ('BEFORE', 'AFTER');

-- CreateEnum
CREATE TYPE "DocFormat" AS ENUM ('PPTX', 'PDF');

-- CreateEnum
CREATE TYPE "FormPref" AS ENUM ('WIZARD', 'SINGLE_PAGE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "password_changed_at" TIMESTAMP(3),
    "role" "Role" NOT NULL DEFAULT 'BERATER',
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone" TEXT,
    "mobile" TEXT,
    "address_line" TEXT,
    "signature_photo_url" TEXT,
    "must_change_password" BOOLEAN NOT NULL DEFAULT true,
    "failed_login_count" INTEGER NOT NULL DEFAULT 0,
    "lockout_until" TIMESTAMP(3),
    "form_preference" "FormPref" NOT NULL DEFAULT 'WIZARD',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),
    "organization_id" TEXT NOT NULL DEFAULT 'greenscout',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "contact_first_name" TEXT NOT NULL,
    "contact_last_name" TEXT NOT NULL,
    "company_name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "billing_address" TEXT,
    "billing_zip_code" TEXT,
    "billing_city" TEXT,
    "notes" TEXT,
    "deleted_at" TIMESTAMP(3),
    "organization_id" TEXT NOT NULL DEFAULT 'greenscout',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Study" (
    "id" TEXT NOT NULL,
    "consultant_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "status" "StudyStatus" NOT NULL DEFAULT 'DRAFT',
    "object_name" TEXT NOT NULL,
    "object_address" TEXT NOT NULL,
    "object_zip_code" TEXT NOT NULL,
    "object_city" TEXT NOT NULL,
    "flurstueck" TEXT NOT NULL,
    "anlage_kwp" DECIMAL(10,3) NOT NULL,
    "pv_erzeugung_kwh_jahr" DECIMAL(12,2) NOT NULL,
    "pv_eigenverbrauch_kwh_jahr" DECIMAL(12,2) NOT NULL,
    "pv_verkauf_eur_kwh" DECIMAL(8,4) NOT NULL,
    "verbrauch_kwh_jahr" DECIMAL(12,2) NOT NULL,
    "versorger_preis_eur_kwh" DECIMAL(8,4) NOT NULL,
    "pacht_eur_pro_kwp" DECIMAL(8,2) NOT NULL DEFAULT 100,
    "vertragslaufzeit_jahre" INTEGER NOT NULL DEFAULT 20,
    "modul_anzahl" INTEGER,
    "modul_flaeche_m2" DECIMAL(10,2),
    "eigenverbrauchsquote_prozent" DECIMAL(5,2),
    "netzeinspeisung_kwh_jahr" DECIMAL(12,2),
    "szenario_preis_1" DECIMAL(8,4) DEFAULT 0.35,
    "szenario_preis_2" DECIMAL(8,4) DEFAULT 0.40,
    "szenario_preis_3" DECIMAL(8,4) DEFAULT 0.45,
    "termin_vorschlag_1" TIMESTAMP(3),
    "termin_vorschlag_2" TIMESTAMP(3),
    "co2_override" BOOLEAN NOT NULL DEFAULT false,
    "co2_tonnen_pro_jahr" DECIMAL(10,2),
    "co2_hektar_mischwald" DECIMAL(10,2),
    "co2_fussballfelder_pro_jahr" DECIMAL(10,2),
    "deleted_at" TIMESTAMP(3),
    "organization_id" TEXT NOT NULL DEFAULT 'greenscout',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "generated_at" TIMESTAMP(3),

    CONSTRAINT "Study_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyImage" (
    "id" TEXT NOT NULL,
    "study_id" TEXT NOT NULL,
    "type" "ImageType" NOT NULL,
    "filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "width_px" INTEGER NOT NULL,
    "height_px" INTEGER NOT NULL,
    "file_size_bytes" INTEGER NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudyImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedDocument" (
    "id" TEXT NOT NULL,
    "study_id" TEXT NOT NULL,
    "generated_by_id" TEXT,
    "format" "DocFormat" NOT NULL,
    "filename" TEXT NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeneratedDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "action" TEXT NOT NULL,
    "change_set" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "organization_id" TEXT NOT NULL DEFAULT 'greenscout',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_organization_id_role_active_deleted_at_idx" ON "User"("organization_id", "role", "active", "deleted_at");

-- CreateIndex
CREATE INDEX "User_organization_id_created_at_idx" ON "User"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "Customer_organization_id_deleted_at_idx" ON "Customer"("organization_id", "deleted_at");

-- CreateIndex
CREATE INDEX "Customer_organization_id_contact_last_name_idx" ON "Customer"("organization_id", "contact_last_name");

-- CreateIndex
CREATE INDEX "Study_consultant_id_idx" ON "Study"("consultant_id");

-- CreateIndex
CREATE INDEX "Study_customer_id_idx" ON "Study"("customer_id");

-- CreateIndex
CREATE INDEX "Study_status_idx" ON "Study"("status");

-- CreateIndex
CREATE INDEX "Study_organization_id_status_idx" ON "Study"("organization_id", "status");

-- CreateIndex
CREATE INDEX "Study_organization_id_consultant_id_deleted_at_idx" ON "Study"("organization_id", "consultant_id", "deleted_at");

-- CreateIndex
CREATE INDEX "Study_organization_id_created_at_idx" ON "Study"("organization_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "StudyImage_study_id_type_key" ON "StudyImage"("study_id", "type");

-- CreateIndex
CREATE INDEX "GeneratedDocument_study_id_generated_at_idx" ON "GeneratedDocument"("study_id", "generated_at" DESC);

-- CreateIndex
CREATE INDEX "AuditLog_user_id_idx" ON "AuditLog"("user_id");

-- CreateIndex
CREATE INDEX "AuditLog_entity_type_entity_id_idx" ON "AuditLog"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "AuditLog_created_at_idx" ON "AuditLog"("created_at" DESC);

-- CreateIndex
CREATE INDEX "AuditLog_organization_id_created_at_idx" ON "AuditLog"("organization_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "Study" ADD CONSTRAINT "Study_consultant_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Study" ADD CONSTRAINT "Study_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyImage" ADD CONSTRAINT "StudyImage_study_id_fkey" FOREIGN KEY ("study_id") REFERENCES "Study"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_study_id_fkey" FOREIGN KEY ("study_id") REFERENCES "Study"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_generated_by_id_fkey" FOREIGN KEY ("generated_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
