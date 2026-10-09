-- Destructively reset users, user-role assignments, and batches for the new batch model.
-- Institutions and other institution-owned records are preserved.
BEGIN;

DELETE FROM public.user_roles;
DELETE FROM public.users;
DELETE FROM public.batches;

ALTER TABLE public.batches
  DROP CONSTRAINT IF EXISTS batches_institution_id_name_key,
  DROP CONSTRAINT IF EXISTS batches_institution_domain_year_div_key,
  DROP COLUMN IF EXISTS name,
  DROP COLUMN IF EXISTS code,
  ADD COLUMN IF NOT EXISTS domain VARCHAR(20),
  ADD COLUMN IF NOT EXISTS year VARCHAR(20),
  ADD COLUMN IF NOT EXISTS div VARCHAR(20);

ALTER TABLE public.batches
  ALTER COLUMN domain SET NOT NULL,
  ALTER COLUMN year SET NOT NULL,
  ALTER COLUMN div SET NOT NULL;

ALTER TABLE public.batches
  ADD CONSTRAINT batches_institution_domain_year_div_key
  UNIQUE (institution_id, domain, year, div);

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_institution_id_email_key,
  DROP CONSTRAINT IF EXISTS users_institution_id_roll_number_key,
  DROP CONSTRAINT IF EXISTS users_email_key,
  DROP CONSTRAINT IF EXISTS users_batch_id_roll_number_key,
  DROP CONSTRAINT IF EXISTS users_student_requires_batch_check;

DROP INDEX IF EXISTS public.idx_users_institution;

ALTER TABLE public.users
  DROP COLUMN IF EXISTS institution_id,
  ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS roll_number VARCHAR(50);

ALTER TABLE public.users
  ADD CONSTRAINT users_email_key UNIQUE (email),
  ADD CONSTRAINT users_batch_id_roll_number_key UNIQUE (batch_id, roll_number),
  ADD CONSTRAINT users_student_requires_batch_check
    CHECK (LOWER(role) <> 'student' OR batch_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_users_batch ON public.users (batch_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (email);

COMMIT;
