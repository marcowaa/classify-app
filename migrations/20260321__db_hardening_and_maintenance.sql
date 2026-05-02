-- Database hardening and maintenance baseline
-- Date: 2026-03-21
-- Safe to run multiple times (idempotent where possible)

-- =============================
-- 1) Integrity constraints
-- =============================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'child_login_requests_status_valid'
  ) THEN
    ALTER TABLE child_login_requests
      ADD CONSTRAINT child_login_requests_status_valid
      CHECK (status IN ('pending', 'approved', 'rejected', 'expired'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'parent_link_requests_status_valid'
  ) THEN
    ALTER TABLE parent_link_requests
      ADD CONSTRAINT parent_link_requests_status_valid
      CHECK (status IN ('pending', 'approved', 'rejected'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'parent_parent_sync_status_valid'
  ) THEN
    ALTER TABLE parent_parent_sync
      ADD CONSTRAINT parent_parent_sync_status_valid
      CHECK (sync_status IN ('active', 'pending', 'revoked'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sessions_expires_after_created'
  ) THEN
    ALTER TABLE sessions
      ADD CONSTRAINT sessions_expires_after_created
      CHECK (expires_at > created_at);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'otp_codes_attempts_non_negative'
  ) THEN
    ALTER TABLE otp_codes
      ADD CONSTRAINT otp_codes_attempts_non_negative
      CHECK (attempts >= 0);
  END IF;
END
$$;

-- =============================
-- 2) High-value performance indexes
-- =============================
CREATE INDEX IF NOT EXISTS idx_child_login_requests_parent_status_created
  ON child_login_requests (parent_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_child_login_requests_child_parent_device_status_created
  ON child_login_requests (child_id, parent_id, device_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_child_login_requests_status_expires
  ON child_login_requests (status, expires_at);

CREATE INDEX IF NOT EXISTS idx_parent_link_requests_primary_status_created
  ON parent_link_requests (primary_parent_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_parent_link_requests_requesting_status_created
  ON parent_link_requests (requesting_parent_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_parent_child_linking_codes_parent_used_created
  ON parent_child_linking_codes (parent_id, is_used, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_otp_request_logs_destination_created
  ON otp_request_logs (destination, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_otp_request_logs_ip_created
  ON otp_request_logs (ip_address, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sessions_parent_active_expires
  ON sessions (parent_id, is_active, expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_trusted_devices_parent_revoked_expires
  ON trusted_devices (parent_id, revoked_at, expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_child_trusted_devices_child_revoked_expires
  ON child_trusted_devices (child_id, revoked_at, expires_at DESC);

-- =============================
-- 3) Basic maintenance commands
-- =============================
ANALYZE child_login_requests;
ANALYZE otp_request_logs;
ANALYZE parent_link_requests;
ANALYZE sessions;
ANALYZE trusted_devices;
ANALYZE child_trusted_devices;
