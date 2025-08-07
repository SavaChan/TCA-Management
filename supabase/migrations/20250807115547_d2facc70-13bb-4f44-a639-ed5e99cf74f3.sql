-- Create user_role enum type
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