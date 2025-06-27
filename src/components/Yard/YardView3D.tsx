import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Box, Plane } from '@react-three/drei';
import * as THREE from 'three';
import { Yard, YardSection, YardStack, YardPosition } from '../../types';

interface YardView3DProps {
  yard: Yard;
  selectedSection: YardSection | null;
  selectedStack: YardStack | null;
  positions: YardPosition[];
  onSectionSelect: (section: YardSection | null) => void;
  onStackSelect: (stack: YardStack | null) => void;
  clientFilter?: string | null;
}

interface SectionMeshProps {
  section: YardSection;
  isSelected: boolean;
  onClick: () => void;
  clientFilter?: string | null;
}

interface StackMeshProps {
  stack: YardStack;
  section: YardSection;
  isSelected: boolean;
  onClick: () => void;
  clientFilter?: string | null;
  yardLayout: 'tantarelli' | 'standard';
}

interface ContainerMeshProps {
  position: YardPosition;
  isClientContainer: boolean;
}

const SectionMesh: React.FC<SectionMeshProps> = ({ section, isSelected, onClick, clientFilter }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const getSectionColor = () => {
    if (isSelected) return '#3b82f6'; // blue
    if (hovered) return '#6b7280'; // gray
    return section.color || '#e5e7eb'; // section color or light gray
  };

  const totalPositions = section.stacks.reduce((sum, stack) => sum + stack.containerPositions.length, 0);
  const occupiedPositions = section.stacks.reduce((sum, stack) => 
    sum + stack.containerPositions.filter(p => 
      p.isOccupied && (!clientFilter || p.clientCode === clientFilter)
    ).length, 0
  );

  return (
    <group position={[section.position.x, section.position.z, section.position.y]}>
      {/* Section base */}
      <Box
        ref={meshRef}
        args={[section.dimensions.width, 1, section.dimensions.length]}
        position={[section.dimensions.width / 2, 0.5, section.dimensions.length / 2]}
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <meshStandardMaterial
          color={getSectionColor()}
          transparent
          opacity={0.2}
        />
      </Box>
      
      {/* Section label */}
      <Text
        position={[section.dimensions.width / 2, 8, section.dimensions.length / 2]}
        fontSize={6}
        color={isSelected ? '#3b82f6' : '#374151'}
        anchorX="center"
        anchorY="middle"
      >
        {section.name}
      </Text>
      
      {/* Occupancy indicator */}
      <Text
        position={[section.dimensions.width / 2, 5, section.dimensions.length / 2]}
        fontSize={3}
        color="#6b7280"
        anchorX="center"
        anchorY="middle"
      >
        {occupiedPositions}/{totalPositions}
        {clientFilter && (
          <Text
            position={[0, -2, 0]}
            fontSize={2}
            color="#3b82f6"
            anchorX="center"
            anchorY="middle"
          >
            (Your containers)
          </Text>
        )}
      </Text>
    </group>
  );
};

const StackMesh: React.FC<StackMeshProps> = ({ stack, section, isSelected, onClick, clientFilter, yardLayout }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (meshRef.current && isSelected) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
  });

  const getStackColor = () => {
    const occupancyRate = clientFilter 
      ? stack.containerPositions.filter(p => p.isOccupied && p.clientCode === clientFilter).length / stack.capacity
      : stack.currentOccupancy / stack.capacity;
    
    if (isSelected) return '#3b82f6'; // blue
    if (hovered) return '#6b7280'; // gray
    
    // Special colors for Tantarelli layout
    if (yardLayout === 'tantarelli') {
      if (stack.stackNumber === 1) return '#8b5cf6'; // purple for entry stack
      if (stack.stackNumber === 31) return '#f59e0b'; // yellow for end stack
      if (stack.stackNumber >= 61 && stack.stackNumber <= 71) return '#06b6d4'; // cyan for high capacity
      if (stack.stackNumber === 101 || stack.stackNumber === 103) return '#ec4899'; // pink for special stacks
    }
    
    // Standard occupancy colors
    if (occupancyRate >= 0.9) return '#ef4444'; // red
    if (occupancyRate >= 0.7) return '#f59e0b'; // yellow
    if (occupancyRate === 0) return '#9ca3af'; // gray for empty
    return '#10b981'; // green
  };

  const getStackOpacity = () => {
    const occupancyRate = clientFilter 
      ? stack.containerPositions.filter(p => p.isOccupied && p.clientCode === clientFilter).length / stack.capacity
      : stack.currentOccupancy / stack.capacity;
    return Math.max(0.3, 0.4 + (occupancyRate * 0.4)); // 0.3 to 0.8 opacity based on occupancy
  };

  const clientContainerCount = clientFilter 
    ? stack.containerPositions.filter(p => p.isOccupied && p.clientCode === clientFilter).length
    : stack.currentOccupancy;

  return (
    <group position={[
      section.position.x + stack.position.x - section.position.x,
      stack.position.z,
      section.position.y + stack.position.y - section.position.y
    ]}>
      {/* Stack base */}
      <Box
        ref={meshRef}
        args={[stack.dimensions.width, stack.maxTiers * 2.6, stack.dimensions.length]}
        position={[0, (stack.maxTiers * 2.6) / 2, 0]}
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <meshStandardMaterial
          color={getStackColor()}
          transparent
          opacity={getStackOpacity()}
          wireframe={true}
        />
      </Box>
      
      {/* Stack number label */}
      <Text
        position={[0, stack.maxTiers * 2.6 + 2, 0]}
        fontSize={2}
        color={isSelected ? '#3b82f6' : '#374151'}
        anchorX="center"
        anchorY="middle"
      >
        {stack.stackNumber.toString().padStart(2, '0')}
        {yardLayout === 'tantarelli' && stack.isOddStack && '●'}
      </Text>
      
      {/* Stack type indicator for special stacks */}
      {yardLayout === 'tantarelli' && (
        <Text
          position={[0, stack.maxTiers * 2.6 + 4, 0]}
          fontSize={1}
          color="#6b7280"
          anchorX="center"
          anchorY="middle"
        >
          {stack.stackNumber === 1 ? 'ENTRY' :
           stack.stackNumber === 31 ? 'END' :
           stack.stackNumber >= 61 && stack.stackNumber <= 71 ? 'HIGH-CAP' :
           stack.stackNumber === 101 ? 'SINGLE' :
           stack.stackNumber === 103 ? 'DOUBLE' :
           `${stack.rows}R`}
        </Text>
      )}
      
      {/* Occupancy indicator */}
      <Text
        position={[0, stack.maxTiers * 2.6 + 6, 0]}
        fontSize={1.2}
        color="#6b7280"
        anchorX="center"
        anchorY="middle"
      >
        {clientFilter ? `${clientContainerCount}/${stack.capacity}` : `${stack.currentOccupancy}/${stack.capacity}`}
      </Text>
    </group>
  );
};

const ContainerMesh: React.FC<ContainerMeshProps> = ({ position, isClientContainer }) => {
  const getContainerDimensions = () => {
    switch (position.containerSize) {
      case '20ft':
        return [6, 2.6, 2.4]; // 20ft container dimensions in meters
      case '40ft':
        return [12, 2.6, 2.4]; // 40ft container dimensions in meters
      case '45ft':
        return [13.7, 2.6, 2.4]; // 45ft container dimensions in meters
      default:
        return [12, 2.6, 2.4];
    }
  };

  const [width, height, depth] = getContainerDimensions();
  
  // Client-specific colors based on client code
  const getClientColor = (clientCode?: string) => {
    const clientColors: { [key: string]: string } = {
      'MAEU': '#1e40af', // Maersk blue
      'MSCU': '#dc2626', // MSC red
      'CMDU': '#059669', // CMA CGM green
      'SHIP001': '#7c3aed', // Shipping Solutions purple
      'HLCU': '#ea580c', // Hapag-Lloyd orange
      'COSCO': '#be123c' // COSCO red
    };
    return clientColors[clientCode || ''] || '#6b7280';
  };
  
  const color = isClientContainer 
    ? getClientColor(position.clientCode)
    : '#9ca3af'; // Gray for other containers

  return (
    <Box
      args={[width, height, depth]}
      position={[position.position.x, position.position.z + height / 2, position.position.y]}
    >
      <meshStandardMaterial 
        color={color} 
        opacity={isClientContainer ? 1.0 : 0.3}
        transparent={!isClientContainer}
      />
    </Box>
  );
};

const YardGround: React.FC<{ yard: Yard }> = ({ yard }) => {
  // Calculate yard bounds
  const maxX = Math.max(...yard.sections.map(s => s.position.x + s.dimensions.width));
  const maxY = Math.max(...yard.sections.map(s => s.position.y + s.dimensions.length));
  
  return (
    <Plane
      args={[maxX + 100, maxY + 100]}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[maxX / 2, 0, maxY / 2]}
    >
      <meshStandardMaterial color="#f8fafc" />
    </Plane>
  );
};

const YardGrid: React.FC<{ yard: Yard }> = ({ yard }) => {
  const maxX = Math.max(...yard.sections.map(s => s.position.x + s.dimensions.width));
  const maxY = Math.max(...yard.sections.map(s => s.position.y + s.dimensions.length));
  const gridSize = Math.max(maxX, maxY) + 100;
  const divisions = Math.floor(gridSize / 15); // 15m grid for container spacing
  
  return (
    <gridHelper
      args={[gridSize, divisions, '#cbd5e1', '#e2e8f0']}
      position={[maxX / 2, 0.1, maxY / 2]}
    />
  );
};

const CameraController: React.FC<{ yard: Yard }> = ({ yard }) => {
  const { camera } = useThree();
  
  useEffect(() => {
    const maxX = Math.max(...yard.sections.map(s => s.position.x + s.dimensions.width));
    const maxY = Math.max(...yard.sections.map(s => s.position.y + s.dimensions.length));
    
    // Position camera for optimal view of the yard
    const cameraDistance = Math.max(maxX, maxY) * 0.8;
    camera.position.set(maxX / 2 + cameraDistance * 0.7, cameraDistance * 0.6, maxY / 2 + cameraDistance * 0.7);
    camera.lookAt(maxX / 2, 0, maxY / 2);
  }, [camera, yard]);
  
  return null;
};

export const YardView3D: React.FC<YardView3DProps> = ({
  yard,
  selectedSection,
  selectedStack,
  positions,
  onSectionSelect,
  onStackSelect,
  clientFilter
}) => {
  return (
    <div className="w-full h-96 bg-gray-100">
      <Canvas
        camera={{ position: [200, 80, 200], fov: 60 }}
        style={{ background: 'linear-gradient(to bottom, #dbeafe, #f0f9ff)' }}
      >
        <CameraController yard={yard} />
        
        {/* Enhanced Lighting */}
        <ambientLight intensity={0.7} />
        <directionalLight
          position={[200, 150, 100]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <pointLight position={[100, 100, 100]} intensity={0.5} />
        
        {/* Ground and Grid */}
        <YardGround yard={yard} />
        <YardGrid yard={yard} />
        
        {/* Yard Sections */}
        {yard.sections.map((section) => (
          <SectionMesh
            key={section.id}
            section={section}
            isSelected={selectedSection?.id === section.id}
            onClick={() => onSectionSelect(selectedSection?.id === section.id ? null : section)}
            clientFilter={clientFilter}
          />
        ))}
        
        {/* Yard Stacks */}
        {yard.sections.map((section) =>
          section.stacks.map((stack) => (
            <StackMesh
              key={stack.id}
              stack={stack}
              section={section}
              isSelected={selectedStack?.id === stack.id}
              onClick={() => onStackSelect(selectedStack?.id === stack.id ? null : stack)}
              clientFilter={clientFilter}
              yardLayout={yard.layout}
            />
          ))
        )}
        
        {/* Containers */}
        {positions
          .filter(pos => pos.isOccupied)
          .map((position) => (
            <ContainerMesh
              key={position.id}
              position={position}
              isClientContainer={!clientFilter || position.clientCode === clientFilter}
            />
          ))}
        
        {/* Controls */}
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={50}
          maxDistance={800}
          maxPolarAngle={Math.PI / 2.1}
        />
      </Canvas>
      
      {/* Enhanced Legend */}
      <div className="absolute bottom-4 left-4 bg-white bg-opacity-95 rounded-lg p-4 text-xs shadow-lg">
        <div className="font-semibold mb-3 text-gray-900">Legend</div>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>Low Occupancy (&lt;70%)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-500 rounded"></div>
            <span>Medium Occupancy (70-90%)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span>High Occupancy (&gt;90%)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span>Selected Stack</span>
          </div>
          {yard.layout === 'tantarelli' && (
            <>
              <div className="border-t border-gray-200 pt-2 mt-2">
                <div className="font-medium text-gray-700 mb-1">Tantarelli Special Stacks:</div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-purple-500 rounded"></div>
                  <span>Entry Stack (01)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                  <span>End Stack (31)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-cyan-500 rounded"></div>
                  <span>High Capacity (61-71)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-pink-500 rounded"></div>
                  <span>Special (101, 103)</span>
                </div>
              </div>
            </>
          )}
          {clientFilter && (
            <div className="border-t border-gray-200 pt-2 mt-2">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-600 rounded"></div>
                <span>Your Containers</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-gray-400 rounded opacity-30"></div>
                <span>Other Containers</span>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Enhanced Instructions */}
      <div className="absolute top-4 right-4 bg-white bg-opacity-95 rounded-lg p-4 text-xs shadow-lg">
        <div className="font-semibold mb-2 text-gray-900">Controls</div>
        <div className="space-y-1">
          <div>• <strong>Rotate:</strong> Click and drag</div>
          <div>• <strong>Zoom:</strong> Scroll wheel</div>
          <div>• <strong>Pan:</strong> Right-click and drag</div>
          <div>• <strong>Select:</strong> Click sections/stacks</div>
          {clientFilter && (
            <div className="text-blue-600 font-medium mt-2">
              • Viewing your containers only
            </div>
          )}
        </div>
      </div>
      
      {/* Enhanced Yard Info */}
      <div className="absolute top-4 left-4 bg-white bg-opacity-95 rounded-lg p-4 text-xs shadow-lg">
        <div className="font-semibold mb-2 text-gray-900">{yard.name}</div>
        <div className="space-y-1">
          <div><strong>Layout:</strong> {yard.layout === 'tantarelli' ? 'Tantarelli (Odd Stacks)' : 'Standard'}</div>
          <div><strong>Sections:</strong> {yard.sections.length}</div>
          <div><strong>Total Stacks:</strong> {yard.sections.reduce((sum, s) => sum + s.stacks.length, 0)}</div>
          <div><strong>Capacity:</strong> {yard.totalCapacity.toLocaleString()}</div>
          <div><strong>Occupancy:</strong> {yard.currentOccupancy.toLocaleString()}</div>
          <div><strong>Utilization:</strong> {Math.round((yard.currentOccupancy / yard.totalCapacity) * 100)}%</div>
          {yard.layout === 'tantarelli' && (
            <div className="text-blue-600 mt-2">
              <strong>Stack Range:</strong> 01, 03, 05, ..., 103
            </div>
          )}
        </div>
      </div>
    </div>
  );
};