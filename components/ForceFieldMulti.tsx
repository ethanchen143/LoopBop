import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

// Define interfaces for props and data structures
interface QuestionOption {
  name: string;
  description: string;
}

// Updated props interface with player selection map
interface ForceFieldProps {
  options: QuestionOption[];
  selectedAnswers: string[];
  onSelect: (name: string) => void;
  containerWidth: number;
  containerHeight: number;
  disabled?: boolean;
  // New props for player-specific selections
  playerSelections?: Record<string, string[]>;
  userId?: string;
  players?: Player[];
}

interface Player {
  id: string;
  name: string;
  isCreator: boolean;
  score: number;
  color?: string; // Added color property
}

interface NodeData {
  id: number;
  name: string;
  description: string;
  isSelected: boolean;
  selectedByCurrentUser: boolean;
  selectedByPlayerId?: string;
  selectedByPlayerName?: string;
  playerColor?: string;
  width: number;
  height: number;
  x: number;
  y: number;
  color: string;
  color2: string; // Second color for gradient
  fx?: number | null;
  fy?: number | null;
  vx?: number;
  vy?: number;
  index?: number;
  disabled?: boolean; // Added for options selected by other players
  beingDragged?: boolean; // Track if node is being dragged
  dragStartX?: number;
  dragStartY?: number;
}

// Define specific types for D3 link data with our NodeData
type NodeDatum = d3.SimulationNodeDatum & NodeData;

interface LinkData extends d3.SimulationLinkDatum<NodeDatum> {
  source: NodeDatum;
  target: NodeDatum;
  strength: number;
  distance: number;
}

// Color palette for pop art aesthetic
const POP_ART_COLORS = [
  '#FF2B5B', // Hot pink
  '#FF3864', // Coral red
  '#FF5F5F', // Salmon
  '#FFC700', // Bright yellow
  '#00FFFF', // Cyan
  '#36DBFF', // Bright blue
  '#3772FF', // Royal blue
  '#AD00FF', // Purple
  '#F222FF', // Magenta
  '#FF00D4', // Hot magenta
];

// Secondary colors for gradients
const POP_ART_COLORS_SECONDARY = [
  '#FF5F8E', // Lighter pink
  '#FF6B91', // Lighter coral
  '#FF8787', // Lighter salmon
  '#FFD84D', // Lighter yellow
  '#7DFFFF', // Lighter cyan
  '#6BE7FF', // Lighter bright blue
  '#6A95FF', // Lighter royal blue
  '#C24DFF', // Lighter purple
  '#F66AFF', // Lighter magenta
  '#FF4DE5', // Lighter hot magenta
];

const ForceFieldOptions: React.FC<ForceFieldProps> = ({ 
  options, 
  selectedAnswers, 
  onSelect, 
  containerWidth, 
  containerHeight,
  disabled = false,
  playerSelections = {},
  userId = "",
  players = []
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const nodesRef = useRef<NodeDatum[]>([]);
  const simulationRef = useRef<d3.Simulation<NodeDatum, LinkData> | null>(null);
  const [initialized, setInitialized] = useState(false);
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const dragStartTimeRef = useRef(0);
  const draggedNodeRef = useRef<string | null>(null);
  const movementThresholdRef = useRef(5);
  
  const nodePositionsRef = useRef(new Map());
  
  const playerColorMap = useRef<Record<string, string>>({});
  
  // Assign colors to players on first render
  useEffect(() => {
    if (players.length > 0 && Object.keys(playerColorMap.current).length === 0) {
      const colorMap: Record<string, string> = {};
      players.forEach((player, index) => {
        const colorIndex = index % POP_ART_COLORS.length;
        colorMap[player.id] = POP_ART_COLORS[colorIndex];
      });
      playerColorMap.current = colorMap;
      
      // Force reinitialization to apply colors
      if (initialized) {
        setInitialized(false);
      }
    }
  }, [players, initialized]);
    
  // UPDATED: Node creation logic with position preservation
  useEffect(() => {
    if (!options.length) return;
    
    // Create filtered nodes array - exclude options selected by other players
    nodesRef.current = options
    .filter(option => {
        // Check if option is valid before processing
        if (!option || typeof option !== 'object') return false;
        
        // Check if this option is selected by another player
        const isSelectedByOtherPlayer = Object.entries(playerSelections || {}).some(([playerId, selections]) => {
          // Only filter if selected by someone else (not the current user)
          return playerId !== userId && Array.isArray(selections) && selections.includes(option.name || '');
        });
        
        // Keep the option if it's not selected by another player
        return !isSelectedByOtherPlayer;
    })
    .map((option, i) => {
        // IMPORTANT: Add defensive coding to handle undefined name
        const name = option && option.name ? option.name : '';
        const description = option && option.description ? option.description : '';
        
        // Determine the size based on the text length, but with minimums
        const textLength = name.length;
        const width = Math.max(130, Math.min(200, textLength * 14));
        const height = 80; // Fixed height for all nodes
        
        // Get colors from palette for the node itself
        const colorIndex = i % POP_ART_COLORS.length;
        
        // Check if this option is selected by the current user
        const isSelectedByCurrentUser = Array.isArray(selectedAnswers) && selectedAnswers.includes(name);
        
        // IMPORTANT: Use saved position if available, otherwise use current position or fallback
        // This preserves node positions between renders
        const savedPosition = nodePositionsRef.current.get(name);
        
        // Use existing position or create a new one
        const x = savedPosition ? savedPosition.x : 
                initialized && nodesRef.current[i]?.x ? nodesRef.current[i].x : 
                Math.random() * containerWidth;
                
        const y = savedPosition ? savedPosition.y : 
                initialized && nodesRef.current[i]?.y ? nodesRef.current[i].y : 
                Math.random() * containerHeight;
        
        // Find player name safely
        const playerObj = Array.isArray(players) ? 
          players.find(p => p && p.id === userId) : undefined;
        const playerName = playerObj?.name || '';
        
        return {
          id: i,
          name: name,
          description: description,
          isSelected: isSelectedByCurrentUser,
          selectedByCurrentUser: isSelectedByCurrentUser,
          selectedByPlayerId: isSelectedByCurrentUser ? userId : undefined,
          selectedByPlayerName: isSelectedByCurrentUser ? playerName : undefined,
          playerColor: isSelectedByCurrentUser ? 
              playerColorMap.current[userId] : undefined,
          width,
          height,
          x, // Use preserved position
          y, // Use preserved position
          color: isSelectedByCurrentUser ? 
              "#00CC70" : 
              POP_ART_COLORS[colorIndex],
          color2: isSelectedByCurrentUser ? 
              "#00FF8A" : 
              POP_ART_COLORS_SECONDARY[colorIndex],
          index: i,
          disabled: false,
          beingDragged: false
        };
    });
    
    setInitialized(true);
  }, [options, containerWidth, containerHeight, selectedAnswers, playerSelections, players, userId]);
  // NEW: Helper function to ensure nodes are in good positions
  const ensureNodesInGoodPositions = () => {
    if (!nodesRef.current || nodesRef.current.length === 0) return;
    
    // Check if nodes are too clustered or at the edges
    let needsAdjustment = false;
    
    // Check if all nodes are in the same small area
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    
    nodesRef.current.forEach(node => {
      minX = Math.min(minX, node.x);
      maxX = Math.max(maxX, node.x);
      minY = Math.min(minY, node.y);
      maxY = Math.max(maxY, node.y);
    });
    
    const totalWidth = maxX - minX;
    const totalHeight = maxY - minY;
    
    // If nodes are too clustered (less than 60% of container), adjust
    if (totalWidth < containerWidth * 0.6 || totalHeight < containerHeight * 0.6) {
      needsAdjustment = true;
    }
    
    // If adjustment needed, gently expand positions while preserving relative layout
    if (needsAdjustment && simulationRef.current) {
      console.log("Adjusting node positions to use space better");
      
      // Gently push nodes apart
      simulationRef.current.force("charge", d3.forceManyBody().strength(-300));
      simulationRef.current.alpha(0.4).restart();
      
      // Reset charge after adjustment
      setTimeout(() => {
        if (simulationRef.current) {
          simulationRef.current.force("charge", d3.forceManyBody().strength(-200));
        }
      }, 1500);
    }
  };

  // UPDATED: Selection change handler with smooth transitions
  useEffect(() => {
    if (!initialized) return;
  
    // Get the names of options currently in our nodes
    const currentNodeNames = nodesRef.current.map(node => node.name);
    
    // Find options that need to be added (were deselected by other players)
    const optionsToAdd = options.filter(option => {
      // Check if this option is not currently in our node list
      if (!currentNodeNames.includes(option.name)) {
        // Check if it's no longer selected by any other player
        const isSelectedByOtherPlayer = Object.entries(playerSelections || {}).some(([playerId, selections]) => {
          return playerId !== userId && selections.includes(option.name);
        });
        
        // Add it if it's not selected by another player
        return !isSelectedByOtherPlayer;
      }
      return false;
    });
    
    // Find options that need to be removed (were selected by other players)
    const nodeNamesToRemove = currentNodeNames.filter(nodeName => {
      // Check if this node is now selected by another player
      return Object.entries(playerSelections || {}).some(([playerId, selections]) => {
        return playerId !== userId && selections.includes(nodeName);
      });
    });
  
    // If we have nodes to add or remove, update with smooth transition
    if (optionsToAdd.length > 0 || nodeNamesToRemove.length > 0) {
      console.log("Nodes changing - adding:", optionsToAdd.length, "removing:", nodeNamesToRemove.length);
      
      if (svgRef.current) {
        // First fade out any nodes that need to be removed
        d3.select(svgRef.current)
          .selectAll(".node-group")
          .filter(d => nodeNamesToRemove.includes((d as NodeDatum).name))
          .transition()
          .duration(300)
          .style("opacity", 0);
      }
      
      // Update nodes array with smooth transition timers
      setTimeout(() => {
        // Remove nodes selected by other players
        let updatedNodes = nodesRef.current.filter(node => !nodeNamesToRemove.includes(node.name));
        
        // Add nodes that were deselected by other players
        if (optionsToAdd.length > 0) {
          const newNodes = optionsToAdd.map((option, i) => {
            if (!option || typeof option !== 'object') {
              console.warn('Invalid option in optionsToAdd:', option);
              return null; // Will be filtered out later
            }
            // Handle potentially undefined options
            if (!option || typeof option !== 'object') {
              console.warn('Invalid option in optionsToAdd:', option);
              return null; // Will be filtered out later
            }
            
            const nextIndex = updatedNodes.length + i;
            const colorIndex = nextIndex % POP_ART_COLORS.length;
            
            // Safely get name with fallback
            const name = option.name ? option.name : '';
            const description = option.description ? option.description : '';
            
            // Now safely use name.length
            const textLength = name.length;
            const width = Math.max(130, Math.min(200, textLength * 14));
            const height = 80;
            
            // Check if this option is selected by the current user
            const isSelectedByCurrentUser = Array.isArray(selectedAnswers) && selectedAnswers.includes(name);
            
            // IMPORTANT: Check if we have a saved position from before
            const savedPosition = nodePositionsRef.current.get(name);
            
            // If we have a saved position, use it; otherwise, position near the center
            const x = savedPosition ? savedPosition.x : 
                     containerWidth / 2 + (Math.random() - 0.5) * 100;
            const y = savedPosition ? savedPosition.y : 
                     containerHeight / 2 + (Math.random() - 0.5) * 100;
            
            // Find player name safely
            const playerObj = Array.isArray(players) ? 
              players.find(p => p && p.id === userId) : undefined;
            const playerName = playerObj?.name || '';
            
            return {
              id: nextIndex,
              name: name,
              description: description,
              isSelected: isSelectedByCurrentUser,
              selectedByCurrentUser: isSelectedByCurrentUser,
              selectedByPlayerId: isSelectedByCurrentUser ? userId : undefined,
              selectedByPlayerName: isSelectedByCurrentUser ? playerName : undefined,
              playerColor: isSelectedByCurrentUser ? 
                playerColorMap.current[userId] : undefined,
              width,
              height,
              x, // Use preserved position
              y, // Use preserved position 
              color: isSelectedByCurrentUser ? playerColorMap.current[userId] || POP_ART_COLORS[colorIndex] : POP_ART_COLORS[colorIndex],
              color2: isSelectedByCurrentUser ? playerColorMap.current[userId] || POP_ART_COLORS_SECONDARY[colorIndex] : POP_ART_COLORS_SECONDARY[colorIndex],
              index: nextIndex,
              disabled: false,
              beingDragged: false
            };
          }).filter(Boolean) as NodeDatum[];
          
          updatedNodes = [...updatedNodes, ...newNodes];
        }
        
        // Update node reference with new array
        nodesRef.current = updatedNodes;
        
        // Restart the simulation with only mild adjustment
        if (simulationRef.current) {
          simulationRef.current.nodes(nodesRef.current);
          simulationRef.current.alpha(0.3).restart(); // Low alpha for mild adjustment
        }
        
        // Don't completely reset the simulation - just rebuild visual elements
        if (svgRef.current) {
          setInitialized(false);
          setTimeout(() => setInitialized(true), 50);
        }
      }, 320); // Wait for fade-out transition to finish
      
      return; // Skip the rest of this effect
    }
  
    // Just update selected state and appearance without moving nodes
    nodesRef.current = nodesRef.current.map((node, i) => {
      const isSelectedByCurrentUser = selectedAnswers.includes(node.name);
      
      return {
        ...node,
        isSelected: isSelectedByCurrentUser,
        selectedByCurrentUser: isSelectedByCurrentUser,
        selectedByPlayerId: isSelectedByCurrentUser ? userId : undefined,
        selectedByPlayerName: isSelectedByCurrentUser ? 
          players.find(p => p.id === userId)?.name : undefined,
        playerColor: isSelectedByCurrentUser ? 
          playerColorMap.current[userId] : undefined,
        color: isSelectedByCurrentUser ? 
          "#00CC70" : 
          POP_ART_COLORS[i % POP_ART_COLORS.length],
        color2: isSelectedByCurrentUser ? 
          "#00FF8A" : 
          POP_ART_COLORS_SECONDARY[i % POP_ART_COLORS.length],
      };
    });
  
    // Update visual appearance without restarting simulation
    if (svgRef.current) {
      // Use transitions for all visual updates
      d3.select(svgRef.current)
        .selectAll(".node-group")
        .data(nodesRef.current)
        .transition()
        .duration(200)
        .style("opacity", "1"); // All visible nodes should have full opacity
      
      // Update rectangle fill colors with transition
      d3.select(svgRef.current)
        .selectAll("rect.node-rect")
        .data(nodesRef.current)
        .each(function(d) {
          const nodeIndex = d.index;
          if (nodeIndex !== undefined) {
            updateNodeGradient(nodeIndex, d);
          }
        })
        .transition()
        .duration(200)
        .attr("fill", (d) => `url(#nodeGradient-${d.index})`)
        .attr("stroke", (d) => d.selectedByCurrentUser ? '#FFFFFF' : 'rgba(255, 255, 255, 0.3)')
        .attr("stroke-width", (d) => d.isSelected ? 3 : 1.5);
      
      // Update pulse rings with transition
      d3.select(svgRef.current)
        .selectAll("rect.pulse-ring")
        .data(nodesRef.current)
        .transition()
        .duration(200)
        .style("display", (d) => d.selectedByCurrentUser ? "block" : "none")
        .attr("stroke", (d) => d.playerColor || '#FFFFFF');
    }
  }, [selectedAnswers, initialized, playerSelections, players, disabled, userId, options, containerWidth, containerHeight]);
    
  // Function to update node gradient definitions
  const updateNodeGradient = (nodeIndex: number, nodeData: NodeDatum) => {
    const svg = d3.select(svgRef.current);
    if (!svg) return;
    
    // Select existing gradient or create if it doesn't exist
    const gradientId = `nodeGradient-${nodeIndex}`;
    const gradient = svg.select(`#${gradientId}`);
    
    if (gradient.empty()) {
      console.log("Creating new gradient for node", nodeIndex);
      return; // Gradient doesn't exist yet, will be created in full simulation setup
    }
    
    gradient.selectAll("stop").remove(); // Remove existing stops
    
    if (nodeData.selectedByCurrentUser) {
      // Use pop art green gradient for selected nodes
      gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#00FF8A") // Bright pop art green
        .attr("stop-opacity", 0.95);
      
      gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#00CC70") // Slightly darker green
        .attr("stop-opacity", 0.9);
    } else {
      // Regular gradient for unselected nodes
      gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", nodeData.color2)
        .attr("stop-opacity", 0.95);
      
      gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", nodeData.color)
        .attr("stop-opacity", 0.85);
    }
  };

  const showTooltipWithDelay = (event: MouseEvent, d: NodeDatum) => {
    // Clear any existing timeout
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
    }
    
    // Set a new timeout to show the tooltip after 1.5 seconds
    tooltipTimeoutRef.current = setTimeout(() => {
      if (tooltipRef.current) {
        // Position in center of window instead of following cursor
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        tooltipRef.current.style.display = "block";
        tooltipRef.current.style.opacity = "0";
        tooltipRef.current.style.left = `${windowWidth / 2 - 150}px`; // Center horizontally (assuming max-width around 300px)
        tooltipRef.current.style.top = `${windowHeight / 2 - 75}px`; // Center vertically (approximate)
        
        let tooltipContent = `<strong class="text-lg block mb-2 text-cyan-300">${d.name}</strong>`;
        tooltipContent += `<p class="text-white/90">${d.description}</p>`;
        
        // Add player info if option is selected
        if (d.isSelected && d.selectedByPlayerName) {
          const playerColor = d.playerColor || '#FFFFFF';
          tooltipContent += `<div class="mt-2 pt-2 border-t border-gray-700">
            <span style="color: ${playerColor}">Selected by ${d.selectedByPlayerName}</span>
          </div>`;
        }
        
        tooltipRef.current.innerHTML = tooltipContent;
        
        // Force a reflow
        void tooltipRef.current.offsetWidth;
        
        tooltipRef.current.style.opacity = "0.85"; // Lower opacity
      }
    }, 1500); // 1.5 seconds delay
  };
  
  // Function to hide tooltip and clear timeout
  const hideTooltip = () => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = null;
    }
    
    if (tooltipRef.current) {
      tooltipRef.current.style.opacity = "0";
      
      // After fade-out, hide the element
      setTimeout(() => {
        if (tooltipRef.current) {
          tooltipRef.current.style.display = "none";
        }
      }, 200);
    }
  };

  // UPDATED: Check for good node layout after initialization
  useEffect(() => {
    if (initialized && simulationRef.current && nodesRef.current.length > 0) {
      ensureNodesInGoodPositions();
    }
  }, [initialized]);

  // Initialize and manage the force simulation
  useEffect(() => {
    if (!initialized || !options.length || !containerWidth || !containerHeight || !svgRef.current) return;

    console.log("Setting up force simulation with rounded rectangles");

    // Clear previous simulation
    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Create a gradient definition for the glow effect
    const defs = svg.append("defs");
    
    // Add a glow filter
    const filter = defs.append("filter")
      .attr("id", "glow")
      .attr("x", "-50%")
      .attr("y", "-50%")
      .attr("width", "200%")
      .attr("height", "200%");
      
    filter.append("feGaussianBlur")
      .attr("stdDeviation", "3")
      .attr("result", "coloredBlur");
      
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode")
      .attr("in", "coloredBlur");
    feMerge.append("feMergeNode")
      .attr("in", "SourceGraphic");
    
    // Add drop shadow filter for 3D effect
    const dropShadowFilter = defs.append("filter")
      .attr("id", "dropShadow")
      .attr("x", "-20%")
      .attr("y", "-20%")
      .attr("width", "140%")
      .attr("height", "140%");
    
    // Add shadow components
    dropShadowFilter.append("feDropShadow")
      .attr("dx", "0")
      .attr("dy", "4")
      .attr("stdDeviation", "4")
      .attr("flood-color", "rgba(0, 0, 0, 0.3)")
      .attr("flood-opacity", "0.5");
    
    // Add gradient for links
    const linkGradient = defs.append("linearGradient")
      .attr("id", "linkGradient")
      .attr("gradientUnits", "userSpaceOnUse");
      
    linkGradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#FF3864")
      .attr("stop-opacity", 0.7);
      
    linkGradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#AD00FF")
      .attr("stop-opacity", 0.7);
    
    // Create individual gradients for each node
    nodesRef.current.forEach((node, i) => {
      // Create unique gradient ID for this node
      const gradientId = `nodeGradient-${i}`;
      
      // Create linear gradient
      const nodeGradient = defs.append("linearGradient")
        .attr("id", gradientId)
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "100%")
        .attr("y2", "100%");
      
      // Add color stops
      if (node.selectedByCurrentUser) {
        // Green gradient for selected nodes
        nodeGradient.append("stop")
          .attr("offset", "0%")
          .attr("stop-color", "#00FF8A") // Bright green
          .attr("stop-opacity", 0.95);
        
        nodeGradient.append("stop")
          .attr("offset", "100%")
          .attr("stop-color", "#00CC70") // Darker green
          .attr("stop-opacity", 0.9);
      } else {
        // Regular gradient for unselected nodes
        nodeGradient.append("stop")
          .attr("offset", "0%")
          .attr("stop-color", node.color2)
          .attr("stop-opacity", 0.95);
        
        nodeGradient.append("stop")
          .attr("offset", "100%")
          .attr("stop-color", node.color)
          .attr("stop-opacity", 0.85);
      }
      
      // Add a highlight element for the glossy effect
      const highlightGradient = defs.append("linearGradient")
        .attr("id", `highlight-${i}`)
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "0%")
        .attr("y2", "100%");
      
      highlightGradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "rgba(255, 255, 255, 0.7)")
        .attr("stop-opacity", 0.7);
      
      highlightGradient.append("stop")
        .attr("offset", "15%")
        .attr("stop-color", "rgba(255, 255, 255, 0.0)")
        .attr("stop-opacity", 0);
    });
    
    // Create links between nodes
    const links: LinkData[] = [];
    
    nodesRef.current.forEach((source, i) => {
      // Connect to just a few nearby nodes to reduce clutter
      const nearbyIndices = [];
      for (let j = 0; j < nodesRef.current.length; j++) {
        if (i !== j && Math.random() > 0.7) { // 30% chance of connection
          nearbyIndices.push(j);
          if (nearbyIndices.length >= 2) break; // Max 2 connections per node
        }
      }
      
      nearbyIndices.forEach(j => {
        links.push({
          source,
          target: nodesRef.current[j],
          strength: 0.03,
          distance: 180, // Increased distance for rectangle spacing
          index: 0 // This will be assigned by D3
        });
      });
    });

    // Create link group and add links with glow effect
    const linkGroup = svg.append("g").attr("class", "links");
    
    const linkElements = linkGroup
      .selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke", "url(#linkGradient)")
      .attr("stroke-width", 2)
      .attr("stroke-opacity", 0.6)
      .attr("filter", "url(#glow)");

    // Create node group
    const nodeGroup = svg.append("g").attr("class", "nodes");
    
    // Add node elements
    const nodeElements = nodeGroup
      .selectAll("g")
      .data(nodesRef.current)
      .enter()
      .append("g")
      .attr("class", "node-group")
      .attr("data-name", d => d.name);

      nodeElements
      .append("rect")
      .attr("class", "node-rect")
      .attr("width", d => d.width)
      .attr("height", d => d.height)
      .attr("rx", 20) // Rounded corners
      .attr("ry", 20)
      .attr("x", d => -d.width / 2)
      .attr("y", d => -d.height / 2)
      .attr("fill", (d, i) => `url(#nodeGradient-${i})`)
      .attr("stroke", d => {
        if (d.selectedByCurrentUser) return '#FFFFFF'; // White border for current user's selection
        return 'rgba(255, 255, 255, 0.3)'; // Default for unselected
      })
      .attr("stroke-width", d => d.isSelected ? 3 : 1.5)
      .attr("filter", "url(#dropShadow)")
      .attr("cursor", disabled ? "not-allowed" : "pointer")
      .on("mouseover", function(event, d) {
        // Skip highlight effect for disabled options
        if (d.disabled || disabled) return;
        
        // Highlight effect
        d3.select(this)
          .transition()
          .duration(200)
          .attr("stroke", "#FFFFFF")
          .attr("stroke-width", 3);
          
        // Show tooltip with delay
        showTooltipWithDelay(event as MouseEvent, d as NodeDatum);
      })
      .on("mouseout", function(event, d) {
        // Skip for disabled options
        if (d.disabled || disabled) return;
        
        // Remove highlight effect
        d3.select(this)
          .transition()
          .duration(200)
          .attr("stroke", (d as NodeDatum).selectedByCurrentUser ? '#FFFFFF' : 
                 (d as NodeDatum).isSelected ? (d as NodeDatum).playerColor || '#FFFFFF' : 
                 'rgba(255, 255, 255, 0.3)')
          .attr("stroke-width", (d as NodeDatum).isSelected ? 3 : 1.5);
          
        // Hide tooltip
        hideTooltip();
      })
      .on("click", (event, d) => {
        // Skip clicks for disabled options or when the whole component is disabled
        if (d.disabled || disabled) return;
        
        // Don't process click if this node was recently dragged
        if (draggedNodeRef.current === d.name) {
          return;
        }
        
        // Call onSelect regardless of if it's already selected
        onSelect((d as NodeDatum).name);
        event.stopPropagation();
      });

    
    // Add glossy highlight effect
    nodeElements
      .append("rect")
      .attr("class", "gloss")
      .attr("width", d => d.width - 10)
      .attr("height", d => d.height / 2)
      .attr("rx", 18) // Slightly smaller than parent
      .attr("ry", 18)
      .attr("x", d => -d.width / 2 + 5)
      .attr("y", d => -d.height / 2 + 5)
      .attr("fill", (d, i) => `url(#highlight-${i})`)
      .attr("pointer-events", "none")
      .attr("opacity", 0.4);

    // Add text labels with better visibility
    nodeElements
      .append("text")
      .text(d => d.name)
      .attr("font-size", "16px") // Larger text
      .attr("text-anchor", "middle")
      .attr("dy", "0.3em")
      .attr("fill", "white")
      .attr("paint-order", "stroke")
      .attr("stroke", "rgba(0, 0, 0, 0.4)")
      .attr("stroke-width", "3px")
      .attr("font-weight", "bold")
      .attr("pointer-events", "none");
    
    // Add player label
    nodeElements
      .append("text")
      .attr("class", "player-label")
      .text(d => d.selectedByPlayerName || "")
      .attr("font-size", "12px")
      .attr("text-anchor", "middle")
      .attr("dy", "2.5em") // Position below the main text
      .attr("fill", d => d.playerColor || "white")
      .attr("paint-order", "stroke")
      .attr("stroke", "rgba(0, 0, 0, 0.6)")
      .attr("stroke-width", "2px")
      .attr("pointer-events", "none")
      .style("display", d => d.isSelected && !d.selectedByCurrentUser ? "block" : "none");

    // Add pulsating effect for selected nodes
    nodeElements
      .append("rect")
      .attr("class", "pulse-ring")
      .attr("width", d => d.width)
      .attr("height", d => d.height)
      .attr("rx", 20) 
      .attr("ry", 20)
      .attr("x", d => -d.width / 2)
      .attr("y", d => -d.height / 2)
      .attr("fill", "none")
      .attr("stroke", d => d.selectedByCurrentUser ? "#FFFFFF" : (d.playerColor || "#FFFFFF"))
      .attr("stroke-width", d => d.selectedByCurrentUser ? 3 : 2) // Thicker stroke for selected
      .attr("stroke-opacity", d => d.selectedByCurrentUser ? 0.8 : 0.5) // Brighter for selected
      .attr("pointer-events", "none")
      .style("display", d => d.selectedByCurrentUser ? "block" : "none");

  // Animation function for pulsating effect - smooth continuous cycle
  function pulseAnimation() {
    // Track the current animation state (expand or contract)
    const elements = svg.selectAll("rect.pulse-ring")
      .filter(function() { return d3.select(this).style("display") !== "none"; });
    
    // Use a single smooth transition for pulsing
    elements
      .transition()
      .duration(1500) // Consistent duration for expansion
      .ease(d3.easeSinInOut) // Smooth sine wave easing
      .attr("width", d => {
        const increase = (d as NodeDatum).selectedByCurrentUser ? 30 : 15;
        return (d as NodeDatum).width + increase;
      })
      .attr("height", d => {
        const increase = (d as NodeDatum).selectedByCurrentUser ? 30 : 15;
        return (d as NodeDatum).height + increase;
      })
      .attr("x", d => {
        const offset = (d as NodeDatum).selectedByCurrentUser ? 15 : 7.5;
        return -(d as NodeDatum).width / 2 - offset;
      })
      .attr("y", d => {
        const offset = (d as NodeDatum).selectedByCurrentUser ? 15 : 7.5;
        return -(d as NodeDatum).height / 2 - offset;
      })
      .attr("stroke-opacity", 0.1) // Don't go completely transparent
      .attr("stroke-width", d => (d as NodeDatum).selectedByCurrentUser ? 4 : 2)
      .transition() // Second transition for contracting
      .duration(10) // Same duration for contraction
      .ease(d3.easeSinInOut) // Smooth sine wave easing
      .attr("width", d => (d as NodeDatum).width)
      .attr("height", d => (d as NodeDatum).height)
      .attr("x", d => -(d as NodeDatum).width / 2)
      .attr("y", d => -(d as NodeDatum).height / 2)
      .attr("stroke-opacity", d => (d as NodeDatum).selectedByCurrentUser ? 0.8 : 0.5)
      .attr("stroke-width", d => (d as NodeDatum).selectedByCurrentUser ? 3 : 2)
      .on("end", pulseAnimation); // Continue the cycle
  }

    pulseAnimation();

    // Custom collision detection for rectangles
    function rectCollide() {
      const nodes = nodesRef.current;
      const padding = 10; // Space between rectangles
      
      return function(alpha: number) {
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const nodeA = nodes[i];
            const nodeB = nodes[j];
            
            // Calculate center distance
            const dx = nodeB.x - nodeA.x;
            const dy = nodeB.y - nodeA.y;
            
            // Calculate minimum non-overlapping distance
            const minDistX = (nodeA.width + nodeB.width) / 2 + padding;
            const minDistY = (nodeA.height + nodeB.height) / 2 + padding;
            
            // Check for collision
            if (Math.abs(dx) < minDistX && Math.abs(dy) < minDistY) {
              // Calculate overlap
              const overlapX = minDistX - Math.abs(dx);
              const overlapY = minDistY - Math.abs(dy);
              
              // Apply minimum force to resolve collision
              if (overlapX < overlapY) {
                // Horizontal resolution
                const signX = dx > 0 ? 1 : -1;
                nodeA.x -= signX * overlapX * 0.5 * alpha;
                nodeB.x += signX * overlapX * 0.5 * alpha;
              } else {
                // Vertical resolution
                const signY = dy > 0 ? 1 : -1;
                nodeA.y -= signY * overlapY * 0.5 * alpha;
                nodeB.y += signY * overlapY * 0.5 * alpha;
              }
            }
          }
        }
      };
    }

    // Set up force simulation with custom collision detection
    simulationRef.current = d3
      .forceSimulation(nodesRef.current)
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(containerWidth / 2, containerHeight / 2))
      .force("link", d3.forceLink<NodeDatum, LinkData>(links).id(d => d.id).distance(d => d.distance).strength(d => d.strength))
      .velocityDecay(0.4);
    
    // Add custom collision detection
    simulationRef.current.on("tick", () => {
      // Apply custom collision detection
      rectCollide()(0.5);
      
      // IMPORTANT: Save node positions for persistence between renders
      nodesRef.current.forEach(node => {
        nodePositionsRef.current.set(node.name, { x: node.x, y: node.y });
      });
      
      // Update link positions - connect to the edge of rectangles, not center
      linkElements
        .attr("x1", d => {
          const dx = d.target.x - d.source.x;
          const dy = d.target.y - d.source.y;
          const angle = Math.atan2(dy, dx);
          
          const sourceWidth = d.source.width / 2;
          const sourceHeight = d.source.height / 2;
          
          // Calculate intersection with rectangle edge
          let intersectX;
          if (Math.abs(Math.cos(angle)) > Math.abs(sourceHeight / sourceWidth * Math.sin(angle))) {
            // Intersects with vertical edge
            intersectX = d.source.x + Math.sign(Math.cos(angle)) * sourceWidth;
          } else {
            // Intersects with horizontal edge
            const t = sourceHeight / Math.abs(Math.sin(angle));
            intersectX = d.source.x + Math.cos(angle) * t;
          }
          
          return intersectX;
        })
        .attr("y1", d => {
          const dx = d.target.x - d.source.x;
          const dy = d.target.y - d.source.y;
          const angle = Math.atan2(dy, dx);
          
          const sourceWidth = d.source.width / 2;
          const sourceHeight = d.source.height / 2;
          
          // Calculate intersection with rectangle edge
          let intersectY;
          if (Math.abs(Math.cos(angle)) > Math.abs(sourceHeight / sourceWidth * Math.sin(angle))) {
            // Intersects with vertical edge
            const t = sourceWidth / Math.abs(Math.cos(angle));
            intersectY = d.source.y + Math.sin(angle) * t;
          } else {
            // Intersects with horizontal edge
            intersectY = d.source.y + Math.sign(Math.sin(angle)) * sourceHeight;
          }
          
          return intersectY;
        })
        .attr("x2", d => {
          const dx = d.source.x - d.target.x;
          const dy = d.source.y - d.target.y;
          const angle = Math.atan2(dy, dx);
          
          const targetWidth = d.target.width / 2;
          const targetHeight = d.target.height / 2;
          
          // Calculate intersection with rectangle edge
          let intersectX;
          if (Math.abs(Math.cos(angle)) > Math.abs(targetHeight / targetWidth * Math.sin(angle))) {
            // Intersects with vertical edge
            intersectX = d.target.x + Math.sign(Math.cos(angle)) * targetWidth;
          } else {
            // Intersects with horizontal edge
            const t = targetHeight / Math.abs(Math.sin(angle));
            intersectX = d.target.x + Math.cos(angle) * t;
          }
          
          return intersectX;
        })
        .attr("y2", d => {
          const dx = d.source.x - d.target.x;
          const dy = d.source.y - d.target.y;
          const angle = Math.atan2(dy, dx);
          
          const targetWidth = d.target.width / 2;
          const targetHeight = d.target.height / 2;
          
          // Calculate intersection with rectangle edge
          let intersectY;
          if (Math.abs(Math.cos(angle)) > Math.abs(targetHeight / targetWidth * Math.sin(angle))) {
            // Intersects with vertical edge
            const t = targetWidth / Math.abs(Math.cos(angle));
            intersectY = d.target.y + Math.sin(angle) * t;
          } else {
            // Intersects with horizontal edge
            intersectY = d.target.y + Math.sign(Math.sin(angle)) * targetHeight;
          }
          
          return intersectY;
        });

      // Update node positions with boundary constraints
      nodeElements.attr("transform", d => {
        // Add padding equal to half width/height to keep within container
        const maxX = containerWidth - d.width / 2;
        const maxY = containerHeight - d.height / 2;
        const minX = d.width / 2;
        const minY = d.height / 2;
        
        // Constrain to container bounds
        const x = Math.max(minX, Math.min(maxX, d.x));
        const y = Math.max(minY, Math.min(maxY, d.y));
        
        // Update the node's position in our data reference
        d.x = x;
        d.y = y;
        
        return `translate(${x},${y})`;
      });
    });

    nodeElements.call(
      d3.drag<SVGGElement, NodeDatum>()
        .on("start", (event, d) => {
          // Only disable when component is fully disabled, not for selected nodes
          if (disabled) return; 
          
          // Reset the dragged node ref
          draggedNodeRef.current = null;
          
          // Store start time for tracking short drags
          dragStartTimeRef.current = Date.now();
          
          // Track the start position for detecting movement
          d.dragStartX = event.x;
          d.dragStartY = event.y;
          
          // When drag starts, let other players know this node is being manipulated
          d.beingDragged = true;
          
          if (!event.active && simulationRef.current) {
            simulationRef.current.alphaTarget(0.3).restart();
          }
          
          // Fix the node position during drag
          d.fx = d.x;
          d.fy = d.y;
          
          // Make sure the node being dragged is on top of others
          const currentElement = d3.select(event.sourceEvent.target.parentNode);
          currentElement.raise();
        })
        .on("drag", (event, d) => {
          // Only disable when component is fully disabled, not for selected nodes
          if (disabled) return;
          
          // Check if we've moved enough to consider this a drag
          const movedX = Math.abs(event.x - (d.dragStartX || 0));
          const movedY = Math.abs(event.y - (d.dragStartY || 0));
          
          if (movedX > movementThresholdRef.current || movedY > movementThresholdRef.current) {
            // Mark this node as being dragged to prevent click selection
            draggedNodeRef.current = d.name;
          }
          
          // Update the fixed position
          d.fx = event.x;
          d.fy = event.y;
          
          // Save position during drag to maintain across renders
          nodePositionsRef.current.set(d.name, { x: event.x, y: event.y });
        })
        .on("end", (event, d) => {
          // Only disable when component is fully disabled, not for selected nodes
          if (disabled) return;
          
          // Mark node as no longer being dragged
          d.beingDragged = false;
          
          if (!event.active && simulationRef.current) {
            simulationRef.current.alphaTarget(0);
          }
          
          // Unfix position but allow gentle settling
          d.fx = null;
          d.fy = null;
          
          // Final position save
          nodePositionsRef.current.set(d.name, { x: d.x, y: d.y });
          
          // If the drag was very short in time and movement, it's likely a click
          // Clear the dragged node reference after a short delay to allow the click
          // event to check it
          const dragDuration = Date.now() - dragStartTimeRef.current;
          
          if (dragDuration < 200 && draggedNodeRef.current === d.name) {
            // Short drag that didn't move much - clear quickly to allow click
            setTimeout(() => {
              draggedNodeRef.current = null;
            }, 50);
          } else {
            // Longer drag or significant movement - keep flag for a bit longer
            setTimeout(() => {
              draggedNodeRef.current = null;
            }, 300);
          }
        })
    );

    // Cool down the simulation gradually to prevent excessive movement
    simulationRef.current.alpha(1).restart();
    
    setTimeout(() => {
      if (simulationRef.current) simulationRef.current.alphaTarget(0).alphaDecay(0.02);
    }, 3000);

    // Cleanup function
    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
      
      // Clear any tooltip timeout when unmounting
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
    };
  }, [containerWidth, containerHeight, initialized, disabled]);

  // Add subtle continuous movement
  useEffect(() => {
    if (!initialized || !simulationRef.current) return;
    
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        simulationRef.current?.nodes().forEach(node => {
          if (Math.random() > 0.7) {
            // Don't apply forces to nodes being dragged
            if (!node.beingDragged) {
              node.vx = (node.vx || 0) + (Math.random() - 0.5) * 0.1;
              node.vy = (node.vy || 0) + (Math.random() - 0.5) * 0.1;
            }
          }
        });
        
        simulationRef.current?.alpha(0.1).restart();
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [initialized]);

  return (
    <div className="relative w-full h-full">
      <svg ref={svgRef} width={containerWidth} height={containerHeight} className="overflow-visible">
      </svg>
      {/* Custom tooltip with fade-in/out animations */}
      <div 
        ref={tooltipRef}
        id="tooltip" 
        className="absolute bg-gray-900 text-white p-5 rounded-lg shadow-xl border border-cyan-500 text-sm z-50 pointer-events-none max-w-xs"
        style={{ 
            display: 'none', 
            opacity: 0, 
            transition: 'opacity 0.3s ease-in-out',
            position: 'fixed',
            width: '300px',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 0 20px rgba(0, 200, 255, 0.3)'
        }}
      ></div>
    </div>
  );
};

export default ForceFieldOptions;