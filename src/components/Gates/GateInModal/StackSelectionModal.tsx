import React, { useState, useEffect, useMemo } from "react";
import { Search, MapPin, AlertCircle, CheckCircle, ArrowLeft, ArrowRight } from "lucide-react";
import { YardStack } from "../../../types/yard";

import { clientPoolService } from "../../../services/api/clientPoolService";
import { yardsService } from "../../../services/api/yardsService";
import { containerService } from "../../../services/api/containerService";
import { StandardModal } from "../../Common/Modal/StandardModal";
import { handleError } from "../../../services/errorHandling";
import { t } from "i18next";

export interface StackLocation {
  id: string;
  formattedId: string; // S01R1H1 format
  stackNumber: number;
  row: number;
  height: number;
  isAvailable: boolean;
  section: string;
  containerSize: "20ft" | "40ft";
  currentOccupancy: number;
  capacity: number;
}

export interface StackSelectionModalProps {
  isVisible: boolean;
  onClose: () => void;
  onStackSelect: (stackId: string, formattedLocation: string) => void;
  containerSize: "20ft" | "40ft";
  containerQuantity: 1 | 2;
  yardId: string;
  selectedStackId?: string;
  clientCode?: string; // Add client code for pool filtering
  clientName?: string;
}

export const StackSelectionModal: React.FC<StackSelectionModalProps> = ({
  isVisible,
  onClose,
  onStackSelect,
  containerSize,
  containerQuantity,
  yardId,
  selectedStackId,
  clientCode,
  clientName,
}) => {
  const [stacks, setStacks] = useState<StackLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [selectedHeight, setSelectedHeight] = useState<number | null>(null);
  const [hasClientPool, setHasClientPool] = useState(false);
  const [clientPoolStackCount, setClientPoolStackCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;
  const [resolvedClientName, setResolvedClientName] = useState<string>("");

  // Load client name from clientCode
  useEffect(() => {
    const loadClientName = async () => {
      if (clientCode && !clientName) {
        try {
          const { clientService } = await import('../../../services/api');
          const clients = await clientService.getAll();
          const client = clients.find(c => c.code === clientCode);
          if (client) {
            setResolvedClientName(client.name);
          }
        } catch (err) {
          handleError(err, 'StackSelectionModal.loadClientName');
          // Fallback to clientCode if loading fails
          setResolvedClientName(clientCode);
        }
      } else if (clientName) {
        setResolvedClientName(clientName);
      }
    };

    loadClientName();
  }, [clientCode, clientName]);

  // Load available stacks
  useEffect(() => {
    if (isVisible && yardId) {
      loadAvailableStacks();
    }
  }, [isVisible, yardId, containerSize, clientCode]);

  const loadAvailableStacks = async () => {
    setLoading(true);
    setError(null);

    try {
      const yard = yardsService.getYardById(yardId);
      if (!yard) {
        throw new Error("Yard not found");
      }

      // Get all containers to check occupancy
      const allContainers = await containerService.getAll();

      // Only consider containers that are actually in the depot
      const activeContainers = allContainers.filter(
        (c) => c.status === "in_depot" || c.status === "gate_in",
      );
      const yardContainers = yardsService.getYardContainers(
        yardId,
        activeContainers,
      );

      // Get available stacks based on client pool assignments
      let availableStackResults = [];
      let clientPoolStacks: string[] = [];
      let hasClientPool = false;
      let otherClientsStacks: Set<string> = new Set();

      if (clientCode) {
        // Get all client pools for this yard
        const clientPools = await clientPoolService.getAll(yardId);

        // Find this client's pool
        const clientPool = clientPools.find(
          (pool) => pool.clientCode === clientCode && pool.isActive,
        );

        if (clientPool && clientPool.assignedStacks.length > 0) {
          clientPoolStacks = clientPool.assignedStacks;
          hasClientPool = true;
        }

        // Get all stacks assigned to OTHER clients
        clientPools.forEach((pool) => {
          if (pool.clientCode !== clientCode && pool.isActive) {
            pool.assignedStacks.forEach((stackId) =>
              otherClientsStacks.add(stackId),
            );
          }
        });
      }

      // Get all stacks from the yard
      let allStacks = yard.sections.flatMap((section) => section.stacks);

      // Exclude buffer zone stacks
      allStacks = allStacks.filter((stack) => !stack.isBufferZone);

      // For 40ft containers, filter to only show virtual stacks that actually exist in the database
      if (containerSize === "40ft") {
        // Only show stacks that are marked as virtual in the database
        allStacks = allStacks.filter((stack) => stack.isVirtual === true);
      }

      // Filter stacks based on client pool assignments
      const filteredStacks = allStacks.filter((stack) => {
        // Filter by container size compatibility
        if (!isStackCompatible(stack, containerSize)) {
          return false;
        }

        // If client has a pool, only show their assigned stacks
        if (hasClientPool && clientPoolStacks.length > 0) {
          return clientPoolStacks.includes(stack.id);
        }

        // If client has no pool, hide stacks assigned to other clients
        if (clientCode) {
          return !otherClientsStacks.has(stack.id);
        }

        // No client code - show all compatible stacks
        return true;
      });

      // Calculate availability for filtered stacks
      availableStackResults = filteredStacks
        .map((stack) => {
          const stackContainers = yardContainers.filter((c: any) => {
            // Match both formats: S04R5H1 and S04-R5-H1
            const match = c.location.match(/S0*(\d+)[-]?R\d+[-]?H\d+/);
            return match && parseInt(match[1]) === stack.stackNumber;
          });
          const currentOccupancy = stackContainers.length;
          const availableSlots = stack.capacity - currentOccupancy;

          const section = yard.sections.find((s) => s.id === stack.sectionId);

          // Normalize occupied positions to standard format (S##R#H#)
          const occupiedPositions = stackContainers.map((c: any) => {
            // Normalize location format: remove dashes and ensure 2-digit stack number
            const match = c.location.match(/S0*(\d+)[-]?R(\d+)[-]?H(\d+)/);
            if (match) {
              const stackNum = parseInt(match[1]);
              const row = parseInt(match[2]);
              const height = parseInt(match[3]);
              return `S${String(stackNum).padStart(2, "0")}R${row}H${height}`;
            }
            return c.location;
          });

          return {
            stackId: stack.id,
            stackNumber: stack.stackNumber,
            sectionName: section?.name || "Unknown",
            availableSlots,
            totalCapacity: stack.capacity,
            isRecommended: availableSlots > 0,
            distance: 0,
            occupiedPositions, // Track normalized occupied positions
          };
        })
        .filter((result) => result.availableSlots > 0);

      // Update state with pool information
      setHasClientPool(hasClientPool);
      setClientPoolStackCount(clientPoolStacks.length);

      // Convert to StackLocation format
      const stackLocations = await Promise.all(
        availableStackResults.map(async (result) => {
          const stack = yard.sections
            .flatMap((section) => section.stacks)
            .find((s) => s.id === result.stackId);

          if (!stack) {
            return [];
          }

          // For 40ft containers, stacks are already filtered to virtual ones
          // Just generate positions directly
          const positions = await getAvailablePositions(stack, result);

          return positions;
        }),
      );

      // Flatten and filter the results
      const allLocations = stackLocations
        .flat()
        .filter((location) => location.isAvailable);

      setStacks(allLocations);
    } catch (err) {
      handleError(err, "StackSelectionModal.loadAvailableStacks");
      setError("Failed to load available stack locations");
    } finally {
      setLoading(false);
    }
  };

  // Helper function to check if a stack number is a valid VIRTUAL stack for 40ft
  // Virtual stacks are even numbers between paired odd stacks (e.g., 4, 8, 12, 24, 28)
  const isVirtualFortyFootStack = (stackNumber: number): boolean => {
    // Virtual stacks are always even numbers
    if (stackNumber % 2 !== 0) return false;

    // Check if this even number is between a valid pair
    const validVirtualStacks = [
      4,
      8,
      12,
      16,
      20,
      24,
      28, // Zone A
      34,
      38,
      42,
      46,
      50,
      54, // Zone B
      62,
      66,
      70,
      74,
      78,
      82, // Zone C
      86,
      90,
      94,
      98, // Zone D
    ];

    return validVirtualStacks.includes(stackNumber);
  };

  // Generate available positions for a stack
  const getAvailablePositions = async (
    stack: YardStack,
    result: any,
  ): Promise<StackLocation[]> => {
    const positions: StackLocation[] = [];

    // Check if stack has custom row-tier configuration
    const hasCustomConfig =
      stack.rowTierConfig && stack.rowTierConfig.length > 0;

    // Get list of occupied positions for this stack
    const occupiedPositions = new Set(result.occupiedPositions || []);

    // For each row and height combination, create a position if available
    for (let row = 1; row <= stack.rows; row++) {
      // Get max tiers for this specific row
      let maxTiersForRow = stack.maxTiers;

      if (hasCustomConfig) {
        const rowConfig = stack.rowTierConfig!.find(
          (config) => config.row === row,
        );
        if (rowConfig) {
          maxTiersForRow = rowConfig.maxTiers;
        }
      }

      // Generate positions up to the max tiers for this row
      for (let height = 1; height <= maxTiersForRow; height++) {
        const formattedId = formatStackLocation(stack.stackNumber, row, height);

        // Check if this specific position is occupied
        const isOccupied = occupiedPositions.has(formattedId);
        const isAvailable = !isOccupied;

        positions.push({
          id: `${stack.id}-R${row}H${height}`,
          formattedId,
          stackNumber: stack.stackNumber,
          row,
          height,
          isAvailable,
          section: stack.sectionName || "Main",
          containerSize: stack.containerSize === "20ft" ? "20ft" : "40ft",
          currentOccupancy: result.totalCapacity - result.availableSlots,
          capacity: result.totalCapacity,
        });
      }
    }

    return positions;
  };

  // Format stack location as S##R#H# pattern
  const formatStackLocation = (
    stackNumber: number,
    row: number,
    height: number,
  ): string => {
    return `S${String(stackNumber).padStart(2, "0")}R${row}H${height}`;
  };

  // Check if stack is compatible with container requirements
  const isStackCompatible = (
    stack: YardStack,
    reqSize: "20ft" | "40ft",
  ): boolean => {
    // For 20ft containers, any non-virtual stack can accommodate
    if (reqSize === "20ft") {
      return !stack.isVirtual; // 20ft containers should not use virtual stacks
    }

    // For 40ft containers, ONLY virtual stacks (already filtered above)
    if (reqSize === "40ft") {
      return stack.isVirtual === true;
    }

    return true;
  };

  // Validate stack format (S##R#H# or S###R#H# pattern)
  const validateStackFormat = (formattedId: string): boolean => {
    const stackPattern = /^S\d{2,3}R\d+H\d+$/;
    return stackPattern.test(formattedId);
  };

  // Filter stacks based on search and filters
  const filteredStacks = useMemo(() => {
    let filtered = stacks.filter((stack) => stack.isAvailable);

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (stack) =>
          stack.formattedId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          stack.section.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    // Row filter
    if (selectedRow !== null) {
      filtered = filtered.filter((stack) => stack.row === selectedRow);
    }

    // Height filter
    if (selectedHeight !== null) {
      filtered = filtered.filter((stack) => stack.height === selectedHeight);
    }

    return filtered.sort((a, b) => {
      // Sort by stack number, then row, then height
      if (a.stackNumber !== b.stackNumber) {
        return a.stackNumber - b.stackNumber;
      }
      if (a.row !== b.row) {
        return a.row - b.row;
      }
      return a.height - b.height;
    });
  }, [stacks, searchTerm, selectedRow, selectedHeight]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedRow, selectedHeight]);

  // Pagination logic
  const totalPages = Math.ceil(filteredStacks.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedStacks = filteredStacks.slice(startIndex, endIndex);

  // Get unique values for filters
  const availableRows = useMemo(() => {
    return [...new Set(stacks.map((s) => s.row))].sort((a, b) => a - b);
  }, [stacks]);

  const availableHeights = useMemo(() => {
    return [...new Set(stacks.map((s) => s.height))].sort((a, b) => a - b);
  }, [stacks]);

  const getSubtitleText = (): string => {
    if (!clientCode) {
      return " (Unassigned stacks)";
    }

    const displayName = resolvedClientName || clientCode; // Use resolved name or fallback to code

    if (hasClientPool && clientPoolStackCount > 0) {
      return ` (Client: ${displayName} - Pool assigned stacks)`;
    } else {
      return ` (Client: ${displayName})`;
    }
  };

  const handleStackSelect = (stack: StackLocation) => {
    if (!validateStackFormat(stack.formattedId)) {
      setError("Invalid stack format");
      return;
    }

    // Additional validation for 40ft containers
    if (containerSize === "40ft") {
      // Extract stack number from formatted ID (e.g., "S24R1H1" -> 24)
      const stackNumberMatch = stack.formattedId.match(/^S(\d+)/);
      if (stackNumberMatch) {
        const stackNum = parseInt(stackNumberMatch[1]);

        // 40ft containers MUST be placed on virtual (even) stacks only
        if (!isVirtualFortyFootStack(stackNum)) {
          setError(
            `Invalid stack for 40ft container. Stack ${stackNum} is not a valid virtual stack. 40ft containers can only be placed on virtual stacks like S04, S08, S12, S24, S28, etc.`,
          );
          return;
        }
      }
    }

    onStackSelect(stack.id, stack.formattedId);
    onClose();
  };

  return (
    <StandardModal
      isOpen={isVisible}
      onClose={onClose}
      title={t("Select Stack Location")}
      subtitle={`${containerSize} - ${containerQuantity === 2 ? "s (double)" : ""}${getSubtitleText()}`}
      icon={MapPin}
      size="xl"
      maxHeight="95vh"
      isNested={true}
    >
      {/* Search and Filters - Sticky header */}
      <div className="px-6 py-3 border-b border-gray-200 bg-white backdrop-blur-sm -mx-8 -mt-4 mb-4 sticky top-[-1rem] z-10 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by stack ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              />
            </div>
          </div>

          {/* Row Filter */}
          <div className="sm:w-32">
            <select
              value={selectedRow || ""}
              onChange={(e) =>
                setSelectedRow(e.target.value ? parseInt(e.target.value) : null)
              }
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="">All Rows</option>
              {availableRows.map((row) => (
                <option key={row} value={row}>
                  R{row}
                </option>
              ))}
            </select>
          </div>

          {/* Height Filter */}
          <div className="sm:w-32">
            <select
              value={selectedHeight || ""}
              onChange={(e) =>
                setSelectedHeight(
                  e.target.value ? parseInt(e.target.value) : null,
                )
              }
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="">All Heights</option>
              {availableHeights.map((height) => (
                <option key={height} value={height}>
                  H{height}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {loading && (
          <div className="flex items-center justify-center p-8">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-gray-600">Loading available stacks...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
            <AlertCircle className="h-5 w-5 text-red-600 mr-3 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-red-800">Error</h4>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Results Summary - Visible below sticky header */}
            <div className="mb-4 space-y-1 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-sm font-medium text-gray-700">
                <b>{filteredStacks.length}</b> available positions
                {searchTerm && ` matching "${searchTerm}"`}
                {filteredStacks.length > ITEMS_PER_PAGE && (
                  <span className="text-gray-500 ml-2">
                    (Page {currentPage} of {totalPages})
                  </span>
                )}
              </div>
              {clientCode && (
                <div className="text-xs text-blue-600">
                  {hasClientPool && clientPoolStackCount > 0
                    ? `📋 ${resolvedClientName || clientCode} pool (${clientPoolStackCount} stacks)`
                    : `🔓 ${resolvedClientName || clientCode} - unassigned stacks`}
                </div>
              )}
            </div>

            {/* Stack Grid - 4 per row, larger cards */}
            {filteredStacks.length > 0 ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {paginatedStacks.map((stack) => {
                  const isSelected = selectedStackId === stack.id;

                  return (
                    <button
                      key={stack.id}
                      onClick={() => handleStackSelect(stack)}
                      className={`
                        relative p-5 rounded-xl border-2 transition-all duration-200
                        hover:shadow-lg hover:-translate-y-1
                        ${isSelected
                          ? "border-blue-500 bg-blue-500 text-white shadow-lg scale-105"
                          : "border-gray-300 bg-white text-gray-900 hover:border-blue-400 hover:bg-blue-50"
                        }
                      `}
                      title={`${stack.formattedId}\nSection: ${stack.section}\nSize: ${stack.containerSize}\nOccupancy: ${stack.currentOccupancy}/${stack.capacity}`}
                    >
                      {/* Selection indicator */}
                      {isSelected && (
                        <div className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-md">
                          <CheckCircle className="h-5 w-5 text-blue-500" />
                        </div>
                      )}

                      {/* Stack ID - Large and centered */}
                      <div className={`
                        font-mono text-lg font-bold text-center leading-tight
                        ${isSelected ? "text-white" : "text-gray-900"}
                      `}>
                        {stack.formattedId}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 rounded-lg border-2 border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <ArrowLeft />
                  </button>
                  
                  <div className="flex items-center gap-1">
                    {/* First page */}
                    {currentPage > 3 && (
                      <>
                        <button
                          onClick={() => setCurrentPage(1)}
                          className="w-10 h-10 rounded-lg font-medium bg-white text-gray-700 border-2 border-gray-300 hover:bg-gray-50 transition-all"
                        >
                          1
                        </button>
                        {currentPage > 4 && (
                          <span className="px-2 text-gray-500">...</span>
                        )}
                      </>
                    )}

                    {/* Pages around current */}
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(page => {
                        // Show current page and 2 pages before/after
                        return page >= currentPage - 2 && page <= currentPage + 2;
                      })
                      .map((page) => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`
                            w-10 h-10 rounded-lg font-medium transition-all
                            ${currentPage === page
                              ? 'bg-blue-500 text-white border-2 border-blue-500'
                              : 'bg-white text-gray-700 border-2 border-gray-300 hover:bg-gray-50'
                            }
                          `}
                        >
                          {page}
                        </button>
                      ))}

                    {/* Last page */}
                    {currentPage < totalPages - 2 && (
                      <>
                        {currentPage < totalPages - 3 && (
                          <span className="px-2 text-gray-500">...</span>
                        )}
                        <button
                          onClick={() => setCurrentPage(totalPages)}
                          className="w-10 h-10 rounded-lg font-medium bg-white text-gray-700 border-2 border-gray-300 hover:bg-gray-50 transition-all"
                        >
                          {totalPages}
                        </button>
                      </>
                    )}
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 rounded-lg border-2 border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <ArrowRight />
                  </button>
                </div>
              )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 dark:bg-slate-800/20 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                <MapPin className="h-10 w-10 text-slate-300 mb-3" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest">
                  {t("common.noResults")}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {t("common.noStackPositionsMatch")}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </StandardModal>
  );
};
