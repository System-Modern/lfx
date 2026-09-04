# Planbur App

Project ini siap diupload ke GitHub tanpa menaruh data Supabase asli di repository.

## Langkah deploy

1. Isi nilai asli di file `index.html` atau di environment deployment Anda.
2. Ganti placeholder berikut:
   - `__SUPABASE_URL__`
   - `__SUPABASE_ANON_KEY__`
3. Pastikan Supabase project Anda sudah aktif dan tabel sesuai.
4. Jika deploy dilakukan dengan GitHub Actions, simpan nilai asli di repository secrets.

## Catatan keamanan

- `anon key` tidak bisa disembunyikan sepenuhnya dari browser jika frontend memakai Supabase langsung.
- Untuk keamanan penuh, gunakan backend/proxy untuk semua request.
- Jangan pernah commit `service_role` key ke repository.
