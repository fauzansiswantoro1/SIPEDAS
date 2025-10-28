-- Create table for storing ADK file archives
CREATE TABLE IF NOT EXISTS public.adk_archives (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    file_name TEXT NOT NULL,
    file_content TEXT NOT NULL,
    employee_type TEXT NOT NULL CHECK (employee_type IN ('CPNS', 'PNS', 'PPPK')),
    period_month TEXT NOT NULL,
    period_year TEXT NOT NULL,
    calculation_results JSONB,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_adk_archives_period ON public.adk_archives(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_adk_archives_type ON public.adk_archives(employee_type);
CREATE INDEX IF NOT EXISTS idx_adk_archives_created_by ON public.adk_archives(created_by);

-- Enable Row Level Security
ALTER TABLE public.adk_archives ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Authenticated users can view all archives"
    ON public.adk_archives
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert archives"
    ON public.adk_archives
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own archives"
    ON public.adk_archives
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = created_by)
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete their own archives"
    ON public.adk_archives
    FOR DELETE
    TO authenticated
    USING (auth.uid() = created_by);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_adk_archives_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_adk_archives_updated_at
    BEFORE UPDATE ON public.adk_archives
    FOR EACH ROW
    EXECUTE FUNCTION update_adk_archives_updated_at();
