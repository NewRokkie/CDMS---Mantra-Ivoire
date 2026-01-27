-- Migration: Create user activity tracking table
-- Description: Tracks user activities for audit and monitoring purposes
-- Created: 2025-11-10

-- Create user_activities table
CREATE TABLE IF NOT EXISTS public.user_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON public.user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_created_at ON public.user_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activities_action ON public.user_activities(action);
CREATE INDEX IF NOT EXISTS idx_user_activities_entity ON public.user_activities(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_user_date ON public.user_activities(user_id, created_at DESC);

-- Add comments
COMMENT ON TABLE public.user_activities IS 'Tracks user activities for audit and monitoring';
COMMENT ON COLUMN public.user_activities.user_id IS 'User who performed the action';
COMMENT ON COLUMN public.user_activities.action IS 'Type of action performed (e.g., login, create, update, delete)';
COMMENT ON COLUMN public.user_activities.entity_type IS 'Type of entity affected (e.g., container, user, client)';
COMMENT ON COLUMN public.user_activities.entity_id IS 'ID of the affected entity';
COMMENT ON COLUMN public.user_activities.description IS 'Human-readable description of the activity';
COMMENT ON COLUMN public.user_activities.metadata IS 'Additional context and data about the activity';

-- Enable RLS
ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admins can view all activities
CREATE POLICY "Admins can view all user activities"
    ON public.user_activities
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
            AND users.active = true
            AND users.is_deleted = false
        )
    );

-- Users can view their own activities
CREATE POLICY "Users can view their own activities"
    ON public.user_activities
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- System can insert activities (service role)
CREATE POLICY "Service role can insert activities"
    ON public.user_activities
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON public.user_activities TO authenticated;
GRANT INSERT ON public.user_activities TO authenticated;
GRANT SELECT, INSERT ON public.user_activities TO service_role;
