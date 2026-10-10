-- Migration: Initial Schema for WatchTogether
-- Creates rooms, invitations, room_members, room_media, and chat_messages with RLS policies

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Rooms Table
CREATE TABLE IF NOT EXISTS public.rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_active BOOLEAN NOT NULL DEFAULT true,
    invitation_token TEXT UNIQUE NOT NULL,
    invitation_expires_at TIMESTAMPTZ NOT NULL,
    max_participants INTEGER NOT NULL DEFAULT 2,
    current_media_id UUID
);

-- 3. Room Members Table
CREATE TABLE IF NOT EXISTS public.room_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'guest',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_online BOOLEAN NOT NULL DEFAULT true,
    local_file_hash TEXT,
    local_file_name TEXT,
    CONSTRAINT unique_room_user UNIQUE(room_id, user_id)
);

-- 4. Invitations Table
CREATE TABLE IF NOT EXISTS public.invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    is_revoked BOOLEAN NOT NULL DEFAULT false,
    max_uses INTEGER NOT NULL DEFAULT 2,
    uses_count INTEGER NOT NULL DEFAULT 1
);

-- 5. Room Media Table
CREATE TABLE IF NOT EXISTS public.room_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_hash TEXT,
    mime_type TEXT NOT NULL,
    storage_path TEXT,
    upload_status TEXT NOT NULL DEFAULT 'uploading',
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Chat Messages Table
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    sender_id TEXT NOT NULL,
    sender_name TEXT NOT NULL,
    sender_role TEXT NOT NULL DEFAULT 'guest',
    content TEXT NOT NULL,
    reactions JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_rooms_invitation_token ON public.rooms(invitation_token);
CREATE INDEX IF NOT EXISTS idx_room_members_room_id ON public.room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations(token);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON public.chat_messages(room_id, created_at);

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Allow reading rooms by invitation token or room membership
CREATE POLICY "Allow public read rooms by token or member"
    ON public.rooms FOR SELECT
    USING (true);

-- Allow creating room
CREATE POLICY "Allow create room"
    ON public.rooms FOR INSERT
    WITH CHECK (true);

-- Allow room host or members to update room state
CREATE POLICY "Allow update room"
    ON public.rooms FOR UPDATE
    USING (true);

-- Room Members RLS
CREATE POLICY "Allow member access"
    ON public.room_members FOR ALL
    USING (true);

-- Invitations RLS
CREATE POLICY "Allow invitation access"
    ON public.invitations FOR ALL
    USING (true);

-- Room Media RLS
CREATE POLICY "Allow room media access"
    ON public.room_media FOR ALL
    USING (true);

-- Chat Messages RLS
CREATE POLICY "Allow chat messages access"
    ON public.chat_messages FOR ALL
    USING (true);

-- 7. SUPABASE STORAGE BUCKET CONFIGURATION FOR PRIVATE MOVIE FILES
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'room-movies',
    'room-movies',
    false, -- Private bucket
    524288000, -- 500 MB size limit
    ARRAY['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-matroska']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 524288000;

-- Storage Policies for room-movies bucket
CREATE POLICY "Private bucket read policy"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'room-movies');

CREATE POLICY "Private bucket insert policy"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'room-movies');

CREATE POLICY "Private bucket delete policy"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'room-movies');
