"use client";

import { useRef, useEffect } from "react";
import * as THREE from 'three';

// Color palette to match dashboard
const POP_ART_COLORS: string[] = [
  '#FF2B5B', // Hot pink
  '#FF3864', // Coral red
  '#FFC700', // Bright yellow
  // '#39FF14', // Neon green
  '#00FFFF', // Cyan
  '#36DBFF', // Bright blue
  '#3772FF', // Royal blue
  '#AD00FF', // Purple
  '#F222FF', // Magenta
];

// Custom types for shape user data
interface ShapeUserData {
  rotationSpeed: {
    x: number;
    y: number;
    z: number;
  };
  floatSpeed: number;
  floatOffset: number;
  originalY: number;
}

export default function ThreeJSBackground() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const shapesRef = useRef<THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]>[]>([]);
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
    camera.position.z = 30;
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
        Math.sin(i / POP_ART_COLORS.length * Math.PI * 2) * 20,
        Math.cos(i / POP_ART_COLORS.length * Math.PI * 2) * 5 + 5,
        Math.cos(i / POP_ART_COLORS.length * Math.PI * 2) * 20
      );
      scene.add(pointLight);
    });
    
    // Create abstract shapes
    const shapes: THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]>[] = [];
    shapesRef.current = shapes;
    
    // Create a diverse mix of shapes
    for (let i = 0; i < 10; i++) {
      // Random position in 3D space
      const distance = 10 + Math.random() * 20;
      const angle = Math.random() * Math.PI * 2;
      const height = Math.random() * 20 - 10;
      
      const x = Math.cos(angle) * distance;
      const y = height;
      const z = Math.sin(angle) * distance;
      
      // Different shape types
      let geometry: THREE.BufferGeometry;
      const shapeType = Math.floor(Math.random() * 5);
      
      switch (shapeType) {
        case 0: // Cube
          geometry = new THREE.BoxGeometry(
            1.5 + Math.random() * 2,
            1.5 + Math.random() * 2,
            1.5 + Math.random() * 2
          );
          break;
        case 1: // Sphere
          geometry = new THREE.SphereGeometry(
            1.2 + Math.random() * 1.5,
            16, 16
          );
          break;
        case 2: // Cone
          geometry = new THREE.ConeGeometry(
            1.2 + Math.random() * 1.5,
            3 + Math.random() * 3,
            16
          );
          break;
        case 3: // Tetrahedron
          geometry = new THREE.TetrahedronGeometry(
            1.5 + Math.random() * 1.5
          );
          break;
        case 4: // Torus
          geometry = new THREE.TorusGeometry(
            1.5 + Math.random() * 1.2,
            0.4 + Math.random() * 0.3,
            16, 32
          );
          break;
        default: // Fallback to cube
          geometry = new THREE.BoxGeometry(
            1.5 + Math.random() * 2,
            1.5 + Math.random() * 2,
            1.5 + Math.random() * 2
          );
      }
      
      // Colorful materials with glow
      const colorIndex = i % POP_ART_COLORS.length;
      const colorHex = POP_ART_COLORS[colorIndex];
      const color = parseInt(colorHex.replace('#', '0x'));
      
      // Random material type
      const materialType = Math.floor(Math.random() * 3);
      let material: THREE.Material;
      
      switch (materialType) {
        case 0: // Shiny
          material = new THREE.MeshPhongMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.3,
            shininess: 100,
            specular: 0xffffff
          });
          break;
        case 1: // Wireframe
          material = new THREE.MeshBasicMaterial({
            color: color,
            wireframe: true
          });
          break;
        case 2: // Glassy
          material = new THREE.MeshPhongMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.2,
            shininess: 100,
            transparent: true,
            opacity: 0.7
          });
          break;
        default: // Fallback to basic material
          material = new THREE.MeshBasicMaterial({
            color: color
          });
      }
      
      // Create mesh
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.rotation.set(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      );
      
      mesh.userData = {
        rotationSpeed: {
          x: (Math.random() - 0.5) * 0.005, 
          y: (Math.random() - 0.5) * 0.005,
          z: (Math.random() - 0.5) * 0.005  
        },
        floatSpeed: 0.2 + Math.random() * 0.5,
        floatOffset: Math.random() * Math.PI * 2,
        originalY: y // Store the original y position
      } as ShapeUserData;
      
      scene.add(mesh);
      shapes.push(mesh);
    }
    
    // Add some rods/lines
    for (let i = 0; i < 10; i++) {
      const colorIndex = i % POP_ART_COLORS.length;
      const colorHex = POP_ART_COLORS[colorIndex];
      const color = parseInt(colorHex.replace('#', '0x'));
      
      const height = 5 + Math.random() * 10;
      const geometry = new THREE.CylinderGeometry(0.1, 0.1, height, 8);
      
      const material = new THREE.MeshPhongMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.3,
        shininess: 50
      });
      
      const cylinder = new THREE.Mesh(geometry, material);
      
      // Position in 3D space
      const distance = 15 + Math.random() * 15;
      const angle = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * 15;
      
      cylinder.position.set(
        Math.cos(angle) * distance,
        y,
        Math.sin(angle) * distance
      );
      
      // Random rotation
      cylinder.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      
      // INCREASED ROTATION AND ANIMATION SPEEDS by 3x
      cylinder.userData = {
        rotationSpeed: {
          x: (Math.random() - 0.5) * 0.001, // Increased from 0.01
          y: (Math.random() - 0.5) * 0.001, // Increased from 0.01
          z: (Math.random() - 0.5) * 0.001  // Increased from 0.01
        },
        floatSpeed: 0.05 + Math.random() * 0.1, // Increased from 0.1-0.3 range
        floatOffset: Math.random() * Math.PI * 2,
        originalY: y // Store the original y position
      } as ShapeUserData;
      
      scene.add(cylinder);
      shapes.push(cylinder);
    }
    
    // Animation loop
    const animate = (): void => {
      if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;
      
      const time = Date.now() * 0.001; // Current time in seconds
      
      // Animate all shapes
      shapesRef.current.forEach(shape => {
        if (!shape) return;
        
        // Rotate objects
        const userData = shape.userData as ShapeUserData;
        const { rotationSpeed, floatSpeed, floatOffset, originalY } = userData;
        
        shape.rotation.x += rotationSpeed.x;
        shape.rotation.y += rotationSpeed.y;
        shape.rotation.z += rotationSpeed.z;
        
        // Add more pronounced floating motion
        shape.position.y = originalY + Math.sin(time + floatOffset) * floatSpeed * 3;
      });
      
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
      if (shapesRef.current && shapesRef.current.length) {
        shapesRef.current.forEach(shape => {
          if (!shape) return;
          
          if (shape.geometry) shape.geometry.dispose();
          
          if (Array.isArray(shape.material)) {
            shape.material.forEach(material => {
              if (material) material.dispose();
            });
          } else if (shape.material) {
            shape.material.dispose();
          }
        });
      }
      
      // Clear references
      shapesRef.current = [];
      sceneRef.current = null;
      rendererRef.current = null;
      cameraRef.current = null;
    };
  }, []);
  
  return <div ref={mountRef} className="fixed inset-0 z-0 pointer-events-none" />;
}