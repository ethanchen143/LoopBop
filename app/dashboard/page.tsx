"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { X, Music, Trophy, Search, Home } from 'lucide-react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// Define interfaces
interface UserData {
  email: string;
  exercises_count: number;
  correct_count: number;
  rank?: number;
}

interface LeaderboardEntry {
  email: string;
  exercises_count: number;
  accuracy: number;
}

interface GenreNode {
  id: string;
  name: string;
  color: string;
  position: [number, number, number];
}

declare global {
  interface Window {
    genreCards: THREE.Object3D[];
    isOrbiting: boolean;
    orbitAnimationId: number;
  }
}

interface SongNode {
  id: string;
  title: string;
  artist: string;
  album?: string;
  albumPic?: string;
  youtube?: string;
  genres: string[];
  position: [number, number, number];
}

interface SongDetails {
  name?: string;
  title?: string;
  artist?: string;
  album?: string;
  pic?: string;
  youtube?: string;
  youtubeId?: string;
  genres?: string[];
}

interface SongData {
  name?: string;
  artist?: string;
  album?: string;
  pic?: string;
  youtube?: string;
  genres?: string[];
}

// Color palette for pop art aesthetic
const POP_ART_COLORS = [
  '#FF2B5B', // Hot pink
  '#FF3864', // Coral red
  '#FF5F5F', // Salmon
  '#FFC700', // Bright yellow
  '#39FF14', // Neon green
  '#00FFFF', // Cyan
  '#36DBFF', // Bright blue
  '#3772FF', // Royal blue
  '#AD00FF', // Purple
  '#F222FF', // Magenta
  '#FF00D4', // Hot magenta
];

// Define a global type for window to handle custom properties
declare global {
  interface Window {
    floatingAnimations: number[];
  }
}

// Main component
export default function DashboardPage() {
  const router = useRouter();

  // State variables
  const [userData, setUserData] = useState<UserData>({
    email: "",
    exercises_count: 0,
    correct_count: 0,
  });

  const [practiceMode, setPracticeMode] = useState('easy');

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentView, setCurrentView] = useState<"genres" | "songs" | "related">("genres");
  const [selectedSong, setSelectedSong] = useState<string | null>(null);
  const [songs, setSongs] = useState<SongNode[]>([]);
  const [mainGenres, setMainGenres] = useState<{id: string, name: string, color: string}[]>([]);
  const [songDetails, setSongDetails] = useState<SongDetails | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showExplore, setShowExplore] = useState(false);

  // Canvas refs
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // Window reference for animations
  useEffect(() => {
    // this does nothing, just to satisfy unused variable requirement
    if (typeof window !== 'undefined' && !window.floatingAnimations) {
      window.floatingAnimations = [];
    }
  }, []);

  const extractYoutubeId = (url: string) => {
    if (!url) return null;
    
    // Handle various YouTube URL formats
    const patterns = [
      /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^\/\?\&]+)/i,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^\/\?\&]+)/i,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([^\/\?\&]+)/i,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/v\/([^\/\?\&]+)/i
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1] && match[1].length === 11) {
        return match[1];
      }
    }
    
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2] && match[2].length === 11) ? match[2] : null;
  };

  // Fetch main genres
  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        
        const response = await fetch("/api/journey?mode=main", {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.results && Array.isArray(data.results)) {
            // Map the results to include pop art colors and IDs
            const genresWithColors = data.results.map((genre: { name: string }, index: number) => ({
              id: index.toString(),
              name: genre.name,
              color: POP_ART_COLORS[index % POP_ART_COLORS.length]
            }));
            setMainGenres(genresWithColors);
          }
        }
      } catch (error) {
        console.error("Error fetching genres:", error);
      }
    };
    
    fetchGenres();
  }, []);

  // Fetch user data and leaderboard
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          router.push("/auth");
          return;
        }

        const [userResponse, leaderboardResponse] = await Promise.all([
          fetch("/api/user", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("/api/leaderboard", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (userResponse.ok && leaderboardResponse.ok) {
          const userData = await userResponse.json();
          const leaderboardData = await leaderboardResponse.json();
          setUserData(userData);
          setLeaderboard(leaderboardData);
          setLoading(false);
        } else {
          setError("Failed to fetch data");
          setLoading(false);
          router.push("/auth");
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("An unexpected error occurred");
        setLoading(false);
      }
    };
    fetchData();
  }, [router]);

  const MAIN_VIEW_CAMERA_POSITION = new THREE.Vector3(0, 15, 25);

  // Initialize 3D scene with abstract pop art aesthetic
  useEffect(() => {
    if (!mountRef.current || loading || mainGenres.length === 0) return;

    // Initialize the scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x121212); // Dark background for contrast
    sceneRef.current = scene;

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0, 10, 10);
    scene.add(directionalLight);

    // Add point lights with pop art colors for vibrant atmosphere
    POP_ART_COLORS.forEach((colorHex, i) => {
      const color = parseInt(colorHex.replace('#', '0x'));
      const pointLight = new THREE.PointLight(color, 1, 50);
      pointLight.position.set(
        Math.sin(i / 6 * Math.PI * 2) * 20,
        Math.cos(i / 6 * Math.PI * 2) * 5 + 5,
        Math.cos(i / 6 * Math.PI * 2) * 20
      );
      scene.add(pointLight);
    });

    // Create abstract backrooms-like grid effect
    createInfiniteGridPattern(scene);

    // Camera setup
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.copy(MAIN_VIEW_CAMERA_POSITION);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls for camera
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 5;
    controls.maxDistance = 60;
    controlsRef.current = controls;

    // Create abstract central hub element
    createCentralHub(scene);

    // Create genre nodes as abstract geometric shapes
    const newGenres: GenreNode[] = [];
    const radius = 12; // Larger radius for more spread out arrangement
    mainGenres.forEach((genre, index) => {
      const angle = (index / mainGenres.length) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      
      newGenres.push({
        id: genre.id,
        name: genre.name,
        color: genre.color,
        position: [x, 0, z] // Place at various heights for 3D effect
      });
    });

    // Create genre abstract shapes
    newGenres.forEach(genre => {
      createPopArtGenreCard(scene, genre);
    });

    // Create floating abstract shapes in the background
    createFloatingBackgroundShapes(scene);

    // Animation loop
    const animate = () => {
      if (controlsRef.current) controlsRef.current.update();
      
      // Simplified rotation for genre cards only
      scene.traverse((object) => {
        if (object.userData && object.userData.type === 'genre') {
          // Simple clockwise rotation around center
          const radius = 8; // Fixed radius
          const rotationSpeed = 0.0001; // Much slower rotation speed
          
          // Calculate base angle from current position
          let currentAngle = Math.atan2(object.position.z, object.position.x);
          
          // Update angle (subtract for clockwise rotation)
          currentAngle -= rotationSpeed * 5; // Adjust multiplier to control speed
          
          // Set new position
          object.position.x = Math.cos(currentAngle) * radius;
          object.position.z = Math.sin(currentAngle) * radius;
          
          // Make card face center
          object.lookAt(0, object.position.y, 0);
        }
      });
      
      // Animate all abstract shapes
      scene.children.forEach((child: THREE.Object3D) => {
        if (child.userData && child.userData.type === 'abstractShape') {
          child.rotation.x += 0.001;
          child.rotation.y += 0.002;
        }
        
        if (child.userData && child.userData.type === 'genre') {
          if (child instanceof THREE.Group) {
            // Keep the floating and color pulsing effects only
            child.children.forEach((element, i) => {
              if (element instanceof THREE.Mesh) {
                element.position.y = Math.sin(Date.now() * 0.001 + i * 0.5) * 0.2;
                
                // Pulse colors
                if (element.material instanceof THREE.MeshPhongMaterial) {
                  const hue = (Date.now() * 0.0002 + i * 0.1) % 1;
                  const color = new THREE.Color().setHSL(hue, 0.8, 0.6);
                  element.material.emissive.copy(color);
                  element.material.emissiveIntensity = 0.3 + Math.sin(Date.now() * 0.002 + i) * 0.1;
                }
              }
            });
          }
        }
        
        // Rotate and animate central hub
        if (child.userData && child.userData.type === 'centralHub') {
          child.rotation.y += 0.005;
          
          // If it has children elements, animate them
          child.children.forEach((element, i) => {
            if (element instanceof THREE.Mesh) {
              element.rotation.z += 0.01;
              element.rotation.x += 0.005;
              
              // Scale pulsing
              const scale = 1 + 0.1 * Math.sin(Date.now() * 0.002 + i);
              element.scale.set(scale, scale, scale);
            }
          });
        }
      });
      
      renderer.render(scene, camera);
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);

    // Handle window resize
    const handleResize = () => {
      if (!mountRef.current) return;
      
      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;
      
      if (cameraRef.current && rendererRef.current) {
        cameraRef.current.aspect = width / height;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(width, height);
      }
    };
    
    window.addEventListener('resize', handleResize);

    // Cleanup function
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      if (rendererRef.current && rendererRef.current.domElement) {
        if (mountRef.current) {
          mountRef.current.removeChild(rendererRef.current.domElement);
        }
      }
      
      window.removeEventListener('resize', handleResize);
      
      // Dispose of geometries, materials, textures
      scene.traverse((object: THREE.Object3D) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          
          if (object.material instanceof THREE.Material) {
            object.material.dispose();
          } else if (Array.isArray(object.material)) {
            object.material.forEach((material: THREE.Material) => material.dispose());
          }
        }
      });
    };
  }, [loading, mainGenres]);

  // Create infinite grid pattern for backrooms-like effect
  const createInfiniteGridPattern = (scene: THREE.Scene) => {
    // Create grid material with glow effect
    const gridMaterial = new THREE.LineBasicMaterial({
      color: 0x00FFFF, // Cyan
      transparent: true,
      opacity: 0.3
    });

    // Create horizontal grid
    const gridSize = 100;
    const gridDivisions = 20;
    const gridStep = gridSize / gridDivisions;


    // Ground grid - moved much lower (-20 instead of 0)
    for (let i = -gridDivisions/2; i <= gridDivisions/2; i++) {
      const lineGeometry = new THREE.BufferGeometry();
      const points = [
        new THREE.Vector3(-gridSize/2, -20, i * gridStep),
        new THREE.Vector3(gridSize/2, -20, i * gridStep)
      ];
      lineGeometry.setFromPoints(points);
      const line = new THREE.Line(lineGeometry, gridMaterial);
      line.userData = { type: 'gridLine' };
      scene.add(line);
    }

    for (let i = -gridDivisions/2; i <= gridDivisions/2; i++) {
      const lineGeometry = new THREE.BufferGeometry();
      const points = [
        new THREE.Vector3(i * gridStep, -20, -gridSize/2),
        new THREE.Vector3(i * gridStep, -20, gridSize/2)
      ];
      lineGeometry.setFromPoints(points);
      const line = new THREE.Line(lineGeometry, gridMaterial);
      line.userData = { type: 'gridLine' };
      scene.add(line);
    }

    // Create a second grid at a different angle for depth
    const gridGroup2 = new THREE.Group();
    
    // Create horizontal grid lines
    for (let i = -gridDivisions/2; i <= gridDivisions/2; i++) {
      const lineGeometry = new THREE.BufferGeometry();
      const points = [
        new THREE.Vector3(-gridSize/2, i * gridStep, -gridSize/2),
        new THREE.Vector3(gridSize/2, i * gridStep, -gridSize/2)
      ];
      lineGeometry.setFromPoints(points);
      const line = new THREE.Line(lineGeometry, gridMaterial.clone());
      gridGroup2.add(line);
    }

    // Create vertical grid lines
    for (let i = -gridDivisions/2; i <= gridDivisions/2; i++) {
      const lineGeometry = new THREE.BufferGeometry();
      const points = [
        new THREE.Vector3(i * gridStep, -gridSize/2, -gridSize/2),
        new THREE.Vector3(i * gridStep, gridSize/2, -gridSize/2)
      ];
      lineGeometry.setFromPoints(points);
      const line = new THREE.Line(lineGeometry, gridMaterial.clone());
      gridGroup2.add(line);
    }
    
    gridGroup2.rotation.x = Math.PI / 2;
    gridGroup2.position.z = -gridSize/2;
    gridGroup2.userData = { type: 'gridLine' };
    scene.add(gridGroup2);
    
    // Create a grid on the ceiling
    const gridGroup3 = new THREE.Group();
    
    // Create horizontal grid lines
    for (let i = -gridDivisions/2; i <= gridDivisions/2; i++) {
      const lineGeometry = new THREE.BufferGeometry();
      const points = [
        new THREE.Vector3(-gridSize/2, gridSize/2, i * gridStep),
        new THREE.Vector3(gridSize/2, gridSize/2, i * gridStep)
      ];
      lineGeometry.setFromPoints(points);
      const line = new THREE.Line(lineGeometry, gridMaterial.clone());
      gridGroup3.add(line);
    }

    // Create vertical grid lines
    for (let i = -gridDivisions/2; i <= gridDivisions/2; i++) {
      const lineGeometry = new THREE.BufferGeometry();
      const points = [
        new THREE.Vector3(i * gridStep, gridSize/2, -gridSize/2),
        new THREE.Vector3(i * gridStep, gridSize/2, gridSize/2)
      ];
      lineGeometry.setFromPoints(points);
      const line = new THREE.Line(lineGeometry, gridMaterial.clone());
      gridGroup3.add(line);
    }
    
    gridGroup3.userData = { type: 'gridLine' };
    scene.add(gridGroup3);
  };

  // Create abstract shape for central hub
  const createCentralHub = (scene: THREE.Scene) => {
    const hubGroup = new THREE.Group();
    hubGroup.userData = { type: 'centralHub' };
    
    // Create a large torus as the centerpiece
    const torusGeometry = new THREE.TorusGeometry(3, 1, 16, 100);
    const torusMaterial = new THREE.MeshPhongMaterial({
      color: 0xFF00FF,
      emissive: 0xFF00FF,
      emissiveIntensity: 0.3,
      shininess: 100
    });
    const torus = new THREE.Mesh(torusGeometry, torusMaterial);
    torus.rotation.x = Math.PI / 2;
    hubGroup.add(torus);
    
    // Add intersecting torus at different angle
    const torus2 = torus.clone();
    torus2.rotation.x = 0;
    torus2.rotation.y = Math.PI / 2;
    torus2.material = new THREE.MeshPhongMaterial({
      color: 0x00FFFF,
      emissive: 0x00FFFF,
      emissiveIntensity: 0.3,
      shininess: 100
    });
    hubGroup.add(torus2);
    
    // Add sphere in the center
    const sphereGeometry = new THREE.SphereGeometry(2, 32, 32);
    const sphereMaterial = new THREE.MeshPhongMaterial({
      color: 0xFFFFFF,
      emissive: 0xFFFFFF,
      emissiveIntensity: 0.5,
      shininess: 100
    });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    hubGroup.add(sphere);
    
    // Add the hub to the scene
    scene.add(hubGroup);
    
    // Create pulsing light at the center
    const pulsingLight = new THREE.PointLight(0xFFFFFF, 1, 20);
    pulsingLight.position.set(0, 0, 0);
    pulsingLight.userData = { type: 'hubLight', intensity: 1 };
    scene.add(pulsingLight);
  };

  // Create pop art genre cards
  const createPopArtGenreCard = (scene: THREE.Scene, genre: GenreNode) => {
    const [x, y, z] = genre.position;
    const index = parseInt(genre.id) || 0; // Use id for color selection
    
    // Calculate angle and radius for circular positioning
    const radius = Math.sqrt(x*x + z*z); // Get distance from center
    const angle = Math.atan2(z, x); // Get current angle
    
    // Create a group to hold the genre elements
    const genreGroup = new THREE.Group();
    genreGroup.position.set(x, y, z);
    genreGroup.userData = { 
      type: 'genre', 
      id: genre.id, 
      name: genre.name,
      angle: angle, // Store angle for animation
      radius: radius // Store radius for animation
    };
    
    // Create billboard card
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 384;

    if (context) {
      // Vibrant pop art background
      const colorIndex = index % POP_ART_COLORS.length;
      const mainColor = POP_ART_COLORS[colorIndex];
      context.fillStyle = mainColor;
      context.fillRect(0, 0, 512, 384);
      
      // Add halftone pattern
      context.fillStyle = 'rgba(255, 255, 255, 0.3)';
      const dotSize = 12;
      const dotSpacing = 24;
      
      for (let dotX = 0; dotX < 512; dotX += dotSpacing) {
        for (let dotY = 0; dotY < 384; dotY += dotSpacing) {
          if ((dotX + dotY) % 48 < 24) {
            context.beginPath();
            context.arc(dotX, dotY, dotSize, 0, Math.PI * 2);
            context.fill();
          }
        }
      }
      
      // Add bold border
      context.strokeStyle = '#FFFFFF';
      context.lineWidth = 10;
      context.strokeRect(10, 10, 492, 364);
      
      // IMPROVED TEXT VISIBILITY
      // First add black outline for contrast
      context.strokeStyle = '#000000';
      context.lineWidth = 15;
      context.font = 'bold 90px Impact'; // Larger text
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      
      // Handle long genre names
      const displayGenre = genre.name.length > 15 ? 
        genre.name.substring(0, 12) + "..." : 
        genre.name;
      
      // Draw text outline first
      context.strokeText(displayGenre.toUpperCase(), 256, 160);
      
      // Then fill with bright yellow for much better visibility
      context.fillStyle = '#FFFFFF'; // Yellow instead of white
      context.fillText(displayGenre.toUpperCase(), 256, 160);
      
      // Add "GENRE" subtitle for extra pop art style
      context.font = 'bold 40px Impact';
      context.strokeStyle = '#000000';
      context.lineWidth = 8;
      context.strokeText("GENRE", 256, 240);
      context.fillStyle = '#FFFFFF';
      context.fillText("GENRE", 256, 240);
      
      const texture = new THREE.CanvasTexture(canvas);
      const cardMaterial = new THREE.SpriteMaterial({ map: texture });
      const card = new THREE.Sprite(cardMaterial);
      card.scale.set(6, 4.5, 1);
      
      // Set user data
      card.userData = {
        type: 'genre',
        id: genre.id,
        name: genre.name
      };
      
      genreGroup.add(card);
    }
    
    // Make the card face the center (0,0,0)
    genreGroup.lookAt(0, 0, 0);
    
    // Add the genre group to the scene
    scene.add(genreGroup);
    
    // Add a point light with genre color
    const color = parseInt(genre.color.replace('#', '0x'));
    const light = new THREE.PointLight(color, 1, 10);
    light.position.set(x, y + 1, z);
    light.userData = { 
      type: 'genreLight',
      genreId: genre.id, // Reference to its genre for animation
      angle: angle,
      radius: radius
    };
    scene.add(light);
  };

  // Create floating background shapes for visual interest
  const createFloatingBackgroundShapes = (scene: THREE.Scene) => {
    // Create 30+ random floating shapes in the background
    for (let i = 0; i < 30; i++) {
      // Random position far from center
      const distance = 30 + Math.random() * 60;
      const angle = Math.random() * Math.PI * 2;
      const height = Math.random() * 40;
      
      const x = Math.cos(angle) * distance;
      const y = height;
      const z = Math.sin(angle) * distance;
      
      // Random abstract shape
      let geometry;
      const shapeType = Math.floor(Math.random() * 5);
      
      switch (shapeType) {
        case 0:
            geometry = new THREE.BoxGeometry(
                1.5 + Math.random() * 3,  // Was 1 + Math.random() * 2
                1.5 + Math.random() * 3,  // Was 1 + Math.random() * 2
                1.5 + Math.random() * 3   // Was 1 + Math.random() * 2
            );
            break;
        case 1:
            geometry = new THREE.SphereGeometry(
                1.2 + Math.random() * 2.25,  // Was 0.8 + Math.random() * 1.5
                Math.floor(3 + Math.random() * 8),
                Math.floor(2 + Math.random() * 8)
            );
            break;
        case 2:
            geometry = new THREE.ConeGeometry(
                1.2 + Math.random() * 1.8,  // Was 0.8 + Math.random() * 1.2
                3 + Math.random() * 4.5,    // Was 2 + Math.random() * 3
                Math.floor(3 + Math.random() * 5)
            );
            break;
        case 3:
            geometry = new THREE.TetrahedronGeometry(
                1.5 + Math.random() * 2.25  // Was 1 + Math.random() * 1.5
            );
            break;
        case 4:
            geometry = new THREE.TorusGeometry(
                1.5 + Math.random() * 2.25,  // Was 1 + Math.random() * 1.5
                0.45 + Math.random() * 0.75, // Was 0.3 + Math.random() * 0.5
                Math.floor(4 + Math.random() * 12),
                Math.floor(4 + Math.random() * 8)
            );
            break;
    }
      
      // Random pop art color
      const color = parseInt(POP_ART_COLORS[Math.floor(Math.random() * POP_ART_COLORS.length)].replace('#', '0x'));
      
      // Create material - alternate between solid, wireframe, and glossy
      let material;
      const materialType = Math.floor(Math.random() * 3);
      
      switch (materialType) {
        case 0: // Solid
          material = new THREE.MeshPhongMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.2,
            shininess: 30
          });
          break;
        case 1: // Wireframe
          material = new THREE.MeshBasicMaterial({
            color: color,
            wireframe: true
          });
          break;
        case 2: // Glossy
          material = new THREE.MeshPhongMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.3,
            shininess: 100,
            transparent: true,
            opacity: 0.8
          });
          break;
      }
      
      const shape = new THREE.Mesh(geometry, material);
      shape.position.set(x, y, z);
      shape.rotation.set(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      );
      shape.userData = { type: 'abstractShape' };
      scene.add(shape);
    }
    
    // Add some linear elements (rods)
    for (let i = 0; i < 10; i++) {
      const distance = 50 + Math.random() * 50;
      const angle = Math.random() * Math.PI * 2;
      const height = (Math.random() - 0.5) * 40;
      
      const x = Math.cos(angle) * distance;
      const y = height;
      const z = Math.sin(angle) * distance;
      
      const length = 5 + Math.random() * 15;
      const width = 0.1 + Math.random() * 0.3;
      
      const rodGeometry = new THREE.CylinderGeometry(width, width, length, 6);
      const color = parseInt(POP_ART_COLORS[Math.floor(Math.random() * POP_ART_COLORS.length)].replace('#', '0x'));
      
      const rodMaterial = new THREE.MeshPhongMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.3,
        shininess: 30
      });
      
      const rod = new THREE.Mesh(rodGeometry, rodMaterial);
      rod.position.set(x, y, z);
      rod.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      rod.userData = { type: 'abstractShape' };
      scene.add(rod);
    }
    
    // Add some flat planes
    for (let i = 0; i < 10; i++) {
      const distance = 50 + Math.random() * 50;
      const angle = Math.random() * Math.PI * 2;
      const height = (Math.random() - 0.5) * 30;
      
      const x = Math.cos(angle) * distance;
      const y = height;
      const z = Math.sin(angle) * distance;
      
      const size = 2 + Math.random() * 4;
      
      const planeGeometry = new THREE.PlaneGeometry(size, size);
      const color = parseInt(POP_ART_COLORS[Math.floor(Math.random() * POP_ART_COLORS.length)].replace('#', '0x'));
      
      const planeMaterial = new THREE.MeshBasicMaterial({
        color: color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7
      });
      
      const plane = new THREE.Mesh(planeGeometry, planeMaterial);
      plane.position.set(x, y, z);
      plane.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      plane.userData = { type: 'abstractShape' };
      scene.add(plane);
    }
  };

  const returnToMainView = () => {
    // Close any open song details
    setSongDetails(null);
    
    // Clean up the scene thoroughly
    clearSceneForViewTransition("genres");
    
    // Set current view back to genres
    setCurrentView("genres");
    setSelectedSong(null);
    
    // Disable controls during transition to prevent interference
    if (controlsRef.current) {
      controlsRef.current.enabled = false;
    }
    
    // Start camera animation BEFORE fetching data
    const animateCamera = () => {
      if (!cameraRef.current) {
        // If no camera, just fetch and return
        fetchGenresAndCreateScene();
        return;
      }
      
      const startPosition = cameraRef.current.position.clone();
      const targetPosition = MAIN_VIEW_CAMERA_POSITION;
      
      // Create a smooth animation
      const startTime = Date.now();
      const duration = 1500; // Longer for smoother transition
      
      const updateCamera = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Smooth easing
        const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);
        const easedProgress = easeOutCubic(progress);
        
        if (cameraRef.current) {
          cameraRef.current.position.lerpVectors(startPosition, targetPosition, easedProgress);
          cameraRef.current.lookAt(0, 0, 0);
          
          if (progress < 1) {
            // Continue animation
            animationFrameRef.current = requestAnimationFrame(updateCamera);
          } else {
            // Animation complete - NOW fetch genres and rebuild scene
            if (controlsRef.current) {
              controlsRef.current.enabled = true;
              controlsRef.current.update();
            }
            fetchGenresAndCreateScene();
          }
        }
      };
      // Start animation
      updateCamera();
    };
    


    const fetchGenresAndCreateScene = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        
        const response = await fetch("/api/journey?mode=main", {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.results && Array.isArray(data.results)) {
            // Map the results to include pop art colors and IDs
            const genresWithColors = data.results.map((genre:GenreNode, index:number) => ({
              id: index.toString(),
              name: genre.name,
              color: POP_ART_COLORS[index % POP_ART_COLORS.length]
            }));
            
            // Update state which will trigger scene rebuild
            setMainGenres(genresWithColors);
          }
        }
      } catch (error) {
        console.error("Error fetching genres:", error);
      }
    };
    
    // Start the process with camera animation
    animateCamera();
  };

  // Create pop art style album art display - simplified, larger version
  const createPopArtAlbumDisplay = (song: SongNode, x: number, y: number, z: number) => {
    if (!sceneRef.current) return;
    
    // Pick a random color for variations
    const backgroundColor = POP_ART_COLORS[Math.floor(Math.random() * POP_ART_COLORS.length)];
    
    // Create a textured plane for the album art with pop art effect
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
      song.albumPic || '',
      // Success callback
      (texture) => {
        // Create a larger frame for the album (increased from 8,8,0.3 to 10,10,0.3)
        const frameGeometry = new THREE.BoxGeometry(10, 10, 0.3);
        const frameMaterial = new THREE.MeshPhongMaterial({
          color: parseInt(backgroundColor.replace('#', '0x')),
          emissive: parseInt(backgroundColor.replace('#', '0x')),
          emissiveIntensity: 0.5,
          shininess: 50
        });
        const frame = new THREE.Mesh(frameGeometry, frameMaterial);
        frame.position.set(x, y + 4, z); // Raised position from y+3 to y+4
        frame.userData = { 
          type: 'song',
          id: song.id,
          title: song.title,
          artist: song.artist,
          youtube: song.youtube
        };
        sceneRef.current?.add(frame);
        
        // Create album art - much larger size (increased from 7.5,7.5,0.5 to 9.5,9.5,0.5)
        const albumGeometry = new THREE.BoxGeometry(9.5, 9.5, 0.5);
        
        const albumMaterial = new THREE.MeshBasicMaterial({
          map: texture,
          side: THREE.DoubleSide
        });
        
        const albumCover = new THREE.Mesh(albumGeometry, albumMaterial);
        albumCover.position.set(x, y + 4, z + 0.3); // Match new height
        albumCover.userData = {
          type: 'song',
          id: song.id,
          title: song.title,
          artist: song.artist,
          youtube: song.youtube
        };
        sceneRef.current?.add(albumCover);
        
        // Add only album title and artist text directly on the frame
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 1024;
        canvas.height = 256;
        
        if (context) {
          // Simple gradient background
          const gradient = context.createLinearGradient(0, 0, 1024, 0);
          gradient.addColorStop(0, backgroundColor);
          gradient.addColorStop(1, backgroundColor);
          
          context.fillStyle = gradient;
          context.fillRect(0, 0, 1024, 256);
        }
        
        // Add subtle floating animation
        const animateAlbum = () => {
          if (!albumCover) return;
          
          // Gentle floating
          albumCover.position.y = y + 4 + Math.sin(Date.now() * 0.0005) * 0.3;
          
          // Subtle rotation
          albumCover.rotation.y = Math.sin(Date.now() * 0.0002) * 0.1;
          
          // Move frame with album
          if (frame) {
            frame.position.y = albumCover.position.y;
            frame.rotation.y = albumCover.rotation.y;
          }
          
          const id: number = window.setTimeout(animateAlbum, 16);
          if (typeof window !== 'undefined') {
            if (!window.floatingAnimations) window.floatingAnimations = [];
            window.floatingAnimations.push(id);
          }
        };
        
        animateAlbum();
      },
      // Error handling
      undefined,
      (error) => {
        console.error('Error loading album art:', error);
      }
    );
  };
  // Animate camera to pop art songs view
  // Update the animateCameraToSongsView function to accept custom Z position

  const ALBUM_VIEW_TARGET_POSITION = new THREE.Vector3(0, 0, 40);
  const animateCameraToSongsView = () => {
    if (!cameraRef.current) return;
    
    // Save original position for animation
    const startPosition = cameraRef.current.position.clone();
    
    // Define a new position for viewing songs - higher up for better view
    const targetPosition = ALBUM_VIEW_TARGET_POSITION;
    
    // Create a smooth animation
    const animateCamera = () => {
      const startTime = Date.now();
      const duration = 1500; // 1.5 seconds
      
      const updateCamera = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Use a nice easing function
        const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);
        const easedProgress = easeOutCubic(progress);
        
        if (cameraRef.current) {
          // Interpolate position
          cameraRef.current.position.lerpVectors(startPosition, targetPosition, easedProgress);
          
          // Keep looking at the center
          cameraRef.current.lookAt(0, 0, 0);
          
          if (progress < 1) {
            requestAnimationFrame(updateCamera);
          }
        }
      };
      updateCamera();
    };
    // Start the animation
    animateCamera();
  };

  // Create pop art songs scene
  const createPopArtSongsScene = (songNodes: SongNode[], genreName: string) => {
    if (!sceneRef.current) return;
    
    console.log(`Creating pop art songs scene for ${songNodes.length} songs in genre ${genreName}`);
    
    // First remove all existing objects except grid lines and background elements
    const objectsToRemove: THREE.Object3D[] = [];
    sceneRef.current.traverse((object) => {
      if (object.userData && 
          (object.userData.type === 'genre' || 
           object.userData.type === 'song' || 
           object.userData.type === 'songStage' || 
           object.userData.type === 'relatedGenre' ||
           object.userData.type === 'backButton' ||
           object.userData.type === 'centralHub')) { 
        objectsToRemove.push(object);
      }
    });
    
    // Remove objects
    objectsToRemove.forEach(obj => {
      sceneRef.current?.remove(obj);
      if (obj instanceof THREE.Mesh) {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach(mat => mat.dispose());
          } else {
            obj.material.dispose();
          }
        }
      }
    });
    
    // Add genre title with pop art styling
    const titleCanvas = document.createElement('canvas');
    const titleContext = titleCanvas.getContext('2d');
    titleCanvas.width = 2048;
    titleCanvas.height = 512;
    
    if (titleContext) {
      // Create a bold pop art background
      const backgroundColor = POP_ART_COLORS[Math.floor(Math.random() * POP_ART_COLORS.length)];
      titleContext.fillStyle = backgroundColor;
      titleContext.fillRect(0, 0, 2048, 512);
      
      // Create comic style halftone effect
      titleContext.fillStyle = 'rgba(255, 255, 255, 0.5)';
      const dotSize = 20;
      const dotSpacing = 40;
      
      for (let x = 0; x < 2048; x += dotSpacing) {
        for (let y = 0; y < 512; y += dotSpacing) {
          if ((x + y) % 80 < 40) {
            titleContext.beginPath();
            titleContext.arc(x, y, dotSize, 0, Math.PI * 2);
            titleContext.fill();
          }
        }
      }
      
      // Add border
      titleContext.strokeStyle = '#000000';
      titleContext.lineWidth = 20;
      titleContext.strokeRect(20, 20, 2008, 472);
      
      // Add genre name in pop art typography
      titleContext.fillStyle = '#000000';
      titleContext.font = 'bold 150px Impact, Charcoal, sans-serif';
      titleContext.textAlign = 'center';
      titleContext.textBaseline = 'middle';
      titleContext.fillText(genreName.toUpperCase(), 1024, 180);
      
      // Add shadow for 3D effect
      titleContext.shadowColor = 'rgba(0, 0, 0, 0.7)';
      titleContext.shadowBlur = 10;
      titleContext.shadowOffsetX = 10;
      titleContext.shadowOffsetY = 10;
      
      // Add "SONGS" text
      titleContext.fillStyle = POP_ART_COLORS[(POP_ART_COLORS.indexOf(backgroundColor) + 6) % POP_ART_COLORS.length];
      titleContext.font = 'bold 120px Impact, Charcoal, sans-serif';
      titleContext.fillText('SONGS', 1024, 320);
      
      // Remove shadow
      titleContext.shadowColor = 'transparent';
      
      // Create explosion shapes
      titleContext.beginPath();
      for (let i = 0; i < 16; i++) {
        const angle = (i / 16) * Math.PI * 2;
        const innerRadius = 220;
        const outerRadius = 280;
        
        const x1 = 1024 + Math.cos(angle) * innerRadius;
        const y1 = 250 + Math.sin(angle) * innerRadius;
        const x2 = 1024 + Math.cos(angle + 0.2) * outerRadius;
        const y2 = 250 + Math.sin(angle + 0.2) * outerRadius;
        
        if (i === 0) {
          titleContext.moveTo(x1, y1);
        } else {
          titleContext.lineTo(x1, y1);
        }
        
        titleContext.lineTo(x2, y2);
      }
      
      titleContext.closePath();
      titleContext.strokeStyle = '#000000';
      titleContext.lineWidth = 8;
      titleContext.stroke();
      
      const titleTexture = new THREE.CanvasTexture(titleCanvas);
      const titleMaterial = new THREE.SpriteMaterial({ map: titleTexture });
      const titleLabel = new THREE.Sprite(titleMaterial);
      titleLabel.scale.set(22, 8, 1);
      titleLabel.position.set(0, 15, -5);
      titleLabel.userData = { type: 'songStage' };
      sceneRef.current.add(titleLabel);
    }
    
    // Create back button with pop art styling
    const backButtonCanvas = document.createElement('canvas');
    const backContext = backButtonCanvas.getContext('2d');
    backButtonCanvas.width = 1024;
    backButtonCanvas.height = 256;
    
    if (backContext) {
      // Bold colors for visibility
      const buttonColor = POP_ART_COLORS[Math.floor(Math.random() * POP_ART_COLORS.length)];
      backContext.fillStyle = buttonColor;
      backContext.fillRect(0, 0, 1024, 256);
      
      // Add comic style effect
      backContext.fillStyle = 'rgba(0, 0, 0, 0.2)';
      const stripWidth = 60;
      for (let x = 0; x < 1024; x += stripWidth * 2) {
        backContext.fillRect(x, 0, stripWidth, 256);
      }
      
      // Add border
      backContext.strokeStyle = '#000000';
      backContext.lineWidth = 12;
      backContext.strokeRect(12, 12, 1000, 232);
      
      // Add text with shadow
      backContext.shadowColor = 'rgba(0, 0, 0, 0.7)';
      backContext.shadowBlur = 10;
      backContext.shadowOffsetX = 5;
      backContext.shadowOffsetY = 5;

      backContext.fillStyle = '#FFFFFF';
      backContext.font = 'bold 64px Impact, Charcoal, sans-serif';
      backContext.textAlign = 'center';
      backContext.textBaseline = 'middle';
      backContext.fillText('← BACK TO MAIN GENRES', 512, 128);

      // Remove shadow
      backContext.shadowColor = 'transparent';

      // Add comic-style action marks
      backContext.strokeStyle = '#000000';
      backContext.lineWidth = 4;

      // Action lines on the left side by the arrow
      for (let i = 0; i < 5; i++) {
        backContext.beginPath();
        backContext.moveTo(200 - (i * 15), 50 + (i * 20));
        backContext.lineTo(250 - (i * 10), 80 + (i * 15));
        backContext.stroke();
      }

      const backTexture = new THREE.CanvasTexture(backButtonCanvas);
      const backMaterial = new THREE.SpriteMaterial({ map: backTexture });
      const backButton = new THREE.Sprite(backMaterial);
      backButton.scale.set(18, 5, 2);
      backButton.position.set(0, -10, 20);
      // Apply the right userData for click handling
      backButton.userData = { type: 'backButton', action: 'returnToGenres' };
      sceneRef.current.add(backButton);

      // Add a pulsing effect to the back button
      const pulseBackButton = () => {
        let scale = 1;
        let increasing = true;
        
        const animate = () => {
          if (!backButton) return;
          
          if (increasing) {
            scale += 0.005;
            if (scale >= 1.1) increasing = false;
          } else {
            scale -= 0.005;
            if (scale <= 0.95) increasing = true;
          }
          
          backButton.scale.set(10 * scale, 2.5 * scale, 1);
          
          const id: number = window.setTimeout(animate, 50);
          if (typeof window !== 'undefined') {
            if (!window.floatingAnimations) window.floatingAnimations = [];
            window.floatingAnimations.push(id);
          }
        };
        
        animate();
      };

      pulseBackButton();
      }

      // Place songs in the scene
      // Transform song positions into a more organized row layout
      const songsPerRow = 5; // Display up to 5 songs per row
      const songSpacing = 12; // Wider horizontal spacing
      const rowHeight = 16; // Space between rows
      
      songNodes.forEach((song, index) => {
        // Calculate row and position in row
        const row = Math.floor(index / songsPerRow);
        const posInRow = index % songsPerRow;
        
        // Calculate position with even spacing
        // Center the songs by subtracting half the total width
        const totalWidth = (songsPerRow - 1) * songSpacing;
        const startX = -totalWidth / 2;
        
        const x = startX + (posInRow * songSpacing);
        const y = 0; // Consistent height for all songs in a row
        const z = row * rowHeight; // Space out rows
        
        // Update song position
        song.position = [x, y, z];
        
        // Create the song display
        if (song.albumPic) {
          createPopArtAlbumDisplay(song, x, y, z);
        }
      });
      animateCameraToSongsView();
  };

  // Add this comprehensive cleanup function
  const clearSceneForViewTransition = (targetView:string) => {
    if (!sceneRef.current) return;
    
    console.log(`Clearing scene for transition to: ${targetView}`);
    
    // Define which types to remove based on the target view
    let typesToRemove: string[] = [];
    
    if (targetView === "genres") {
      // When going to genres view, remove everything except background elements
      typesToRemove = ['song', 'songStage', 'youtubeDecoration', 'youtubePreview', 'relatedGenre', 'backButton'];
    } else if (targetView === "songs") {
      // When going to songs view, remove related view and make sure no genre objects remain
      typesToRemove = ['youtubeDecoration', 'youtubePreview', 'relatedGenre', 'centralHub'];
    } else if (targetView === "related") {
      // When going to related view, remove all song objects
      typesToRemove = ['song', 'songStage'];
    }
    
    // Find objects to remove
    const objectsToRemove: THREE.Object3D[] = [];
    sceneRef.current.traverse((object) => {
      if (object.userData && object.userData.type && typesToRemove.includes(object.userData.type)) {
        objectsToRemove.push(object);
      }
    });
    
    // Remove all identified objects and dispose resources
    objectsToRemove.forEach(obj => {
      sceneRef.current?.remove(obj);
      if (obj instanceof THREE.Mesh) {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach(mat => mat.dispose());
          } else {
            obj.material.dispose();
          }
        }
      }
    });
    
    // Also clean up any ongoing animations
    if (typeof window !== 'undefined' && window.floatingAnimations) {
      window.floatingAnimations.forEach(id => clearTimeout(id));
      window.floatingAnimations = [];
    }

    console.log(`Removed ${objectsToRemove.length} objects from scene`);
  };

  const fetchSongsForGenre = async (genreName:string) => {
    try {
      console.log(`Fetching songs for genre: ${genreName}`);
      const token = localStorage.getItem("token");
      if (!token) return;
      
      // Clear scene before fetching or changing view state
      clearSceneForViewTransition("songs");
      
      // Update state
      setCurrentView("songs");
      setSongDetails(null); // Make sure no song details are showing
      
      const response = await fetch(`/api/journey?mode=songs&arg=${encodeURIComponent(genreName)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log("API Response:", data);
        
        if (data.results && data.results.length > 0) {
          // Extract the songs array from the nested response
          let songsList = [];
          
          if (Array.isArray(data.results[0])) {
            songsList = data.results[0];
          } else {
            songsList = data.results;
          }
          
          console.log("Processed songs list:", songsList);
          
          if (songsList.length === 0) {
            console.log("No songs found for this genre");
            return;
          }
          
          // Transform API response into SongNode objects
          const songNodes = songsList.map((song: SongDetails, index:number) => {
            const row = Math.floor(index / 4);
            const col = index % 4;
            const x = (col - 1.5) * 6;
            const z = row * 6;
            
            return {
              id: `song-${index}`,
              title: song.name || "Unknown Title",
              artist: song.artist || "Unknown Artist",
              album: song.album,
              albumPic: song.pic,
              youtube: song.youtube,
              genres: [genreName],
              position: [x, 0, z]
            };
          });
          
          console.log("Created song nodes:", songNodes);
          setSongs(songNodes);
          
          // Create a completely new scene for songs with pop art style
          createPopArtSongsScene(songNodes, genreName);
        } else {
          console.log("No songs found for this genre or unexpected data format");
        }
      }
    } catch (error) {
      console.error("Error fetching songs:", error);
    }
  };

  const fetchSongDetails = async (youtubeUrl:string) => {
    try {
      console.log(`Fetching song details for YouTube: ${youtubeUrl}`);
  
      // Extract YouTube ID from URL
      const youtubeId = extractYoutubeId(youtubeUrl);
      console.log("Extracted YouTube ID:", youtubeId); // Debug log
      
      if (!youtubeId) {
        console.error("Invalid YouTube URL");
        return;
      }
  
      // Clean up the scene first
      clearSceneForViewTransition("related");
      
      // Update state immediately after cleanup
      setCurrentView("related");
      setSelectedSong(youtubeId);
  
      const token = localStorage.getItem("token");
      if (!token) return;
  
      // Set initial song details with YouTube ID to avoid "video unavailable"
      setSongDetails(prev => ({
        ...prev,
        youtube: youtubeUrl,
      }));
  
      // // Create YouTube preview immediately
      // createYoutubePreview(youtubeUrl, null, true);
  
      // Then fetch the actual data
      const response = await fetch(`/api/journey?mode=song&arg=${encodeURIComponent(youtubeUrl)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
  
      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results[0]) {
          const songData = data.results[0];
          console.log("Song data:", songData);
          
          if (!songData.genres || !Array.isArray(songData.genres)) {
            songData.genres = [];
          }
          
          // Always include the extracted youtubeId in the song details
          setSongDetails({
            ...songData,
            youtube: youtubeUrl, // Keep the original URL
          });
          
          // Update YouTube preview with real data
          createYoutubePreview(youtubeUrl, songData as SongData, false);
        }
      } else {
        console.error("Error fetching song details");
        // Fallback with the YouTube ID preserved
        setSongDetails(prev => ({
          ...prev,
          name: selectedSong ? songs.find(s => s.id === selectedSong)?.title : "Unknown",
          artist: selectedSong ? songs.find(s => s.id === selectedSong)?.artist : "Unknown Artist",
          youtube: youtubeUrl,
          youtubeId: youtubeId
        }));
      }
    } catch (error) {
      console.error("Error fetching song details:", error);
    }
  };

  const YOUTUBE_CAMERA_POSITION = new THREE.Vector3(0, 10, 30);

  const createYoutubePreview = (youtubeId: string, songData: SongData, isInitialRender: boolean = false) => {
    if (!sceneRef.current || !cameraRef.current) return;
  
    console.log("Creating YouTube preview for ID:", youtubeId);
  
    // We'll skip the scene cleanup for initial render since it's handled by fetchSongDetails
    // Only do cleanup when updating an existing preview
    if (!isInitialRender) {
      // Just remove existing YouTube and decoration elements
      const objectsToRemove: THREE.Object3D[] = [];
      sceneRef.current.traverse((object) => {
        if (object.userData && 
          (object.userData.type === 'youtubePreview' || 
            object.userData.type === 'youtubeDecoration')) {
          objectsToRemove.push(object);
        }
      });
      
      objectsToRemove.forEach(obj => {
        sceneRef.current?.remove(obj);
        if (obj instanceof THREE.Mesh) {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) {
              obj.material.forEach(mat => mat.dispose());
            } else {
              obj.material.dispose();
            }
          }
        }
      });
    }
  
    // Create a detailed song info card at the top - use fallback data if songData is not available
    const song = songData
    
    const title = song.name || "Loading Song...";
    const artist = song?.artist || "Please wait";
    const album = song?.album || "";
    
    // Create detailed song info card
    const infoCanvas = document.createElement('canvas');
    const infoContext = infoCanvas.getContext('2d');
    infoCanvas.width = 1600;
    infoCanvas.height = 600; // Larger height for more details
    
    if (infoContext) {
      // Vibrant background with gradient
      const backgroundColor = POP_ART_COLORS[Math.floor(Math.random() * POP_ART_COLORS.length)];
      const gradient = infoContext.createLinearGradient(0, 0, 1600, 0);
      gradient.addColorStop(0, backgroundColor);
      gradient.addColorStop(0.5, '#000000');
      gradient.addColorStop(1, backgroundColor);
      
      infoContext.fillStyle = gradient;
      infoContext.fillRect(0, 0, 1600, 600);
      
      // Add border
      infoContext.strokeStyle = '#FFFFFF';
      infoContext.lineWidth = 12;
      infoContext.strokeRect(15, 15, 1570, 570);
      
      // Add title with shadow effect
      infoContext.shadowColor = '#000000';
      infoContext.shadowBlur = 15;
      infoContext.shadowOffsetX = 5;
      infoContext.shadowOffsetY = 5;
      
      infoContext.font = 'bold 90px Impact';
      infoContext.fillStyle = '#FFFFFF';
      infoContext.textAlign = 'center';
      infoContext.textBaseline = 'top';
      
      // Handle long titles
      if (title.length > 30) {
        const words = title.split(' ');
        let line1 = '';
        let line2 = '';
        
        for (const word of words) {
          if (line1.length + word.length < 30) {
            line1 += (line1.length ? ' ' : '') + word;
          } else {
            line2 += (line2.length ? ' ' : '') + word;
          }
        }
        
        infoContext.fillText(line1.toUpperCase(), 800, 50);
        infoContext.fillText(line2.toUpperCase(), 800, 150);
      } else {
        infoContext.fillText(title.toUpperCase(), 800, 100);
      }
      
      // Add artist
      infoContext.shadowBlur = 10;
      infoContext.font = 'bold 70px Arial';
      infoContext.fillStyle = '#FFFFFF'
      infoContext.fillText(`BY ${artist.toUpperCase()}`, 800, 270);
      
      // Add album if available
      if (album) {
        infoContext.font = 'bold 50px Arial';
        infoContext.fillStyle = '#FFFFFF'
        infoContext.fillText(`ALBUM: ${album.toUpperCase()}`, 800, 370);
      }
      
      // Add decorative elements
      infoContext.shadowBlur = 0;
      
      // Pop art dots
      infoContext.fillStyle = 'rgba(255, 255, 255, 0.5)';
      for (let i = 0; i < 20; i++) {
        const x = Math.random() * 1600;
        const y = Math.random() * 600;
        const radius = 5 + Math.random() * 15;
        
        infoContext.beginPath();
        infoContext.arc(x, y, radius, 0, Math.PI * 2);
        infoContext.fill();
      }
      
      // Create texture and sprite
      const infoTexture = new THREE.CanvasTexture(infoCanvas);
      const infoMaterial = new THREE.SpriteMaterial({ map: infoTexture });
      const infoSprite = new THREE.Sprite(infoMaterial);
      infoSprite.scale.set(16, 6, 1);
      infoSprite.position.set(0, 15, 0); // Position above video player
      infoSprite.userData = { type: 'youtubeDecoration' };
      sceneRef.current?.add(infoSprite);
    }
    
    // Create the YouTube player preview
    const youtubeCanvas = document.createElement('canvas');
    const youtubeContext = youtubeCanvas.getContext('2d');
    youtubeCanvas.width = 1600;
    youtubeCanvas.height = 900;
    
    if (youtubeContext) {
      // Black frame for YouTube
      youtubeContext.fillStyle = '#000000';
      youtubeContext.fillRect(0, 0, 1600, 900);
      
      // Add border
      youtubeContext.strokeStyle = '#FFFFFF';
      youtubeContext.lineWidth = 15;
      youtubeContext.strokeRect(15, 15, 1570, 870);
      
      // Add YouTube logo and play symbol
      youtubeContext.fillStyle = '#FF0000';
      youtubeContext.fillRect(650, 350, 300, 200);
      
      youtubeContext.fillStyle = '#FFFFFF';
      youtubeContext.beginPath();
      youtubeContext.moveTo(730, 400);
      youtubeContext.lineTo(730, 500);
      youtubeContext.lineTo(880, 450);
      youtubeContext.closePath();
      youtubeContext.fill();
      
      // Add "Click to Play" text with better visibility
      youtubeContext.font = 'bold 80px Impact';
      youtubeContext.textAlign = 'center';
      youtubeContext.textBaseline = 'middle';
      
      // Add shadow for better visibility
      youtubeContext.shadowColor = '#000000';
      youtubeContext.shadowBlur = 15;
      youtubeContext.shadowOffsetX = 4;
      youtubeContext.shadowOffsetY = 4;
      
      // youtubeContext.fillText('CLICK TO PLAY', 800, 650);
      
      // Add hint that it opens in modal
      youtubeContext.font = 'bold 40px Arial';
      
      const youtubeTexture = new THREE.CanvasTexture(youtubeCanvas);
      const youtubeMaterial = new THREE.SpriteMaterial({ map: youtubeTexture });
      const youtubeSprite = new THREE.Sprite(youtubeMaterial);
      youtubeSprite.scale.set(25, 15, 1);
      youtubeSprite.position.set(0, 4.5, 0);
      youtubeSprite.userData = { 
        type: 'youtubePreview', 
        youtubeId: youtubeId,
        youtube: song.youtube
      };
      sceneRef.current?.add(youtubeSprite);
    }
    
    // Position camera appropriately
    if (cameraRef.current) {
      const startPosition = cameraRef.current.position.clone();
      const targetPosition = YOUTUBE_CAMERA_POSITION;
      
      const animateCamera = () => {
        const startTime = Date.now();
        const duration = 1000;
        
        const updateCamera = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);
          
          const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);
          const easedProgress = easeOutCubic(progress);
          
          if (cameraRef.current) {
            cameraRef.current.position.lerpVectors(startPosition, targetPosition, easedProgress);
            cameraRef.current.lookAt(0, -20, 0);
            
            if (progress < 1) {
              requestAnimationFrame(updateCamera);
            }
          }
        };
        
        updateCamera();
      };
      
      animateCamera();
    }
  
    // Create related genres if they exist
    if (songData && songData.genres && Array.isArray(songData.genres) && songData.genres.length > 0) {
      createOrbitingGenreShapes(songData.genres);
    } else {
      // Add a placeholder if no genres are available yet
      console.log("No genre data available yet");
    }
  };

  // Create related genre cards that orbit clockwise
  const createOrbitingGenreShapes = (genres:string[]) => {
    if (!sceneRef.current || !Array.isArray(genres)) return;
    
    const scene = sceneRef.current;
    
    // Clear any existing animations
    if (typeof window !== 'undefined' && window.floatingAnimations) {
      window.floatingAnimations.forEach(id => clearTimeout(id));
      window.floatingAnimations = [];
    }
    
    // Only handle relatedGenre objects since YouTube and song views are handled separately
    const objectsToRemove: THREE.Object3D[] = [];
    scene.traverse((object) => {
      if (object.userData && object.userData.type === 'relatedGenre') {
        objectsToRemove.push(object);
      }
    });
    
    objectsToRemove.forEach(obj => {
      scene.remove(obj);
      if (obj instanceof THREE.Mesh) {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach(mat => mat.dispose());
          } else {
            obj.material.dispose();
          }
        }
      }
    });
    
    const genreCount = Math.min(genres.length, 8);
    
    // Store references to genre cards for animation
    if (!window.genreCards) {
      window.genreCards = [];
    } else {
      window.genreCards = [];
    }
    
    // Position genres in a full circle around the center (not just sides)
    genres.slice(0, genreCount).forEach((genre, index) => {
      // Calculate position in a full circle for orbiting
      const angle = (index / genreCount) * Math.PI * 2;
      const radius = 20; // Distance from center
      
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      
      // Create a card for the genre
      const genreGroup = new THREE.Group();
      genreGroup.position.set(x, 6, z);
      genreGroup.userData = { 
        type: 'relatedGenre', 
        name: genre,
        angle: angle, // Store the angle for animation
        radius: radius // Store the radius for animation
      };
      
      // Create billboard card
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = 512;
      canvas.height = 384;
      
      if (context) {
        // Vibrant pop art background
        const colorIndex = index % POP_ART_COLORS.length;
        const mainColor = POP_ART_COLORS[colorIndex];
        context.fillStyle = mainColor;
        context.fillRect(0, 0, 512, 384);
        
        // Add halftone pattern
        context.fillStyle = 'rgba(255, 255, 255, 0.3)';
        const dotSize = 12;
        const dotSpacing = 24;
        
        for (let x = 0; x < 512; x += dotSpacing) {
          for (let y = 0; y < 384; y += dotSpacing) {
            if ((x + y) % 48 < 24) {
              context.beginPath();
              context.arc(x, y, dotSize, 0, Math.PI * 2);
              context.fill();
            }
          }
        }
        
        // Add bold border
        context.strokeStyle = '#FFFFFF';
        context.lineWidth = 10;
        context.strokeRect(10, 10, 492, 364);
        
        // Add genre text in pop art style
        context.fillStyle = '#FFFFFF';
        context.font = 'bold 70px Impact';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        
        // Handle long genre names
        const displayGenre = genre.length > 15 ? 
          genre.substring(0, 12) + "..." : 
          genre;
        
        context.fillText(displayGenre.toUpperCase(), 256, 160);
        
        const texture = new THREE.CanvasTexture(canvas);
        const cardMaterial = new THREE.SpriteMaterial({ map: texture });
        const card = new THREE.Sprite(cardMaterial);
        card.scale.set(6, 4.5, 1);
        
        // Ensure card faces the center
        card.userData = { 
          type: 'relatedGenre', 
          name: genre
        };
        genreGroup.add(card);
      }
      
      // Make genre card face the center
      genreGroup.lookAt(0, 6, 0);
      
      // Add to scene
      scene.add(genreGroup);
      
      // Store for animation
      window.genreCards.push(genreGroup);
    });
    
    // Start the orbiting animation if not already running
    if (!window.isOrbiting) {
      startOrbitAnimation();
    }
  };

  // Animation function for orbiting genre cards
  const startOrbitAnimation = () => {
    if (!window.genreCards || window.genreCards.length === 0) return;
    
    window.isOrbiting = true;
    
    // Animation settings
    const rotationSpeed = 0.001; // Adjust for faster/slower rotation
    
    // Animation loop using requestAnimationFrame
    const animate = () => {
      if (!window.genreCards || window.genreCards.length === 0) {
        window.isOrbiting = false;
        return;
      }
      
      window.genreCards.forEach(genreGroup => {
        // Update angle (subtract for clockwise rotation)
        genreGroup.userData.angle -= rotationSpeed;
        
        // Update position based on angle
        const x = Math.cos(genreGroup.userData.angle) * genreGroup.userData.radius;
        const z = Math.sin(genreGroup.userData.angle) * genreGroup.userData.radius;
        
        genreGroup.position.set(x, 6, z);
        
        // Keep card facing center
        genreGroup.lookAt(0, 6, 0);
      });
      
      // Continue animation loop
      window.orbitAnimationId = requestAnimationFrame(animate);
    };
    
    // Start animation
    window.orbitAnimationId = requestAnimationFrame(animate);
    
    // Store animation ID for cleanup
    if (!window.floatingAnimations) {
      window.floatingAnimations = [];
    }
    window.floatingAnimations.push(window.orbitAnimationId);
  };

  // handle Click
  useEffect(() => {
    if (!mountRef.current || loading) return;
    
    // Setup raycaster for interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const renderer = rendererRef.current;
    
    // Event listener for mouse clicks
    const handleClick = (event: MouseEvent) => {
      if (!sceneRef.current || !cameraRef.current || !renderer) return;
      
      // Calculate mouse position in normalized device coordinates
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      // Update the picking ray with the camera and mouse position
      raycaster.setFromCamera(mouse, cameraRef.current);

      // Calculate objects intersecting the picking ray with recursive flag to check children
      const intersects = raycaster.intersectObjects(sceneRef.current.children, true);

      if (intersects.length > 0) {
        // Find the first object with relevant userData
        const findObjectWithUserData = (object: THREE.Object3D): THREE.Object3D => {
          let current: THREE.Object3D | null = object;
          
          while (current) {
            if (current.userData && current.userData.type) {
              return current;
            }
            current = current.parent;
          }
          
          return object;
        };

        const object = findObjectWithUserData(intersects[0].object);
        const userData = object.userData;
        
        if (userData) {
          console.log("Clicked object:", userData);
          
          // Handle different object types
          if (userData.type === 'genre') {
            console.log(`Clicked on genre: ${userData.name}`);
            fetchSongsForGenre(userData.name);
          } 
          else if (userData.type === 'song') {
            console.log(`Clicked on song with YouTube: ${userData.youtube}`);
            setSelectedSong(userData.id);
            
            // Clear scene immediately when transitioning to related view
            
            if (currentView === "songs") {
              // Clear current songs view objects
              const objectsToRemove: THREE.Object3D[] = [];
              sceneRef.current.traverse((obj) => {
                if (obj.userData && 
                    (obj.userData.type === 'song' || 
                    obj.userData.type === 'songStage')) {
                  objectsToRemove.push(obj);
                }
              });
              
              objectsToRemove.forEach(obj => {
                sceneRef.current?.remove(obj);
                if (obj instanceof THREE.Mesh) {
                  if (obj.geometry) obj.geometry.dispose();
                  if (obj.material) {
                    if (Array.isArray(obj.material)) {
                      obj.material.forEach(mat => mat.dispose());
                    } else {
                      obj.material.dispose();
                    }
                  }
                }
              });
            }
            
            const youtubeUrl = userData.youtube;

            if (youtubeUrl) {
              // Set initial song details with the YouTube ID to prevent "video unavailable"
              setSongDetails({
                name: userData.title || "Loading...",
                artist: userData.artist || "Loading...",
                youtube: youtubeUrl,
              });
              
              // Then fetch the full details
              fetchSongDetails(youtubeUrl);
            }
          } 
          else if (userData.type === 'youtubePreview') {
            console.log('Clicked on YouTube preview');
            // Open the modal with YouTube player
            if (userData.youtubeId) {
              setSongDetails(prev => ({
                ...prev,
                youtube: userData.youtubeId
              }));
            }
          }
          else if (userData.type === 'relatedGenre') {
            console.log(`Clicked on related genre: ${userData.name}`);
            setSongDetails(null); // Close the current song details
            setCurrentView("songs"); // Change back to songs view
            fetchSongsForGenre(userData.name);
          }
          else if (userData.type === 'backButton' && userData.action === 'returnToGenres') {
            console.log('Clicked on back to genres button');
            returnToMainView();
          }
        }
      }
    };

    // Add click event listener
    const element = renderer?.domElement;
    if (element) {
      // Remove any existing listeners first to prevent duplicates
      element.removeEventListener('click', handleClick);
      element.addEventListener('click', handleClick);
    }

    // Cleanup function
    return () => {
      if (element) {
        element.removeEventListener('click', handleClick);
      }
    };
  }, [loading, sceneRef.current, cameraRef.current, rendererRef.current,currentView,fetchSongDetails, fetchSongsForGenre, returnToMainView]);

  // Display loading and error states
  if (loading) {
    return (
    <div className="flex items-center justify-center min-h-screen bg-black">
      <div className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-cyan-400 to-pink-500 text-3xl font-bold animate-pulse p-4">
        Loading your Loop Bop Experience...
      </div>
    </div>
    );
    }

  if (error) {
    return (
    <div className="flex items-center justify-center min-h-screen bg-black">
      <div className="bg-gradient-to-r from-black to-indigo-900 p-8 rounded-lg border-4 border-pink-500 shadow-lg shadow-pink-500/30">
        <p className="text-pink-500 text-2xl font-bold mb-4">Error!</p>
        <p className="text-white">{error}</p>
        <Button 
          className="mt-6 bg-pink-500 hover:bg-pink-600 text-black font-bold"
          onClick={() => window.location.reload()}
        >
          Please try again later...
        </Button>
      </div>
    </div>
    );
  }

  // Calculate accuracy for display
  const totalExercises = userData.exercises_count || 0;
  const accuracy = (userData.correct_count / totalExercises) * 100;

  return (
    <div className="flex flex-col min-h-screen bg-black text-white">
    {/* Header with pop art styling */}
    <header className="px-4 lg:px-6 h-14 flex items-center bg-gradient-to-r from-indigo-900 via-black to-indigo-900 border-b-4 border-pink-500 z-10">
      <Link className="flex items-center justify-center" href="/">
        <span className="ml-2 text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-cyan-400 to-pink-500">
          LoopBop
        </span>
      </Link>
      <nav className="ml-auto flex items-center space-x-4">
        <Button
          className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold"
          size="sm"
          onClick={returnToMainView}
        >
          <Home className="h-4 w-4 mr-1" />
          Main
        </Button>
        <span className="text-sm font-medium text-cyan-400 hover:text-pink-400 transition-colors">{userData.email}</span>
        <Button
          className="bg-pink-500 hover:bg-pink-600 text-black font-bold" 
          size="sm"
          onClick={() => {
            localStorage.removeItem("token");
            router.push("/");
          }}
        >
          Sign Out
        </Button>
      </nav>
    </header>
  
    {/* Main 3D Canvas */}
    <main className="flex-1 relative">
      <div ref={mountRef} className="absolute inset-0 bg-gradient-to-b from-black to-indigo-900" />
        {/* Practice Panel - Always visible at top right */}
        <div className="absolute top-4 right-4 space-y-4 z-20">
          {/* Practice Panel - Always expanded */}
          <Card 
            className="w-64 border-4 border-cyan-500 bg-black bg-opacity-80 backdrop-blur-md text-white shadow-lg shadow-cyan-500/30 rounded-lg overflow-hidden"
          >
            <CardHeader className="p-2 flex flex-row items-center justify-between">
              <CardTitle className="flex items-center">
                <Music className="h-5 w-5 text-cyan-400 mr-2" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-yellow-400">Practice</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <div className="flex flex-col space-y-2">
                <div className="text-sm">Completed Songs: <span className="font-bold text-yellow-400">{userData.exercises_count}</span></div>
                <div className="text-sm">Average Score: <span className="font-bold text-yellow-400">{(accuracy/100).toFixed()}%</span></div>
                <Progress 
                  value={totalExercises} 
                  className="h-2 bg-indigo-900"
                  style={{
                    '--tw-progress-fill': 'linear-gradient(to right, #36DBFF, #FF3864)'
                  } as React.CSSProperties} 
                />
                
                {/* Difficulty Mode Selection */}
                <div className="flex justify-between mt-2 bg-indigo-900/50 rounded-lg p-1 border border-cyan-400">
                  <Button 
                    size="sm" 
                    className={`flex-1 text-xs font-bold ${practiceMode === 'easy' 
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white' 
                      : 'bg-transparent text-cyan-400 hover:text-white hover:bg-indigo-800'}`}
                                        onClick={(e) => {
                              e.stopPropagation();
                              setPracticeMode('easy');
                            }}
                  >
                    Easy Mode
                  </Button>
                  <Button 
                    size="sm" 
                    className={`flex-1 text-xs font-bold ${practiceMode === 'hard' 
                      ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white' 
                      : 'bg-transparent text-pink-400 hover:text-white hover:bg-indigo-800'}`}
                                        onClick={(e) => {
                              e.stopPropagation();
                              setPracticeMode('hard');
                            }}
                  >
                    Hard Mode
                  </Button>
                </div>
                
                {/* Blinking Start Practice Button */}
                <Button 
                  size="sm" 
                  className="mt-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold border-2 border-white pulsate-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/practice?mode=${practiceMode}`);
                  }}
                >
                  Start Practice Session
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Explore Panel - Bottom Left (collapsed by default) */}
        <div className="absolute bottom-4 left-4 space-y-4 z-20">
          <Card 
            className={`transition-all duration-300 rounded-lg overflow-hidden ${
              showExplore 
                ? 'w-64 border-4 border-yellow-400 bg-black bg-opacity-80 backdrop-blur-md text-white shadow-lg shadow-yellow-400/30' 
                : 'w-12 h-12 bg-yellow-400 text-black shadow-md'
            }`}
            onClick={showExplore ? () => router.push("/explore") : undefined}
          >
            <CardHeader className={`p-2 flex flex-row items-center justify-between ${showExplore ? '' : 'p-0 m-0 h-full'}`}>
              <CardTitle className={`flex items-center ${showExplore ? '' : 'hidden'}`}>
                <Search className="h-5 w-5 text-yellow-400 mr-2" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-pink-500">Explore Music</span>
              </CardTitle>
              <Button 
                className={`${
                  showExplore 
                    ? 'h-8 w-8 bg-yellow-400 hover:bg-yellow-500 text-black rounded-md' 
                    : 'h-full w-full bg-yellow-400 hover:bg-yellow-500 text-black rounded-none flex items-center justify-center'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowExplore(!showExplore);
                }}
              >
                {showExplore ? <X className="h-4 w-4" /> : <Search className="h-6 w-6" />}
              </Button>
            </CardHeader>
            {showExplore && (
              <CardContent className="p-2">
                <p className="text-sm mb-2 text-cyan-400 font-bold">Discover songs, albums, artists, and music tags</p>
                <Button size="sm" className="bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-black font-bold">
                  Open Explorer
                </Button>
              </CardContent>
            )}
          </Card>
        </div>

        {/* Leaderboard Panel - Bottom Right (collapsed by default) */}
        <div className="absolute bottom-4 right-4 space-y-4 z-20">
          <Card 
            className={`transition-all duration-300 rounded-lg overflow-hidden ${
              showLeaderboard 
                ? 'w-64 border-4 border-pink-500 bg-black bg-opacity-80 backdrop-blur-md text-white shadow-lg shadow-pink-500/30' 
                : 'w-12 h-12 bg-pink-500 text-white shadow-md'
            }`}
          >
            <CardHeader className={`p-2 flex flex-row items-center justify-between ${showLeaderboard ? '' : 'p-0 m-0 h-full'}`}>
              <CardTitle className={`flex items-center ${showLeaderboard ? '' : 'hidden'}`}>
                <Trophy className="h-5 w-5 text-yellow-400 mr-2" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-yellow-400">Leaderboard</span>
              </CardTitle>
              <Button 
                className={`${
                  showLeaderboard 
                    ? 'h-8 w-8 bg-pink-500 hover:bg-pink-600 text-white rounded-md' 
                    : 'h-full w-full bg-pink-500 hover:bg-pink-600 text-white rounded-none flex items-center justify-center'
                }`}
                onClick={() => setShowLeaderboard(!showLeaderboard)}
              >
                {showLeaderboard ? <X className="h-4 w-4" /> : <Trophy className="h-6 w-6" />}
              </Button>
            </CardHeader>
            {showLeaderboard && (
              <CardContent className="p-2">
                <ul className="space-y-2 text-sm">
                  {leaderboard.slice(0, 5).map((entry, index) => (
                    <li key={index} className={`flex justify-between items-center p-2 rounded ${
                      entry.email === userData.email ? 'bg-gradient-to-r from-pink-500/30 to-indigo-900/70 border-2 border-pink-500' : 'bg-indigo-900/30'
                    }`}>
                      <span className={`${entry.email === userData.email ? 'text-cyan-400 font-bold' : 'text-white'}`}>
                        {index + 1}. {entry.email.split('@')[0]}
                      </span>
                      <span className="text-yellow-400 font-bold">{entry.accuracy.toFixed(1)}%</span>
                    </li>
                  ))}
                </ul>
                {userData.rank && userData.rank > 5 && (
                  <p className="mt-2 text-xs text-cyan-400">Your rank: #{userData.rank}</p>
                )}
              </CardContent>
            )}
          </Card>
        </div>
    </main>
  
    {/* Instructions Modal - Shows when user first visits */}
    <div className="fixed inset-0 flex items-center justify-center z-40 pointer-events-none">
      <div className="bg-black bg-opacity-70 backdrop-blur-md p-8 rounded-xl border-4 border-pink-500 text-white max-w-md text-center animate-fade-out shadow-xl shadow-pink-500/30">
        <h2 className="text-3xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-cyan-400 to-pink-500">Welcome to LoopBop Space!</h2>
        <p className="text-cyan-400 mb-6">Use your mouse to navigate: drag to rotate, scroll to zoom.</p>
        <div className="flex justify-center space-x-6">
          <div className="text-center">
            <div className="w-14 h-14 mx-auto bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center mb-2 border-2 border-white">
              <span className="text-2xl font-bold">1</span>
            </div>
            <p className="text-sm font-bold text-pink-500">Select a genre</p>
          </div>
          <div className="text-center">
            <div className="w-14 h-14 mx-auto bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center mb-2 border-2 border-white">
              <span className="text-2xl font-bold">2</span>
            </div>
            <p className="text-sm font-bold text-cyan-500">Explore songs</p>
          </div>
          <div className="text-center">
            <div className="w-14 h-14 mx-auto bg-gradient-to-br from-yellow-400 to-amber-600 rounded-full flex items-center justify-center mb-2 border-2 border-white">
              <span className="text-2xl font-bold">3</span>
            </div>
            <p className="text-sm font-bold text-yellow-400">Discover genres</p>
          </div>
        </div>
      </div>
    </div>
  
    {/* Song Details Modal */}
    {songDetails && (
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div
          className="fixed inset-0 bg-black bg-opacity-75 backdrop-blur-sm"
          onClick={() => setSongDetails(null)}
        ></div>
        <div className="relative bg-gradient-to-br from-indigo-900 to-black p-6 rounded-xl shadow-2xl transform transition-all duration-500 scale-100 max-w-xl w-full border-4 border-pink-500 animate-fadeIn shadow-lg shadow-pink-500/30">
          <button
            className="absolute top-3 right-3 text-white text-2xl hover:text-pink-300 bg-pink-800 hover:bg-pink-700 rounded-full w-8 h-8 flex items-center justify-center transition-colors"
            onClick={() => setSongDetails(null)}
          >
            &times;
          </button>
  
          {/* Title Bar */}
          <div className="absolute top-0 left-0 right-0 h-14 bg-gradient-to-r from-pink-600 to-purple-800 rounded-t-xl flex items-center px-4 border-b-2 border-pink-500">
            <div className="flex-1 text-center text-white font-bold text-lg">
              <span className="neon-text">Now Playing</span>
            </div>
          </div>
  
          {/* Content with padding to account for title bar */}
          <div className="pt-16">
          {/* YouTube Video */}
          <div className="w-full h-64 mb-5 rounded-lg overflow-hidden shadow-lg border-2 border-cyan-500">
            {songDetails.youtube ? (
              <iframe
                src={`https://www.youtube.com/embed/${extractYoutubeId(songDetails.youtube)}?autoplay=1`}
                className="w-full h-full"
                frameBorder="0"
                allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            ) : (
              <div className="flex items-center justify-center w-full h-full bg-gradient-to-r from-pink-900 to-indigo-900 rounded-lg">
                <p className="text-white font-bold">Video unavailable</p>
              </div>
            )}
          </div>
  
            {/* Song Information */}
            <div className="flex items-start space-x-5">
              {/* Album Art */}
              {songDetails.pic && (
                <div className="flex-shrink-0">
                  <img
                    src={songDetails.pic}
                    alt={songDetails.album || "Album Cover"}
                    className="w-32 h-32 rounded-lg object-cover shadow-lg border-2 border-yellow-400"
                  />
                </div>
              )}
  
              {/* Song Details */}
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-cyan-500">
                  {songDetails.name}
                </h2>
                <p className="text-xl text-yellow-400 mb-1 font-bold">{songDetails.artist}</p>
                {songDetails.album && (
                  <p className="text-sm text-pink-500 mb-3 font-bold">Album: {songDetails.album}</p>
                )}
  
                {/* Play Stats (mock data) */}
                <div className="flex space-x-4 text-xs text-cyan-400 mb-3">
                  <div className="flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 mr-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    {Math.floor(Math.random() * 1000) + 100}K
                  </div>
                  <div className="flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 mr-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                      />
                    </svg>
                    {Math.floor(Math.random() * 100) + 10}K
                  </div>
                </div>
  
                {/* Genres */}
                {songDetails.genres && songDetails.genres.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {songDetails.genres.map((genre: string, index: number) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-gradient-to-r from-indigo-900 to-indigo-700 hover:from-indigo-700 hover:to-indigo-600 rounded-full text-sm text-white transition-colors shadow-md border border-cyan-500"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSongDetails(null);
                          fetchSongsForGenre(genre);
                        }}
                        style={{ cursor: "pointer" }}
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
  
            {/* Navigation Tip */}
            <div className="mt-6 text-center text-cyan-400 text-sm bg-indigo-900 bg-opacity-50 rounded-lg py-2 border border-cyan-500">
              Explore the related genres in 3D behind this window
            </div>
          </div>
        </div>
      </div>
    )}  
  
    {/* Footer */}
    <footer className="py-3 text-center border-t-4 border-pink-500 bg-gradient-to-r from-indigo-900 via-black to-indigo-900 z-10">
      <p className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-cyan-400 to-pink-500">
        © 2025 LoopBop. All rights reserved.
      </p>
    </footer>
  
    {/* Add global styles for animations */}
    <style jsx global>{`
      @keyframes fadeOut {
        0% { opacity: 1; }
        70% { opacity: 1; }
        100% { opacity: 0; visibility: hidden; }
      }
      .animate-fade-out {
        animation: fadeOut 4s forwards;
      }
      
      @keyframes fadeIn {
        0% { opacity: 0; transform: scale(0.95); }
        100% { opacity: 1; transform: scale(1); }
      }
      .animate-fadeIn {
        animation: fadeIn 0.3s ease-out forwards;
      }
      
      .pointer-events-none {
        pointer-events: none;
      }

      /* Smooth transition for corner buttons */
      .card-transition {
        will-change: width, height, opacity, transform;
        backface-visibility: hidden;
        transform: translateZ(0);
      }
      
      /* Pulsating effect for the Start Practice button */
      @keyframes pulsate {
        0% { 
          box-shadow: 0 0 0 0 rgba(54, 219, 255, 0.7), 0 0 0 0 rgba(255, 56, 100, 0.7);
          transform: scale(1);
        }
        50% { 
          box-shadow: 0 0 10px 3px rgba(54, 219, 255, 0.6), 0 0 20px 6px rgba(255, 56, 100, 0.4);
          transform: scale(1.02);
        }
        100% { 
          box-shadow: 0 0 0 0 rgba(54, 219, 255, 0), 0 0 0 0 rgba(255, 56, 100, 0);
          transform: scale(1);
        }
      }
      
      .pulsate-button {
        animation: pulsate 1.5s infinite ease-in-out;
        position: relative;
        z-index: 1;
      }
      
      .pulsate-button:before {
        content: '';
        position: absolute;
        top: -2px;
        left: -2px;
        right: -2px;
        bottom: -2px;
        border-radius: 0.25rem;
        background: linear-gradient(90deg, #36DBFF, #FF3864);
        z-index: -1;
        opacity: 0.3;
        filter: blur(5px);
      }
      
      /* Custom scrollbar for the modal */
      ::-webkit-scrollbar {
        width: 8px;
      }
      ::-webkit-scrollbar-track {
        background: rgba(139, 92, 246, 0.1);
        border-radius: 10px;
      }
      ::-webkit-scrollbar-thumb {
        background: rgba(236, 72, 153, 0.5);
        border-radius: 10px;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: rgba(236, 72, 153, 0.7);
      }
      
      /* Neon text effect */
      @keyframes neon-pulse {
        0% { text-shadow: 0 0 7px #fff, 0 0 10px #FF3864, 0 0 21px #FF3864; }
        50% { text-shadow: 0 0 10px #fff, 0 0 20px #36DBFF, 0 0 30px #36DBFF; }
        100% { text-shadow: 0 0 7px #fff, 0 0 10px #FF3864, 0 0 21px #FF3864; }
      }
      .neon-text {
        animation: neon-pulse 2s infinite;
      }
    `}</style>
    </div>
    );
  }