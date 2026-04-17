-- Renforce le bucket collectscan en mode prive
-- Les images sont lues via URLs signees generees cote client authentifie

UPDATE storage.buckets
SET public = false
WHERE id = 'collectscan';

DROP POLICY IF EXISTS "Collectscan public read" ON storage.objects;
DROP POLICY IF EXISTS "Collectscan public insert" ON storage.objects;
DROP POLICY IF EXISTS "Collectscan public update" ON storage.objects;
DROP POLICY IF EXISTS "Collectscan public delete" ON storage.objects;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Collectscan authenticated read'
  ) THEN
    CREATE POLICY "Collectscan authenticated read"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (bucket_id = 'collectscan');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Collectscan authenticated insert'
  ) THEN
    CREATE POLICY "Collectscan authenticated insert"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'collectscan');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Collectscan authenticated update'
  ) THEN
    CREATE POLICY "Collectscan authenticated update"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (bucket_id = 'collectscan')
      WITH CHECK (bucket_id = 'collectscan');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Collectscan authenticated delete'
  ) THEN
    CREATE POLICY "Collectscan authenticated delete"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = 'collectscan');
  END IF;
END $$;