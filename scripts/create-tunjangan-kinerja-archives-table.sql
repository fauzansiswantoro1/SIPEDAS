-- Create tunjangan_kinerja_archives table
CREATE TABLE IF NOT EXISTS tunjangan_kinerja_archives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_month TEXT NOT NULL,
  period_year TEXT NOT NULL,
  period_start_date DATE NOT NULL,
  period_end_date DATE NOT NULL,
  calculation_results JSONB NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_tunjangan_kinerja_archives_period ON tunjangan_kinerja_archives(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_tunjangan_kinerja_archives_created_by ON tunjangan_kinerja_archives(created_by);

-- Enable Row Level Security
ALTER TABLE tunjangan_kinerja_archives ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view all tunjangan kinerja archives"
  ON tunjangan_kinerja_archives FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own tunjangan kinerja archives"
  ON tunjangan_kinerja_archives FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete their own tunjangan kinerja archives"
  ON tunjangan_kinerja_archives FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_tunjangan_kinerja_archives_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tunjangan_kinerja_archives_updated_at
  BEFORE UPDATE ON tunjangan_kinerja_archives
  FOR EACH ROW
  EXECUTE FUNCTION update_tunjangan_kinerja_archives_updated_at();
