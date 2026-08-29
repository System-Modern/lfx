-- =====================================================
-- SQL UNTUK SUPABASE - PLANNING LEMBUR
-- Jalankan di SQL Editor Supabase
-- =====================================================

-- 1. Tambahkan kolom preview_url ke tabel planning_lembur
ALTER TABLE planning_lembur 
ADD COLUMN IF NOT EXISTS preview_url TEXT DEFAULT NULL;

-- 2. Preview planning menggunakan bucket planning-bukti yang sudah ada.
-- File disimpan di: <kode_planning>/preview/<timestamp>-SPL_<kode>.png
-- Pastikan bucket planning-bukti bersifat public dan policy upload-nya aktif.

UPDATE storage.buckets
SET public = true
WHERE id = 'planning-bukti';

-- 3. Tidak perlu bucket atau policy baru untuk preview.
-- Preview memakai policy INSERT/SELECT milik planning-bukti yang juga
-- dipakai oleh fitur upload bukti.

-- 4. Index untuk performa (opsional)
CREATE INDEX IF NOT EXISTS idx_planning_preview_url 
ON planning_lembur(preview_url) 
WHERE preview_url IS NOT NULL;

-- 5. Verifikasi struktur tabel
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'planning_lembur'
ORDER BY ordinal_position;
