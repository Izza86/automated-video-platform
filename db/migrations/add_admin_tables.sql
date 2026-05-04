-- Migration: Add Support Tickets and Activity Logs tables
-- Created: May 2, 2026

-- Create ticket_status enum
DO $$ BEGIN
    CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create ticket_priority enum
DO $$ BEGIN
    CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create activity_type enum
DO $$ BEGIN
    CREATE TYPE activity_type AS ENUM (
        'upload', 'download', 'process', 'signup', 'login', 'logout',
        'subscribe', 'cancel', 'update_profile', 'create_project', 'delete_project'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create support_tickets table
CREATE TABLE IF NOT EXISTS support_ticket (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    status ticket_status NOT NULL DEFAULT 'open',
    priority ticket_priority NOT NULL DEFAULT 'medium',
    assigned_to TEXT REFERENCES "user"(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMP
);

-- Create indexes for support_tickets
CREATE INDEX IF NOT EXISTS ticket_user_id_idx ON support_ticket(user_id);
CREATE INDEX IF NOT EXISTS ticket_status_idx ON support_ticket(status);
CREATE INDEX IF NOT EXISTS ticket_priority_idx ON support_ticket(priority);
CREATE INDEX IF NOT EXISTS ticket_created_at_idx ON support_ticket(created_at);

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS activity_log (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    type activity_type NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for activity_logs
CREATE INDEX IF NOT EXISTS activity_user_id_idx ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS activity_type_idx ON activity_log(type);
CREATE INDEX IF NOT EXISTS activity_created_at_idx ON activity_log(created_at);

-- Add comments
COMMENT ON TABLE support_ticket IS 'User support tickets for admin management';
COMMENT ON TABLE activity_log IS 'User activity logs for tracking platform usage';
