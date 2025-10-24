-- Migration: Rename release_orders table to booking_references

-- Step 1: Rename the table
ALTER TABLE release_orders RENAME TO booking_references;

-- Step 2: Update foreign key references in gate_out_operations
ALTER TABLE gate_out_operations RENAME COLUMN release_order_id TO booking_reference_id;

-- Step 3: Update the foreign key constraint
ALTER TABLE gate_out_operations DROP CONSTRAINT gate_out_operations_release_order_id_fkey;
ALTER TABLE gate_out_operations ADD CONSTRAINT gate_out_operations_booking_reference_id_fkey
  FOREIGN KEY (booking_reference_id) REFERENCES booking_references(id);

-- Step 4: Update indexes
ALTER INDEX idx_release_orders_client_id RENAME TO idx_booking_references_client_id;
ALTER INDEX idx_release_orders_status RENAME TO idx_booking_references_status;
ALTER INDEX idx_release_orders_booking_number RENAME TO idx_booking_references_booking_number;

-- Step 5: Update gate out operations index
ALTER INDEX idx_gate_out_release_id RENAME TO idx_gate_out_booking_reference_id;

-- Step 6: Update RLS policies
DROP POLICY "Users can view release orders" ON booking_references;
DROP POLICY "Operators can manage release orders" ON booking_references;

CREATE POLICY "Users can view booking references"
  ON booking_references FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Operators can manage booking references"
  ON booking_references FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.role IN ('admin', 'supervisor', 'operator')
      AND users.active = true
    )
  );
