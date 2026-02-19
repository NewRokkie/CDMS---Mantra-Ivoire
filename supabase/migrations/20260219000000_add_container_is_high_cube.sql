-- Add is_high_cube to containers so Gate In "High Cube" choice is persisted.
-- Display can show "Dry - 40ft - HC (45G1)" using type + size + is_high_cube.
ALTER TABLE public.containers
  ADD COLUMN IF NOT EXISTS is_high_cube boolean DEFAULT false;

COMMENT ON COLUMN public.containers.is_high_cube IS 'True when container is high cube (e.g. Dry 40ft HC = 45G1). Set from Gate In form.';
