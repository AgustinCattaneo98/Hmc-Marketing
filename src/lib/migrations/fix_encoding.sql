-- ============================================================
-- HMC Marketing — Fix de encoding (mojibake UTF-8) en ciudad
-- Corrige valores guardados con doble codificación (ej. "CÃ³rdoba").
-- Ejecutar una sola vez en el SQL Editor de Supabase.
-- ============================================================

UPDATE empresas
SET ciudad = replace(ciudad, 'CÃ³rdoba', 'Córdoba')
WHERE ciudad LIKE '%CÃ³rdoba%';

UPDATE empresas
SET ciudad = replace(ciudad, 'CÃ¡', 'Cá')
WHERE ciudad LIKE '%CÃ¡%';

UPDATE empresas
SET ciudad = replace(ciudad, 'Ã³', 'ó')
WHERE ciudad LIKE '%Ã³%';

UPDATE empresas
SET ciudad = replace(ciudad, 'Ã©', 'é')
WHERE ciudad LIKE '%Ã©%';

UPDATE empresas
SET ciudad = replace(ciudad, 'Ã¡', 'á')
WHERE ciudad LIKE '%Ã¡%';

UPDATE empresas
SET ciudad = replace(ciudad, 'Ã­', 'í')
WHERE ciudad LIKE '%Ã­%';

UPDATE empresas
SET ciudad = replace(ciudad, 'Ã±', 'ñ')
WHERE ciudad LIKE '%Ã±%';
