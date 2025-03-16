import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

// Define interfaces for props and data structures
interface QuestionOption {
  name: string;
  description: string;
}

interface ForceFieldProps {
  options: QuestionOption[];
  selectedAnswers: string[];
  onSelect: (name: string) => void;
  containerWidth: number;
  containerHeight: number;
}

interface NodeData {
  id: number;
  name: string;
  description: string;
  isSelected: boolean;
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
  containerHeight 
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const nodesRef = useRef<NodeDatum[]>([]);
  const simulationRef = useRef<d3.Simulation<NodeDatum, LinkData> | null>(null);
  const [initialized, setInitialized] = useState(false);
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Create the initial node data once
  useEffect(() => {
    if (initialized || !options.length) return;
    
    // Create nodes with rounded rectangle dimensions
    nodesRef.current = options.map((option, i) => {
      // Determine the size based on the text length, but with minimums
      const textLength = option.name.length;
      const width = Math.max(130, Math.min(200, textLength * 14));
      const height = 80; // Fixed height for all nodes
      
      // Get colors from palette
      const colorIndex = i % POP_ART_COLORS.length;
      
      return {
        id: i,
        name: option.name,
        description: option.description,
        isSelected: selectedAnswers.includes(option.name),
        width,
        height,
        x: Math.random() * containerWidth,
        y: Math.random() * containerHeight,
        color: POP_ART_COLORS[colorIndex],
        color2: POP_ART_COLORS_SECONDARY[colorIndex],
        index: i
      };
    });
    
    setInitialized(true);
  }, [options, containerWidth, containerHeight, initialized, selectedAnswers]);

  // Update the selected state of nodes when selectedAnswers changes
  useEffect(() => {
    if (!initialized) return;
    
    // Only update the isSelected property without changing positions
    nodesRef.current = nodesRef.current.map(node => ({
      ...node,
      isSelected: selectedAnswers.includes(node.name)
    }));
    
    // Update the appearance of nodes without restarting simulation
    if (svgRef.current) {
      d3.select(svgRef.current)
        .selectAll("rect.node-rect")
        .data(nodesRef.current)
        .attr("stroke", d => (d as NodeDatum).isSelected ? '#FFFFFF' : 'rgba(255, 255, 255, 0.3)')
        .attr("stroke-width", d => (d as NodeDatum).isSelected ? 3 : 1.5);
      
      // Update pulse rings visibility
      d3.select(svgRef.current)
        .selectAll("rect.pulse-ring")
        .data(nodesRef.current)
        .style("display", d => (d as NodeDatum).isSelected ? "block" : "none");
    }
  }, [selectedAnswers, initialized]);

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
        tooltipRef.current.innerHTML = `<strong class="text-lg block mb-2 text-cyan-300">${d.name}</strong><p class="text-white/90">${d.description}</p>`;
        
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
      nodeGradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", node.color2)
        .attr("stop-opacity", 0.95);
      
      nodeGradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", node.color)
        .attr("stop-opacity", 0.85);
      
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

    // Add rounded rectangles for nodes
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
      .attr("stroke", d => d.isSelected ? '#FFFFFF' : 'rgba(255, 255, 255, 0.3)')
      .attr("stroke-width", d => d.isSelected ? 3 : 1.5)
      .attr("filter", "url(#dropShadow)")
      .attr("cursor", "pointer")
      .on("mouseover", function(event, d) {
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
        // Remove highlight effect
        d3.select(this)
          .transition()
          .duration(200)
          .attr("stroke", (d as NodeDatum).isSelected ? '#FFFFFF' : 'rgba(255, 255, 255, 0.3)')
          .attr("stroke-width", (d as NodeDatum).isSelected ? 3 : 1.5);
          
        // Hide tooltip
        hideTooltip();
      })
      .on("click", (event, d) => {
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

    // Add pulsating effect for selected nodes
    nodeElements
      .append("rect")
      .attr("class", "pulse-ring")
      .attr("width", d => d.width + 10)
      .attr("height", d => d.height + 10)
      .attr("rx", 22) // Slightly larger than node
      .attr("ry", 22)
      .attr("x", d => -d.width / 2 - 5)
      .attr("y", d => -d.height / 2 - 5)
      .attr("fill", "none")
      .attr("stroke", "#FFFFFF")
      .attr("stroke-width", 2)
      .attr("stroke-opacity", 0.5)
      .attr("pointer-events", "none")
      .style("display", d => d.isSelected ? "block" : "none");

    // Animation function for pulsating effect
    function pulseAnimation() {
      svg.selectAll("rect.pulse-ring")
        .filter(function() { return d3.select(this).style("display") !== "none"; })
        .transition()
        .duration(1500)
        .attr("width", d => (d as NodeDatum).width + 30)
        .attr("height", d => (d as NodeDatum).height + 30)
        .attr("x", d => -(d as NodeDatum).width / 2 - 15)
        .attr("y", d => -(d as NodeDatum).height / 2 - 15)
        .attr("stroke-opacity", 0)
        .transition()
        .duration(100)
        .attr("width", d => (d as NodeDatum).width + 10)
        .attr("height", d => (d as NodeDatum).height + 10)
        .attr("x", d => -(d as NodeDatum).width / 2 - 5)
        .attr("y", d => -(d as NodeDatum).height / 2 - 5)
        .attr("stroke-opacity", 0.5)
        .on("end", pulseAnimation);
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

    // Add dragability
    nodeElements.call(
      d3.drag<SVGGElement, NodeDatum>()
        .on("start", (event, d) => {
          if (!event.active && simulationRef.current) simulationRef.current.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d) => {
          if (!event.active && simulationRef.current) simulationRef.current.alphaTarget(0);
          d.fx = null;
          d.fy = null;
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
  }, [containerWidth, containerHeight, initialized]);

  // Add subtle continuous movement
  useEffect(() => {
    if (!initialized || !simulationRef.current) return;
    
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        simulationRef.current?.nodes().forEach(node => {
          if (Math.random() > 0.7) {
            node.vx = (node.vx || 0) + (Math.random() - 0.5) * 0.1;
            node.vy = (node.vy || 0) + (Math.random() - 0.5) * 0.1;
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