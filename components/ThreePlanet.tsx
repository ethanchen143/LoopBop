"use client";

import { useRef, useEffect } from "react";
import * as THREE from 'three';

// Color palette to match pop art style
const POP_ART_COLORS: string[] = [
  '#FF2B5B', // Hot pink
  '#FF3864', // Coral red
  '#FFC700', // Bright yellow
  '#39FF14', // Neon green
  '#00FFFF', // Cyan
  '#36DBFF', // Bright blue
  '#3772FF', // Royal blue
  '#AD00FF', // Purple
  '#F222FF', // Magenta
];

// Custom types for planet user data
interface PlanetUserData {
  rotationSpeed: {
    x: number;
    y: number;
    z: number;
  };
  orbitSpeed: number;
  orbitRadius: number;
  orbitOffset: number;
  originalPosition: {
    x: number;
    y: number;
    z: number;
  };
}

export default function PopArtPlanetsBackground() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const planetsRef = useRef<THREE.Mesh<THREE.BufferGeometry, THREE.Material>[]>([]);
  const animationFrameId = useRef<number | null>(null);
  
  useEffect(() => {
    if (!mountRef.current) return;
    
    // Initialize Three.js scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    
    // Set up camera
    const camera = new THREE.PerspectiveCamera(
      75, 
      window.innerWidth / window.innerHeight, 
      0.1, 
      1000
    );
    camera.position.z = 40;
    cameraRef.current = camera;
    
    // Set up renderer with alpha for transparency
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true 
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Clear previous canvas if it exists
    while (mountRef.current.firstChild) {
      mountRef.current.removeChild(mountRef.current.firstChild);
    }
    
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Force the renderer to be visible
    renderer.domElement.style.display = "block";
    
    // Add lighting
    // Ambient light for base illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    
    // Directional light with shadows
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 15);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    scene.add(directionalLight);
    
    // Add colorful point lights
    POP_ART_COLORS.forEach((colorHex, i) => {
      const color = parseInt(colorHex.replace('#', '0x'));
      const pointLight = new THREE.PointLight(color, 2, 50);
      pointLight.position.set(
        Math.sin(i / POP_ART_COLORS.length * Math.PI * 2) * 25,
        Math.cos(i / POP_ART_COLORS.length * Math.PI * 2) * 5 + 5,
        Math.cos(i / POP_ART_COLORS.length * Math.PI * 2) * 25
      );
      scene.add(pointLight);
    });
    
    // Create pop art texture function
    const createPopArtTexture = (baseColor: number, style: number): THREE.CanvasTexture => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = 512;
      canvas.height = 512;

      if (context) {
        // Convert hex color to RGB
        const r = (baseColor >> 16) & 255;
        const g = (baseColor >> 8) & 255;
        const b = baseColor & 255;
        
        // Background color
        context.fillStyle = `rgb(${r}, ${g}, ${b})`;
        context.fillRect(0, 0, 512, 512);
        
        // Apply different pop art patterns based on style
        switch (style) {
          case 0: // Dots pattern
            const dotColor = `rgb(${255-r}, ${255-g}, ${255-b})`;
            context.fillStyle = dotColor;
            
            for (let i = 0; i < 20; i++) {
              for (let j = 0; j < 20; j++) {
                const size = 10 + Math.random() * 10;
                context.beginPath();
                context.arc(i * 25 + 12, j * 25 + 12, size, 0, Math.PI * 2);
                context.fill();
              }
            }
            break;
            
          case 1: // Stripes pattern
            const stripeColor = `rgb(${255-r}, ${255-g}, ${255-b})`;
            context.fillStyle = stripeColor;
            
            for (let i = 0; i < 15; i++) {
              context.fillRect(0, i * 40, 512, 20);
            }
            break;
            
          case 2: // Comic-style dots
            for (let i = 0; i < 100; i++) {
              const dotSize = 5 + Math.random() * 25;
              const x = Math.random() * 512;
              const y = Math.random() * 512;
              
              // Random bright colors
              const colors = ['#FF5555', '#55FF55', '#5555FF', '#FFFF55', '#FF55FF', '#55FFFF', '#FFFFFF'];
              context.fillStyle = colors[Math.floor(Math.random() * colors.length)];
              
              context.beginPath();
              context.arc(x, y, dotSize, 0, Math.PI * 2);
              context.fill();
            }
            break;
            
          case 3: // Halftone pattern
            const halftoneBg = `rgb(${255-r}, ${255-g}, ${255-b})`;
            context.fillStyle = halftoneBg;
            context.fillRect(0, 0, 512, 512);
            
            context.fillStyle = `rgb(${r}, ${g}, ${b})`;
            const spacing = 20;
            for (let i = 0; i < 512; i += spacing) {
              for (let j = 0; j < 512; j += spacing) {
                const dist = Math.sqrt(Math.pow(i-256, 2) + Math.pow(j-256, 2));
                const radius = Math.max(0, Math.min(spacing/2, (256-dist)/10));
                
                context.beginPath();
                context.arc(i, j, radius, 0, Math.PI * 2);
                context.fill();
              }
            }
            break;
            
          case 4: // Pop art grid
            const gridSize = 4;
            const cellSize = 512 / gridSize;
            
            const gridColors = [
              `rgb(${r}, ${g}, ${b})`,
              `rgb(${255-r}, ${g}, ${b})`,
              `rgb(${r}, ${255-g}, ${b})`,
              `rgb(${r}, ${g}, ${255-b})`
            ];
            
            for (let i = 0; i < gridSize; i++) {
              for (let j = 0; j < gridSize; j++) {
                context.fillStyle = gridColors[(i+j) % gridColors.length];
                context.fillRect(i * cellSize, j * cellSize, cellSize, cellSize);
                
                // Add a pop art element in each cell
                context.fillStyle = '#FFFFFF';
                context.beginPath();
                
                // Alternate between different shapes
                if ((i+j) % 3 === 0) {
                  // Star
                  const centerX = i * cellSize + cellSize/2;
                  const centerY = j * cellSize + cellSize/2;
                  const starRadius = cellSize * 0.3;
                  
                  for (let p = 0; p < 5; p++) {
                    const angle = (p * 4 * Math.PI) / 5;
                    const x = centerX + Math.cos(angle) * starRadius;
                    const y = centerY + Math.sin(angle) * starRadius;
                    
                    if (p === 0) context.moveTo(x, y);
                    else context.lineTo(x, y);
                  }
                } else if ((i+j) % 3 === 1) {
                  // Circle
                  context.arc(
                    i * cellSize + cellSize/2,
                    j * cellSize + cellSize/2,
                    cellSize * 0.3,
                    0, Math.PI * 2
                  );
                } else {
                  // Exclamation mark
                  const centerX = i * cellSize + cellSize/2;
                  const centerY = j * cellSize + cellSize/2;
                  
                  context.fillRect(
                    centerX - cellSize*0.1,
                    centerY - cellSize*0.3,
                    cellSize*0.2,
                    cellSize*0.4
                  );
                  
                  context.arc(
                    centerX,
                    centerY + cellSize*0.2,
                    cellSize*0.1,
                    0, Math.PI * 2
                  );
                }
                
                context.fill();
              }
            }
            break;
        }
      }
      
      const texture = new THREE.CanvasTexture(canvas);
      return texture;
    };
    
    // Create planets
    const planets: THREE.Mesh<THREE.BufferGeometry, THREE.Material>[] = [];
    planetsRef.current = planets;
    
    // Create a diverse mix of planets with pop art textures
    for (let i = 0; i < 12; i++) {
      // Random position in 3D space
      const orbitRadius = 15 + Math.random() * 20;
      const angle = Math.random() * Math.PI * 2;
      const height = (Math.random() * 20 - 10) * 0.5; // Flatten the distribution along Y axis
      
      const x = Math.cos(angle) * orbitRadius;
      const y = height;
      const z = Math.sin(angle) * orbitRadius;
      
      // Random planet size
      const radius = 1.2 + Math.random() * 2.5;
      const geometry = new THREE.SphereGeometry(radius, 32, 32);
      
      // Get random pop art style and color
      const colorIndex = i % POP_ART_COLORS.length;
      const colorHex = POP_ART_COLORS[colorIndex];
      const color = parseInt(colorHex.replace('#', '0x'));
      const style = Math.floor(Math.random() * 5);
      
      // Create texture using pop art function
      const texture = createPopArtTexture(color, style);
      
      // Create material with pop art texture
      const material = new THREE.MeshPhongMaterial({
        map: texture,
        shininess: 100,
        emissive: color,
        emissiveIntensity: 0.2
      });
      
      // Create planet mesh
      const planet = new THREE.Mesh(geometry, material);
      planet.position.set(x, y, z);
      planet.rotation.set(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      );
      
      // Add rings to some planets (20% chance)
      if (Math.random() < 0.2) {
        const ringGeometry = new THREE.TorusGeometry(
          radius * 1.5, // outer radius
          radius * 0.2, // tube radius
          2, // radial segments
          32 // tubular segments
        );
        
        // Use contrasting color for ring
        const ringColorIndex = (colorIndex + 4) % POP_ART_COLORS.length;
        const ringColorHex = POP_ART_COLORS[ringColorIndex];
        const ringColor = parseInt(ringColorHex.replace('#', '0x'));
        
        const ringMaterial = new THREE.MeshPhongMaterial({
          color: ringColor,
          emissive: ringColor,
          emissiveIntensity: 0.3,
          shininess: 100,
        });
        
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = Math.PI / 2; // Make ring horizontal
        planet.add(ring);
      }
      
      // Add animation metadata to planet
      planet.userData = {
        rotationSpeed: {
          x: (Math.random() - 0.5) * 0.002,
          y: (Math.random() - 0.5) * 0.005, // Faster y rotation
          z: (Math.random() - 0.5) * 0.001
        },
        orbitSpeed: 0.05 + Math.random() * 0.15,
        orbitRadius: orbitRadius,
        orbitOffset: angle,
        originalPosition: { x, y, z }
      } as PlanetUserData;
      
      scene.add(planet);
      planets.push(planet);
    }
    
    // Add a central star
    const starGeometry = new THREE.SphereGeometry(4, 32, 32);
    const starMaterial = new THREE.MeshBasicMaterial({
      color: 0xFFFFF0
    });
    
    const star = new THREE.Mesh(starGeometry, starMaterial);
    scene.add(star);
    
    // Add glow to the star
    const starLight = new THREE.PointLight(0xFFFFF0, 2, 100);
    star.add(starLight);
    
    // Animation loop
    const animate = (): void => {
      if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;
      
      const time = Date.now() * 0.001; // Current time in seconds
      
      // Animate all planets
      planetsRef.current.forEach(planet => {
        if (!planet) return;
        
        // Get planet metadata
        const userData = planet.userData as PlanetUserData;
        const { rotationSpeed, orbitSpeed, orbitRadius, orbitOffset, originalPosition } = userData;
        
        // Rotate planet
        planet.rotation.x += rotationSpeed.x;
        planet.rotation.y += rotationSpeed.y;
        planet.rotation.z += rotationSpeed.z;
        
        // Orbit around the center
        const newAngle = orbitOffset + time * orbitSpeed;
        planet.position.x = Math.cos(newAngle) * orbitRadius;
        planet.position.z = Math.sin(newAngle) * orbitRadius;
        
        // Add slight bobbing motion in y axis
        planet.position.y = originalPosition.y + Math.sin(time * 0.5 + orbitOffset) * 0.5;
      });
      
      // Slowly rotate the star
      star.rotation.y += 0.001;
      
      // Pulsate the star very slightly
      const scaleFactor = 1 + Math.sin(time * 0.5) * 0.05;
      star.scale.set(scaleFactor, scaleFactor, scaleFactor);
      
      // Render the scene
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      
      // Continue animation loop
      animationFrameId.current = requestAnimationFrame(animate);
    };
    
    // Start animation with a small delay to ensure everything is loaded
    setTimeout(() => {
      animate();
    }, 100);
    
    // Handle window resize
    const handleResize = (): void => {
      if (!rendererRef.current || !cameraRef.current) return;
      
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      
      rendererRef.current.setSize(width, height);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Force an initial resize to ensure correct dimensions
    handleResize();
    
    // Clean up
    return () => {      
      window.removeEventListener('resize', handleResize);
      
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
      
      if (mountRef.current && rendererRef.current) {
        try {
          mountRef.current.removeChild(rendererRef.current.domElement);
        } catch (e) {
          console.error("Error removing renderer:", e);
        }
      }
      
      // Dispose geometries and materials
      if (planetsRef.current && planetsRef.current.length) {
        planetsRef.current.forEach(planet => {
          if (!planet) return;
          
          if (planet.geometry) planet.geometry.dispose();
          
          if (Array.isArray(planet.material)) {
            planet.material.forEach(material => {
              if (material) material.dispose();
            });
          } else if (planet.material) {
            planet.material.dispose();
          }
        });
      }
      
      // Clear references
      planetsRef.current = [];
      sceneRef.current = null;
      rendererRef.current = null;
      cameraRef.current = null;
    };
  }, []);
  
  return <div ref={mountRef} className="fixed inset-0 z-0 pointer-events-none" />;
}