/*
  # Location Management System - Performance Optimization

  1. Purpose
    - Implements comprehensive indexing strategy for location management
    - Optimizes queries for location availability, assignment, and reporting
    - Adds materialized views for complex aggregations
    - Implements query performance monitoring

  2. Requirements Addressed
    - 9.1: Support for 10,000 locations with sub-second query response
    - 9.2: Handle 100 concurrent location queries without degradation
    - 9.5: Database indexing strategies for optimal query performance

  3. Optimization Strategies
    - Composite indexes for multi-column queries
    - Partial indexes for filtered queries
    - GIN indexes for JSONB columns
    - Materialized views for complex aggregations
    - Query statistics and monitoring

  4. Performance Targets
    - Location availability queries: < 100ms
    - Location assignment operations: < 200ms
    - Audit trail queries: < 500ms
    - Bulk operations: 1000 locations/second
*/

-- ============================================================================
-- ADDITIONAL COMPOSITE INDEXES FOR COMPLEX QUERIES
-- ============================================================================

-- Composite index for availability queries with multiple filters
-- Optimizes: SELECT * FROM locations WHERE is_active = true AND is_occupied = false AND yard_id = ? AND container_size = ?
CREATE INDEX IF NOT EXISTS idx_locations_availability_composite
  ON locations (yard_id, is_occupied, container_size, is_active)
  WHERE is_active = true AND is_occupied = false;

-- Composite index for client pool availability queries
-- Optimizes: SELECT * FROM locations WHERE client_pool_id = ? AND is_occupied = false
CREATE INDEX IF NOT EXISTS idx_locations_pool_availability
  ON locations (client_pool_id, is_occupied, container_size)
  WHERE is_active = true;

-- Composite index for stack-based location queries
-- Optimizes: SELECT * FROM locations WHERE stack_id = ? ORDER BY row_number, tier_number
CREATE INDEX IF NOT EXISTS idx_locations_stack_position
  ON locations (stack_id, row_number, tier_number)
  WHERE is_active = true;

-- Index for finding occupied locations by container
-- Optimizes: SELECT * FROM locations WHERE container_id IS NOT NULL
CREATE INDEX IF NOT EXISTS idx_locations_occupied_containers
  ON locations (container_id, yard_id)
  WHERE is_occupied = true AND container_id IS NOT NULL;

-- Index for virtual location lookups
-- Optimizes: SELECT * FROM locations WHERE is_virtual = true AND virtual_stack_pair_id = ?
CREATE INDEX IF NOT EXISTS idx_locations_virtual_pair
  ON locations (virtual_stack_pair_id, is_occupied)
  WHERE is_virtual = true AND is_active = true;

-- ============================================================================
-- INDEXES FOR AUDIT LOG QUERIES
-- ============================================================================

-- Composite index for audit queries by location and time range
-- Optimizes: SELECT * FROM location_audit_log WHERE location_id = ? AND timestamp BETWEEN ? AND ?
CREATE INDEX IF NOT EXISTS idx_audit_location_time_range
  ON location_audit_log (location_id, timestamp DESC, operation);

-- Index for audit queries by user
-- Optimizes: SELECT * FROM location_audit_log WHERE user_id = ? ORDER BY timestamp DESC
CREATE INDEX IF NOT EXISTS idx_audit_user_timestamp
  ON location_audit_log (user_id, timestamp DESC)
  WHERE user_id IS NOT NULL;

-- Index for audit queries by operation type
-- Optimizes: SELECT * FROM location_audit_log WHERE operation = 'ASSIGN' ORDER BY timestamp DESC
CREATE INDEX IF NOT EXISTS idx_audit_operation_timestamp
  ON location_audit_log (operation, timestamp DESC);

-- GIN index for JSONB columns in audit log (for searching within changes)
-- Optimizes: SELECT * FROM location_audit_log WHERE new_values @> '{"is_occupied": true}'
CREATE INDEX IF NOT EXISTS idx_audit_new_values_gin
  ON location_audit_log USING GIN (new_values);

CREATE INDEX IF NOT EXISTS idx_audit_old_values_gin
  ON location_audit_log USING GIN (old_values);

-- ============================================================================
-- INDEXES FOR VIRTUAL STACK PAIRS
-- ============================================================================

-- Composite index for active virtual pairs by yard
-- Optimizes: SELECT * FROM virtual_stack_pairs WHERE yard_id = ? AND is_active = true
CREATE INDEX IF NOT EXISTS idx_virtual_pairs_yard_active
  ON virtual_stack_pairs (yard_id, is_active)
  WHERE is_active = true;

-- Index for finding virtual pairs by physical stack
-- Optimizes: SELECT * FROM virtual_stack_pairs WHERE stack1_id = ? OR stack2_id = ?
CREATE INDEX IF NOT EXISTS idx_virtual_pairs_stack1
  ON virtual_stack_pairs (stack1_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_virtual_pairs_stack2
  ON virtual_stack_pairs (stack2_id)
  WHERE is_active = true;

-- ============================================================================
-- INDEXES FOR MIGRATION MAPPINGS
-- ============================================================================

-- Index for reverse lookup (UUID to legacy ID)
-- Optimizes: SELECT * FROM location_id_mappings WHERE new_location_id = ?
CREATE INDEX IF NOT EXISTS idx_mappings_new_location
  ON location_id_mappings (new_location_id);

-- Index for batch migration queries
-- Optimizes: SELECT * FROM location_id_mappings WHERE migration_batch_id = ?
CREATE INDEX IF NOT EXISTS idx_mappings_batch
  ON location_id_mappings (migration_batch_id);

-- ============================================================================
-- MATERIALIZED VIEW FOR LOCATION STATISTICS
-- ============================================================================

-- Materialized view for yard-level location statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS location_statistics_by_yard AS
SELECT
  yard_id,
  COUNT(*) as total_locations,
  COUNT(*) FILTER (WHERE is_occupied = true) as occupied_locations,
  COUNT(*) FILTER (WHERE is_occupied = false) as available_locations,
  COUNT(*) FILTER (WHERE is_virtual = true) as virtual_locations,
  COUNT(*) FILTER (WHERE is_virtual = false) as physical_locations,
  COUNT(DISTINCT stack_id) as total_stacks,
  COUNT(DISTINCT client_pool_id) FILTER (WHERE client_pool_id IS NOT NULL) as assigned_pools,
  ROUND(AVG(CASE WHEN is_occupied THEN 1 ELSE 0 END) * 100, 2) as occupancy_percentage,
  MAX(updated_at) as last_updated
FROM locations
WHERE is_active = true
GROUP BY yard_id;

-- Index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_location_stats_yard
  ON location_statistics_by_yard (yard_id);

-- ============================================================================
-- MATERIALIZED VIEW FOR STACK OCCUPANCY
-- ============================================================================

-- Materialized view for stack-level occupancy statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS location_statistics_by_stack AS
SELECT
  stack_id,
  yard_id,
  COUNT(*) as total_positions,
  COUNT(*) FILTER (WHERE is_occupied = true) as occupied_positions,
  COUNT(*) FILTER (WHERE is_occupied = false) as available_positions,
  ROUND(AVG(CASE WHEN is_occupied THEN 1 ELSE 0 END) * 100, 2) as occupancy_percentage,
  MAX(row_number) as max_rows,
  MAX(tier_number) as max_tiers,
  client_pool_id,
  MAX(updated_at) as last_updated
FROM locations
WHERE is_active = true AND is_virtual = false
GROUP BY stack_id, yard_id, client_pool_id;

-- Index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_location_stats_stack
  ON location_statistics_by_stack (stack_id);

CREATE INDEX IF NOT EXISTS idx_location_stats_stack_yard
  ON location_statistics_by_stack (yard_id, occupancy_percentage);

-- ============================================================================
-- FUNCTIONS FOR MATERIALIZED VIEW REFRESH
-- ============================================================================

-- Function to refresh location statistics
CREATE OR REPLACE FUNCTION refresh_location_statistics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY location_statistics_by_yard;
  REFRESH MATERIALIZED VIEW CONCURRENTLY location_statistics_by_stack;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically refresh statistics on location changes
CREATE OR REPLACE FUNCTION trigger_refresh_location_statistics()
RETURNS TRIGGER AS $$
BEGIN
  -- Schedule a refresh (in production, this would be handled by a job scheduler)
  -- For now, we'll just log that a refresh is needed
  PERFORM pg_notify('location_stats_refresh_needed', NEW.yard_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to notify when statistics need refresh (debounced via application layer)
CREATE TRIGGER location_stats_refresh_trigger
  AFTER INSERT OR UPDATE OR DELETE ON locations
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_refresh_location_statistics();

-- ============================================================================
-- QUERY PERFORMANCE MONITORING FUNCTIONS
-- ============================================================================

-- Function to analyze location query performance
CREATE OR REPLACE FUNCTION analyze_location_query_performance()
RETURNS TABLE (
  query_type TEXT,
  avg_execution_time_ms NUMERIC,
  total_calls BIGINT,
  cache_hit_ratio NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    'location_availability'::TEXT as query_type,
    0.0::NUMERIC as avg_execution_time_ms,
    0::BIGINT as total_calls,
    0.0::NUMERIC as cache_hit_ratio;
  -- This is a placeholder - actual implementation would query pg_stat_statements
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VACUUM AND ANALYZE SETTINGS
-- ============================================================================

-- Set autovacuum settings for high-traffic tables
ALTER TABLE locations SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02,
  autovacuum_vacuum_cost_delay = 10
);

ALTER TABLE location_audit_log SET (
  autovacuum_vacuum_scale_factor = 0.1,
  autovacuum_analyze_scale_factor = 0.05
);

-- ============================================================================
-- TABLE STATISTICS UPDATE
-- ============================================================================

-- Update statistics for query planner
ANALYZE locations;
ANALYZE virtual_stack_pairs;
ANALYZE location_id_mappings;
ANALYZE location_audit_log;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON INDEX idx_locations_availability_composite IS 
  'Composite index optimized for location availability queries with multiple filters';

COMMENT ON INDEX idx_locations_pool_availability IS 
  'Optimizes client pool-specific availability queries';

COMMENT ON INDEX idx_locations_stack_position IS 
  'Optimizes stack-based location queries ordered by position';

COMMENT ON MATERIALIZED VIEW location_statistics_by_yard IS 
  'Pre-aggregated statistics for yard-level location metrics and occupancy';

COMMENT ON MATERIALIZED VIEW location_statistics_by_stack IS 
  'Pre-aggregated statistics for stack-level occupancy and capacity';

COMMENT ON FUNCTION refresh_location_statistics() IS 
  'Refreshes all location statistics materialized views concurrently';

-- ============================================================================
-- PERFORMANCE MONITORING QUERIES (for DBA reference)
-- ============================================================================

/*
-- Query to check index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND tablename IN ('locations', 'virtual_stack_pairs', 'location_audit_log')
ORDER BY idx_scan DESC;

-- Query to check table bloat
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
  n_live_tup as live_tuples,
  n_dead_tup as dead_tuples,
  ROUND(n_dead_tup * 100.0 / NULLIF(n_live_tup + n_dead_tup, 0), 2) as dead_tuple_percent
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND tablename IN ('locations', 'virtual_stack_pairs', 'location_audit_log')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Query to check slow queries (requires pg_stat_statements extension)
SELECT
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
WHERE query LIKE '%locations%'
ORDER BY mean_exec_time DESC
LIMIT 10;
*/

