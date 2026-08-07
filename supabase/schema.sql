-- ==========================================
-- BioFresh OS - Supabase Database Schema
-- ==========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Batches Table
CREATE TABLE public.batches (
    id TEXT PRIMARY KEY, -- e.g., 'BF-2026-0801'
    fruit_type TEXT NOT NULL,
    fruit_label TEXT NOT NULL,
    variety TEXT NOT NULL,
    weight_kg NUMERIC NOT NULL,
    harvest_date DATE NOT NULL,
    location TEXT NOT NULL,
    farm_name TEXT NOT NULL,
    grade TEXT NOT NULL,
    status TEXT NOT NULL,
    seed_type TEXT NOT NULL,
    ripeness NUMERIC NOT NULL,
    harvest_weather TEXT NOT NULL,
    estimated_value NUMERIC NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Quality Metrics Table (One-to-One with Batch)
CREATE TABLE public.quality_metrics (
    batch_id TEXT PRIMARY KEY REFERENCES public.batches(id) ON DELETE CASCADE,
    freshness NUMERIC NOT NULL,
    color NUMERIC NOT NULL,
    firmness NUMERIC NOT NULL,
    aroma NUMERIC NOT NULL,
    overall_score NUMERIC NOT NULL,
    botrytis_detected BOOLEAN DEFAULT false,
    defect_count INTEGER DEFAULT 0
);

-- 3. Treatments Table (One-to-Many with Batch)
CREATE TABLE public.treatments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id TEXT NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    label TEXT NOT NULL,
    description TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    temperature NUMERIC,
    humidity NUMERIC,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- Row Level Security (RLS) Policies
-- (Set to public access for demo purposes)
-- ==========================================

ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatments ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read/write for demo
CREATE POLICY "Enable read access for all users" ON public.batches FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.batches FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.batches FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON public.batches FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON public.quality_metrics FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.quality_metrics FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.quality_metrics FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON public.quality_metrics FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON public.treatments FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.treatments FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.treatments FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON public.treatments FOR DELETE USING (true);
