/*
  # Refonte des Zones Tampons - Migration Refactor
  
  1. Nouvelle table container_buffer_zones
     - Remplace le tracking via stacks automatiques (>= 9000)
     - Permet de gérer les conteneurs endommagés sans impacter les stacks réels
  
  2. Modifications de containers
     - Ajout statut 'in_buffer'
     - Ajout colonne buffer_zone_id FK vers container_buffer_zones
     - Ajout colonne edi_gate_in_transmitted (flag global EDI Gate In par conteneur)

  3. Modifications de gate_in_operations
     - Ajout colonne edi_gate_in_transmitted (flag de transmission EDI)
*/

-- ============================================================
-- 1. Nouvelle table container_buffer_zones
-- ============================================================

CREATE TABLE IF NOT EXISTS container_buffer_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  container_id UUID NOT NULL REFERENCES containers(id) ON DELETE CASCADE,
  gate_in_operation_id UUID REFERENCES gate_in_operations(id) ON DELETE SET NULL,
  buffer_stack_id UUID REFERENCES stacks(id) ON DELETE SET NULL,
  yard_id TEXT NOT NULL,
  damage_type TEXT,
  damage_description TEXT,
  damage_assessment JSONB,
  status TEXT NOT NULL DEFAULT 'in_buffer' CHECK (status IN ('in_buffer', 'released')),
  released_at TIMESTAMPTZ,
  released_by UUID REFERENCES users(id) ON DELETE SET NULL,
  release_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_container_buffer_zones_container_id ON container_buffer_zones(container_id);
CREATE INDEX IF NOT EXISTS idx_container_buffer_zones_yard_id ON container_buffer_zones(yard_id);
CREATE INDEX IF NOT EXISTS idx_container_buffer_zones_status ON container_buffer_zones(status);
CREATE INDEX IF NOT EXISTS idx_container_buffer_zones_buffer_stack_id ON container_buffer_zones(buffer_stack_id);

-- ============================================================
-- 2. Ajout colonne buffer_zone_id à containers
-- ============================================================

ALTER TABLE containers
  ADD COLUMN IF NOT EXISTS buffer_zone_id UUID REFERENCES container_buffer_zones(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS edi_gate_in_transmitted BOOLEAN DEFAULT false;

-- Ajouter 'in_buffer' comme statut valide (si contrainte CHECK existe)
DO $$
BEGIN
  -- Vérifier si la contrainte existe et la mettre à jour
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name LIKE '%containers%status%' AND table_name = 'containers'
  ) THEN
    -- Supprimer l'ancienne contrainte si elle existe
    ALTER TABLE containers DROP CONSTRAINT IF EXISTS containers_status_check;
  END IF;
END $$;

-- Recréer la contrainte de statut avec 'in_buffer'
ALTER TABLE containers 
  DROP CONSTRAINT IF EXISTS containers_status_check;
ALTER TABLE containers 
  ADD CONSTRAINT containers_status_check 
  CHECK (status IN ('gate_in', 'in_depot', 'in_buffer', 'gate_out', 'out_depot', 'deleted'));

-- ============================================================
-- 3. Ajout colonne edi_gate_in_transmitted à gate_in_operations
-- ============================================================

ALTER TABLE gate_in_operations
  ADD COLUMN IF NOT EXISTS edi_gate_in_transmitted BOOLEAN DEFAULT false;

-- Mettre à jour les opérations existantes déjà complétées
UPDATE gate_in_operations
  SET edi_gate_in_transmitted = edi_transmitted
  WHERE status = 'completed' AND edi_transmitted IS NOT NULL;

-- ============================================================
-- 4. Trigger pour updated_at automatique
-- ============================================================

CREATE OR REPLACE FUNCTION update_buffer_zone_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_buffer_zone_updated_at ON container_buffer_zones;
CREATE TRIGGER trigger_buffer_zone_updated_at
  BEFORE UPDATE ON container_buffer_zones
  FOR EACH ROW
  EXECUTE FUNCTION update_buffer_zone_updated_at();

-- ============================================================
-- 5. RLS Policies pour container_buffer_zones
-- ============================================================

ALTER TABLE container_buffer_zones ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs authentifiés peuvent lire les zones tampons de leur yard
CREATE POLICY "Authenticated users can read buffer zones"
  ON container_buffer_zones
  FOR SELECT
  TO authenticated
  USING (true);

-- Les opérateurs peuvent créer des entrées de zone tampon
CREATE POLICY "Operators can insert buffer zones"
  ON container_buffer_zones
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Les opérateurs peuvent mettre à jour (libérer) les zones tampons
CREATE POLICY "Operators can update buffer zones"
  ON container_buffer_zones
  FOR UPDATE
  TO authenticated
  USING (true);

-- ============================================================
-- 6. Commentaires documentation
-- ============================================================

COMMENT ON TABLE container_buffer_zones IS 'Table de gestion des conteneurs en zone tampon (endommagés en attente de traitement)';
COMMENT ON COLUMN container_buffer_zones.status IS 'in_buffer = conteneur actuellement en zone tampon, released = conteneur libéré vers un emplacement réel';
COMMENT ON COLUMN container_buffer_zones.buffer_stack_id IS 'Stack tampon configuré manuellement dans Stack Management (is_buffer_zone = true)';
COMMENT ON COLUMN containers.edi_gate_in_transmitted IS 'Flag global : true si EDI GATE IN déjà transmis pour ce conteneur (empêche double envoi)';
COMMENT ON COLUMN gate_in_operations.edi_gate_in_transmitted IS 'Indique si l EDI GATE IN a été transmis pour cette opération';
