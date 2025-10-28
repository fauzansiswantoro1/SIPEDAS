-- Create table for storing generated ADK Tukin archives
CREATE TABLE IF NOT EXISTS adk_tukin_archives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_type TEXT NOT NULL,
  period_month TEXT NOT NULL,
  period_year TEXT NOT NULL,
  file_data JSONB NOT NULL,
  file_name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_adk_tukin_archives_period ON adk_tukin_archives(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_adk_tukin_archives_employee_type ON adk_tukin_archives(employee_type);
CREATE INDEX IF NOT EXISTS idx_adk_tukin_archives_created_by ON adk_tukin_archives(created_by);

-- Enable RLS
ALTER TABLE adk_tukin_archives ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view all ADK Tukin archives"
  ON adk_tukin_archives FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own ADK Tukin archives"
  ON adk_tukin_archives FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete their own ADK Tukin archives"
  ON adk_tukin_archives FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);
