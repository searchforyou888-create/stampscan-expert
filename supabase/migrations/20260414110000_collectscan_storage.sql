-- Bucket Storage pour les images scannees
-- Necessaire pour hooks/useAIAnalysis.ts qui uploade dans le bucket "collectscan"

INSERT INTO storage.buckets (id, name, public)
VALUES ('collectscan', 'collectscan', true)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Collectscan public read'
  ) THEN
    CREATE POLICY "Collectscan public read"
      ON storage.objects FOR SELECT
      TO public
      USING (bucket_id = 'collectscan');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Collectscan public insert'
  ) THEN
    CREATE POLICY "Collectscan public insert"
      ON storage.objects FOR INSERT
      TO public
      WITH CHECK (bucket_id = 'collectscan');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Collectscan public update'
  ) THEN
    CREATE POLICY "Collectscan public update"
      ON storage.objects FOR UPDATE
      TO public
      USING (bucket_id = 'collectscan')
      WITH CHECK (bucket_id = 'collectscan');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Collectscan public delete'
  ) THEN
    CREATE POLICY "Collectscan public delete"
      ON storage.objects FOR DELETE
      TO public
      USING (bucket_id = 'collectscan');
  END IF;
END $$;