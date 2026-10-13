-- ============================================================================
-- AgriLedger AI — Non-Destructive Migration
-- Migration: Add Field Inspection & Appointment Booking Tables
-- Date: 2026-10-12
-- Target Database: agri_ledger
--
-- Safety Notes:
-- - Uses CREATE TABLE IF NOT EXISTS.
-- - Foreign key types match MySQL BIGINT UNSIGNED conventions of farmers and fields.
-- - Does not alter, drop, or truncate any existing tables or rows.
-- ============================================================================

CREATE TABLE IF NOT EXISTS `inspection_availabilities` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `inspection_date` DATE NOT NULL,
  `start_time` VARCHAR(10) NOT NULL,
  `end_time` VARCHAR(10) NOT NULL,
  `max_capacity` INT NOT NULL DEFAULT 1,
  `booked_count` INT NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `notes` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_avail_date` (`inspection_date`),
  INDEX `idx_avail_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `field_inspection_appointments` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `availability_id` BIGINT UNSIGNED NOT NULL,
  `farmer_id` BIGINT UNSIGNED NOT NULL,
  `field_id` BIGINT UNSIGNED NOT NULL,
  `crop_season_id` BIGINT UNSIGNED NULL,
  `crop_type` VARCHAR(100) NOT NULL,
  `reason` VARCHAR(255) NOT NULL,
  `symptoms` TEXT NOT NULL,
  `notes` TEXT NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  `admin_notes` TEXT NULL,
  `rejection_reason` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_appoint_avail` (`availability_id`),
  INDEX `idx_appoint_farmer` (`farmer_id`),
  INDEX `idx_appoint_field` (`field_id`),
  INDEX `idx_appoint_status` (`status`),
  CONSTRAINT `fk_appoint_avail` FOREIGN KEY (`availability_id`) REFERENCES `inspection_availabilities` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_appoint_farmer` FOREIGN KEY (`farmer_id`) REFERENCES `farmers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_appoint_field` FOREIGN KEY (`field_id`) REFERENCES `fields` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_appoint_crop_season` FOREIGN KEY (`crop_season_id`) REFERENCES `crop_seasons` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `field_inspection_reports` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `appointment_id` BIGINT UNSIGNED NOT NULL,
  `inspector_name` VARCHAR(150) NOT NULL,
  `inspection_date` DATE NOT NULL,
  `affected_crop` VARCHAR(100) NOT NULL,
  `symptoms_observed` TEXT NOT NULL,
  `diagnosis` TEXT NOT NULL,
  `recommended_actions` TEXT NOT NULL,
  `suggested_products` TEXT NULL,
  `application_guidance` TEXT NULL,
  `follow_up_notes` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_report_appointment` (`appointment_id`),
  CONSTRAINT `fk_report_appointment` FOREIGN KEY (`appointment_id`) REFERENCES `field_inspection_appointments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
