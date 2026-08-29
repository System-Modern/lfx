-- =====================================================
-- SQL UNTUK SUPABASE - PLANNING LEMBUR
-- Jalankan di SQL Editor Supabase
-- =====================================================

-- 1. Tambahkan kolom preview_url ke tabel planning_lembur
ALTER TABLE planning_lembur 
ADD COLUMN IF NOT EXISTS preview_url TEXT DEFAULT NULL;

-- 2. Buat storage bucket untuk preview planning (jika belum ada)
-- Jalankan di Storage > Create bucket
-- Bucket name: planning-preview
-- Public: true

-- 3. Policy untuk storage bucket planning-preview
-- Allow public read access
CREATE POLICY "Allow public read access ON planning-preview"
ON storage.objects FOR SELECT
USING (bucket_id = 'planning-preview');

-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated upload ON planning-preview"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'planning-preview');

-- Allow authenticated users to update their own files
CREATE POLICY "Allow authenticated update ON planning-preview"
ON storage.objects FOR UPDATE
USING (bucket_id = 'planning-preview');

-- Allow authenticated users to delete their own files
CREATE POLICY "Allow authenticated delete ON planning-preview"
ON storage.objects FOR DELETE
USING (bucket_id = 'planning-preview');

-- 4. Index untuk performa (opsional)
CREATE INDEX IF NOT EXISTS idx_planning_preview_url 
ON planning_lembur(preview_url) 
WHERE preview_url IS NOT NULL;

-- 5. Verifikasi struktur tabel
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'planning_lembur'
ORDER BY ordinal_position;