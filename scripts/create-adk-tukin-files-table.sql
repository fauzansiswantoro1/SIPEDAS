-- Create table for storing ADK Tukin files
CREATE TABLE IF NOT EXISTS adk_tukin_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_type TEXT NOT NULL, -- CPNS Mandiri, CPNS BSI, CPNS BNI, PNS, PPPK
  period_month TEXT NOT NULL,
  period_year TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_data JSONB NOT NULL, -- Store the Excel data as JSON
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_adk_tukin_files_period ON adk_tukin_files(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_adk_tukin_files_employee_type ON adk_tukin_files(employee_type);
CREATE INDEX IF NOT EXISTS idx_adk_tukin_files_created_by ON adk_tukin_files(created_by);

-- Enable RLS
ALTER TABLE adk_tukin_files ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to read all records
CREATE POLICY "Allow authenticated users to read adk_tukin_files"
  ON adk_tukin_files
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policy to allow authenticated users to insert their own records
CREATE POLICY "Allow authenticated users to insert adk_tukin_files"
  ON adk_tukin_files
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Create policy to allow users to update their own records
CREATE POLICY "Allow users to update their own adk_tukin_files"
  ON adk_tukin_files
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Create policy to allow users to delete their own records
CREATE POLICY "Allow users to delete their own adk_tukin_files"
  ON adk_tukin_files
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);
