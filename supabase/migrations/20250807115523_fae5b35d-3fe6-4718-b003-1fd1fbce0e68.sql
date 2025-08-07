-- Update profiles table to support user and admin roles
ALTER TYPE IF EXISTS user_role ADD VALUE IF NOT EXISTS 'user';
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'user');
    END IF;
END
$$;

-- Alter the profiles table to use the enum type
ALTER TABLE profiles 
ALTER COLUMN ruolo TYPE user_role USING ruolo::user_role;

-- Set default to user instead of admin
ALTER TABLE profiles 
ALTER COLUMN ruolo SET DEFAULT 'user'::user_role;

-- Insert a sample user account for testing
INSERT INTO profiles (user_id, nome, email, ruolo) 
VALUES ('00000000-0000-0000-0000-000000000001', 'User Test', 'user@test.com', 'user')
ON CONFLICT (user_id) DO NOTHING;