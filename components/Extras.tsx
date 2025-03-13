// import React, { useEffect, useRef } from 'react';
// import * as THREE from 'three';

// // Define types for character properties
// interface CharacterRef {
//   object: THREE.Object3D;
//   originalY: number;
//   floatSpeed: number;
//   rotationSpeed: number;
//   floatAmplitude: number;
//   spinSpeed?: number;
//   isMixer?: boolean;
//   spinPlatters?: boolean;
//   characterType?: string;
// }

// // Color palette type
// type ColorPalette = string[];

// const LoopBopCharacters: React.FC = () => {
//   const charactersRef = useRef<CharacterRef[]>([]);
  
//   useEffect(() => {
//     // This component assumes it's used within the dashboard where THREE scene is already set up
//     const scene = window.sceneRef?.current;
//     if (!scene) {
//       console.error('Scene not available');
//       return;
//     }
    
//     const POP_ART_COLORS: ColorPalette = [
//       '#FF2B5B', // Hot pink
//       '#FF3864', // Coral red
//       '#FF5F5F', // Salmon
//       '#FFC700', // Bright yellow
//       '#39FF14', // Neon green
//       '#00FFFF', // Cyan
//       '#36DBFF', // Bright blue
//       '#3772FF', // Royal blue
//       '#AD00FF', // Purple
//       '#F222FF', // Magenta
//       '#FF00D4', // Hot magenta
//     ];
    
//     // Create character models
//     const createCharacters = (): void => {
//       // Create different types of characters
//       createMusicNoteCharacters(scene, POP_ART_COLORS);
//       createBoomboxCharacter(scene, POP_ART_COLORS);
//       createLoopBopLetters(scene, POP_ART_COLORS); // New letters function instead of dancing figures
//       createFloatingHeadphones(scene, POP_ART_COLORS);
//       createVinylRecords(scene, POP_ART_COLORS);
//       createDjMixerCharacter(scene, POP_ART_COLORS);
//     };
    
//     // Music Note Characters
//     const createMusicNoteCharacters = (scene: THREE.Scene, colors: ColorPalette): void => {
//       for (let i = 0; i < 5; i++) {
//         const noteGroup = new THREE.Group();
//         noteGroup.userData = { type: 'loopbopCharacter', characterType: 'musicNote' };
        
//         // Random color from palette
//         const noteColor = colors[Math.floor(Math.random() * colors.length)];
//         const material = new THREE.MeshPhongMaterial({
//           color: parseInt(noteColor.replace('#', '0x')),
//           emissive: parseInt(noteColor.replace('#', '0x')),
//           emissiveIntensity: 0.5,
//           shininess: 60
//         });
        
//         // Note head (ellipsoid)
//         const noteHead = new THREE.Mesh(
//           new THREE.SphereGeometry(1, 32, 16).scale(1, 1.5, 0.8),
//           material
//         );
//         noteHead.rotation.z = Math.PI / 4;
        
//         // Note stem
//         const noteStem = new THREE.Mesh(
//           new THREE.CylinderGeometry(0.15, 0.15, 4, 8),
//           material
//         );
//         noteStem.position.set(-1, 2, 0);
        
//         // Add glow effect
//         const glowMaterial = new THREE.MeshBasicMaterial({
//           color: parseInt(noteColor.replace('#', '0x')),
//           transparent: true,
//           opacity: 0.3
//         });
//         const glow = new THREE.Mesh(
//           new THREE.SphereGeometry(1.5, 32, 16).scale(1, 1.5, 0.8),
//           glowMaterial
//         );
//         glow.rotation.z = Math.PI / 4;
        
//         noteGroup.add(noteHead);
//         noteGroup.add(noteStem);
//         noteGroup.add(glow);
        
//         // Random position in 3D space, but not too close to center
//         const distance = 18 + Math.random() * 20;
//         const angle = Math.random() * Math.PI * 2;
//         const height = -10 + Math.random() * 30;
        
//         noteGroup.position.set(
//           Math.cos(angle) * distance,
//           height,
//           Math.sin(angle) * distance
//         );
        
//         // Random rotation
//         noteGroup.rotation.y = Math.random() * Math.PI;
        
//         // Add to scene and save reference
//         scene.add(noteGroup);
//         charactersRef.current.push({
//           object: noteGroup,
//           originalY: noteGroup.position.y,
//           floatSpeed: 0.5 + Math.random() * 0.5,
//           rotationSpeed: (0.01 + Math.random() * 0.01) / 3, // 3x slower
//           floatAmplitude: 1 + Math.random() * 0.5,
//           characterType: 'musicNote'
//         });
//       }
//     };
    
//     // Boombox Character
//     const createBoomboxCharacter = (scene: THREE.Scene, colors: ColorPalette): void => {
//       const boomboxGroup = new THREE.Group();
//       boomboxGroup.userData = { type: 'loopbopCharacter', characterType: 'boombox' };
      
//       // Random color
//       const mainColor = colors[Math.floor(Math.random() * colors.length)];
//       const accentColor = colors[(colors.indexOf(mainColor) + 5) % colors.length];
      
//       const mainMaterial = new THREE.MeshPhongMaterial({
//         color: parseInt(mainColor.replace('#', '0x')),
//         emissive: parseInt(mainColor.replace('#', '0x')),
//         emissiveIntensity: 0.3,
//         shininess: 80
//       });
      
//       const accentMaterial = new THREE.MeshPhongMaterial({
//         color: parseInt(accentColor.replace('#', '0x')),
//         emissive: parseInt(accentColor.replace('#', '0x')),
//         emissiveIntensity: 0.5,
//         shininess: 90
//       });
      
//       // Main body
//       const body = new THREE.Mesh(
//         new THREE.BoxGeometry(5, 3, 2),
//         mainMaterial
//       );
      
//       // Speakers
//       const leftSpeaker = new THREE.Mesh(
//         new THREE.CircleGeometry(1, 32),
//         accentMaterial
//       );
//       leftSpeaker.position.set(-1.5, 0, 1.01);
      
//       const rightSpeaker = new THREE.Mesh(
//         new THREE.CircleGeometry(1, 32),
//         accentMaterial
//       );
//       rightSpeaker.position.set(1.5, 0, 1.01);
      
//       // Controls
//       const controlsPanel = new THREE.Mesh(
//         new THREE.BoxGeometry(1.8, 1, 0.2),
//         accentMaterial
//       );
//       controlsPanel.position.set(0, 0.8, 1.1);
      
//       // Handle
//       const handle = new THREE.Mesh(
//         new THREE.CylinderGeometry(0.2, 0.2, 6, 8),
//         mainMaterial
//       );
//       handle.rotation.z = Math.PI / 2;
//       handle.position.set(0, 2, 0);
      
//       // Buttons and knobs
//       for (let i = 0; i < 3; i++) {
//         const knob = new THREE.Mesh(
//           new THREE.CylinderGeometry(0.2, 0.2, 0.1, 16),
//           new THREE.MeshPhongMaterial({ color: 0xFFFFFF })
//         );
//         knob.rotation.x = Math.PI / 2;
//         knob.position.set(-0.6 + i * 0.6, 0.8, 1.21);
//         boomboxGroup.add(knob);
//       }
      
//       boomboxGroup.add(body);
//       boomboxGroup.add(leftSpeaker);
//       boomboxGroup.add(rightSpeaker);
//       boomboxGroup.add(controlsPanel);
//       boomboxGroup.add(handle);
      
//       // Position the boombox
//       boomboxGroup.position.set(-25, 8, 15);
//       boomboxGroup.rotation.y = Math.PI / 4;
      
//       // Add to scene and save reference
//       scene.add(boomboxGroup);
//       charactersRef.current.push({
//         object: boomboxGroup,
//         originalY: boomboxGroup.position.y,
//         floatSpeed: 0.3,
//         rotationSpeed: 0.005 / 3, // 3x slower
//         floatAmplitude: 1.2,
//         characterType: 'boombox'
//       });
//     };
    
//     // Create LOOPBOP letters
//     const createLoopBopLetters = (scene: THREE.Scene, colors: ColorPalette): void => {
//       const letters = "LOOPBOP";
      
//       // Create letter groups in a semicircle
//       // Position them along a curved path for visual interest
//       const radius = 30; // Distance from center
//       const arcAngle = Math.PI * 0.5; // 90 degrees arc
//       const baseHeight = 8;
      
//       for (let i = 0; i < letters.length; i++) {
//         const letterGroup = new THREE.Group();
//         letterGroup.userData = { 
//           type: 'loopbopCharacter', 
//           characterType: 'letter',
//           letter: letters[i]
//         };
        
//         // Calculate position along the arc
//         const angle = -arcAngle/2 + (i / (letters.length - 1)) * arcAngle;
//         const x = Math.cos(angle) * radius;
//         const z = Math.sin(angle) * radius;
//         const y = baseHeight + (Math.random() * 3 - 1.5); // Slight height variation
        
//         // Random color from palette
//         const letterColor = colors[i % colors.length]; // Different color for each letter
        
//         // Create a 3D text geometry
//         const letterGeometry = new THREE.BoxGeometry(3, 3, 0.5);
//         const material = new THREE.MeshPhongMaterial({
//           color: parseInt(letterColor.replace('#', '0x')),
//           emissive: parseInt(letterColor.replace('#', '0x')),
//           emissiveIntensity: 0.5,
//           shininess: 70
//         });
        
//         const letterMesh = new THREE.Mesh(letterGeometry, material);
        
//         // Create a canvas for the letter texture
//         const canvas = document.createElement('canvas');
//         canvas.width = 256;
//         canvas.height = 256;
//         const context = canvas.getContext('2d');
        
//         if (context) {
//           // Fill the background with the letter color
//           context.fillStyle = letterColor;
//           context.fillRect(0, 0, 256, 256);
          
//           // Draw the letter
//           context.font = 'bold 200px Arial';
//           context.textAlign = 'center';
//           context.textBaseline = 'middle';
//           context.fillStyle = 'white';
//           context.fillText(letters[i], 128, 128);
          
//           // Create texture from canvas
//           const texture = new THREE.CanvasTexture(canvas);
          
//           // Apply texture to the front face of the box
//           const materials = [
//             material, // Right side
//             material, // Left side
//             material, // Top side
//             material, // Bottom side
//             new THREE.MeshPhongMaterial({ // Front side - with letter
//               map: texture,
//               emissive: parseInt(letterColor.replace('#', '0x')),
//               emissiveIntensity: 0.3,
//               shininess: 70
//             }),
//             material // Back side
//           ];
          
//           letterMesh.material = materials;
//         }
        
//         letterGroup.add(letterMesh);
        
//         // Add a glow effect
//         const glowMaterial = new THREE.MeshBasicMaterial({
//           color: parseInt(letterColor.replace('#', '0x')),
//           transparent: true,
//           opacity: 0.3
//         });
        
//         const glow = new THREE.Mesh(
//           new THREE.BoxGeometry(3.5, 3.5, 0.2),
//           glowMaterial
//         );
//         glow.position.z = -0.2;
//         letterGroup.add(glow);
        
//         // Position the letter
//         letterGroup.position.set(x, y, z);
        
//         // Make it face the center
//         letterGroup.lookAt(0, y, 0);
        
//         // Add to scene
//         scene.add(letterGroup);
        
//         // Save reference with animation properties
//         charactersRef.current.push({
//           object: letterGroup,
//           originalY: letterGroup.position.y,
//           floatSpeed: 0.2 + Math.random() * 0.3,
//           rotationSpeed: (0.005 + Math.random() * 0.005) / 3, // 3x slower
//           floatAmplitude: 0.8 + Math.random() * 0.4,
//           characterType: 'letter'
//         });
//       }
//     };
    
//     // Create floating headphones
//     const createFloatingHeadphones = (scene: THREE.Scene, colors: ColorPalette): void => {
//       const headphonesGroup = new THREE.Group();
//       headphonesGroup.userData = { type: 'loopbopCharacter', characterType: 'headphones' };
      
//       // Pick colors
//       const mainColor = colors[Math.floor(Math.random() * colors.length)];
//       const mainMaterial = new THREE.MeshPhongMaterial({
//         color: parseInt(mainColor.replace('#', '0x')),
//         emissive: parseInt(mainColor.replace('#', '0x')),
//         emissiveIntensity: 0.3,
//         shininess: 70
//       });
      
//       // Headband (curved tube)
//       const headbandCurve = new THREE.CubicBezierCurve3(
//         new THREE.Vector3(-2, 0, 0),
//         new THREE.Vector3(-2, 2, 0),
//         new THREE.Vector3(2, 2, 0),
//         new THREE.Vector3(2, 0, 0)
//       );
      
//       const headbandGeometry = new THREE.TubeGeometry(headbandCurve, 20, 0.2, 8, false);
//       const headband = new THREE.Mesh(headbandGeometry, mainMaterial);
      
//       // Ear cups
//       const leftCup = new THREE.Mesh(
//         new THREE.CylinderGeometry(0.8, 0.8, 0.5, 16).rotateX(Math.PI/2),
//         mainMaterial
//       );
//       leftCup.position.set(-2, 0, 0);
      
//       const rightCup = new THREE.Mesh(
//         new THREE.CylinderGeometry(0.8, 0.8, 0.5, 16).rotateX(Math.PI/2),
//         mainMaterial
//       );
//       rightCup.position.set(2, 0, 0);
      
//       // Ear pads (torus)
//       const padMaterial = new THREE.MeshPhongMaterial({
//         color: 0x333333,
//         emissive: 0x111111,
//         emissiveIntensity: 0.2,
//         shininess: 30
//       });
      
//       const leftPad = new THREE.Mesh(
//         new THREE.TorusGeometry(0.8, 0.3, 8, 24).rotateY(Math.PI/2),
//         padMaterial
//       );
//       leftPad.position.set(-2, 0, 0);
      
//       const rightPad = new THREE.Mesh(
//         new THREE.TorusGeometry(0.8, 0.3, 8, 24).rotateY(Math.PI/2),
//         padMaterial
//       );
//       rightPad.position.set(2, 0, 0);
      
//       // Add glowing music symbols on the ear cups
//       const symbolMaterial = new THREE.MeshBasicMaterial({
//         color: 0xFFFFFF,
//         transparent: true,
//         opacity: 0.8
//       });
      
//       const leftSymbol = createMusicSymbol(symbolMaterial, 0.5);
//       leftSymbol.position.set(-2, 0, 0.3);
//       leftSymbol.rotation.y = Math.PI;
      
//       const rightSymbol = createMusicSymbol(symbolMaterial, 0.5);
//       rightSymbol.position.set(2, 0, 0.3);
      
//       // Helper to create a music symbol (eighth note)
//       function createMusicSymbol(material: THREE.Material, size: number): THREE.Group {
//         const group = new THREE.Group();
        
//         // Note head
//         const head = new THREE.Mesh(
//           new THREE.SphereGeometry(size * 0.3, 16, 16).scale(1, 1.5, 0.8),
//           material
//         );
//         head.rotation.z = Math.PI / 4;
        
//         // Stem
//         const stem = new THREE.Mesh(
//           new THREE.CylinderGeometry(size * 0.05, size * 0.05, size, 8),
//           material
//         );
//         stem.position.y = size * 0.5;
        
//         group.add(head);
//         group.add(stem);
//         return group;
//       }
      
//       headphonesGroup.add(headband);
//       headphonesGroup.add(leftCup);
//       headphonesGroup.add(rightCup);
//       headphonesGroup.add(leftPad);
//       headphonesGroup.add(rightPad);
//       headphonesGroup.add(leftSymbol);
//       headphonesGroup.add(rightSymbol);
      
//       // Position the headphones
//       headphonesGroup.position.set(20, 12, -15);
//       headphonesGroup.rotation.set(Math.PI/6, Math.PI/4, 0);
      
//       // Add to scene and save reference
//       scene.add(headphonesGroup);
//       charactersRef.current.push({
//         object: headphonesGroup,
//         originalY: headphonesGroup.position.y,
//         floatSpeed: 0.4,
//         rotationSpeed: 0.007 / 3, // 3x slower
//         floatAmplitude: 1.5,
//         characterType: 'headphones'
//       });
//     };
    
//     // Create vinyl records
//     const createVinylRecords = (scene: THREE.Scene, colors: ColorPalette): void => {
//       for (let i = 0; i < 4; i++) {
//         const recordGroup = new THREE.Group();
//         recordGroup.userData = { type: 'loopbopCharacter', characterType: 'vinyl' };
        
//         // Pick a random color for the label
//         const labelColor = colors[Math.floor(Math.random() * colors.length)];
        
//         // Vinyl disc
//         const discGeometry = new THREE.CylinderGeometry(3, 3, 0.1, 32);
//         const discMaterial = new THREE.MeshPhongMaterial({
//           color: 0x111111,
//           shininess: 90,
//           specular: 0x333333
//         });
//         const disc = new THREE.Mesh(discGeometry, discMaterial);
//         disc.rotation.x = Math.PI / 2;
        
//         // Add grooves (rings) to the vinyl
//         for (let r = 0.5; r < 2.8; r += 0.1) {
//           const ringGeometry = new THREE.RingGeometry(r, r + 0.03, 64);
//           const ringMaterial = new THREE.MeshBasicMaterial({
//             color: 0x222222,
//             side: THREE.DoubleSide
//           });
//           const ring = new THREE.Mesh(ringGeometry, ringMaterial);
//           ring.rotation.x = -Math.PI / 2;
//           ring.position.y = 0.051;
//           disc.add(ring);
//         }
        
//         // Center label
//         const labelGeometry = new THREE.CylinderGeometry(1, 1, 0.12, 32);
//         const labelMaterial = new THREE.MeshPhongMaterial({
//           color: parseInt(labelColor.replace('#', '0x')),
//           emissive: parseInt(labelColor.replace('#', '0x')),
//           emissiveIntensity: 0.3,
//           shininess: 60
//         });
//         const label = new THREE.Mesh(labelGeometry, labelMaterial);
//         label.position.y = 0.01;
//         label.rotation.x = Math.PI / 2;
        
//         // Center hole
//         const holeGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.2, 16);
//         const holeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
//         const hole = new THREE.Mesh(holeGeometry, holeMaterial);
//         hole.rotation.x = Math.PI / 2;
        
//         recordGroup.add(disc);
//         recordGroup.add(label);
//         recordGroup.add(hole);
        
//         // Position randomly in circular pattern
//         const angle = (i / 4) * Math.PI * 2;
//         const distance = 25 + Math.random() * 10;
//         const height = 5 + Math.random() * 12;
        
//         recordGroup.position.set(
//           Math.cos(angle) * distance,
//           height,
//           Math.sin(angle) * distance
//         );
        
//         // Tilt slightly for visual interest
//         recordGroup.rotation.set(
//           Math.random() * 0.3,
//           Math.random() * Math.PI * 2,
//           Math.random() * 0.3
//         );
        
//         // Add to scene and save reference
//         scene.add(recordGroup);
//         charactersRef.current.push({
//           object: recordGroup,
//           originalY: recordGroup.position.y,
//           floatSpeed: 0.3 + Math.random() * 0.3,
//           rotationSpeed: (0.01 + Math.random() * 0.01) / 3, // 3x slower
//           spinSpeed: (0.03 + Math.random() * 0.02) / 3, // 3x slower vinyl spin
//           floatAmplitude: 0.8 + Math.random() * 0.7,
//           characterType: 'vinyl'
//         });
//       }
//     };
    
//     // Create DJ mixer character
//     const createDjMixerCharacter = (scene: THREE.Scene, colors: ColorPalette): void => {
//       const mixerGroup = new THREE.Group();
//       mixerGroup.userData = { type: 'loopbopCharacter', characterType: 'djMixer' };
      
//       // Pick colors
//       const baseColor = colors[Math.floor(Math.random() * colors.length)];
//       const accentColor = colors[(colors.indexOf(baseColor) + 3) % colors.length];
      
//       const baseMaterial = new THREE.MeshPhongMaterial({
//         color: parseInt(baseColor.replace('#', '0x')),
//         emissive: parseInt(baseColor.replace('#', '0x')),
//         emissiveIntensity: 0.3,
//         shininess: 80
//       });
      
//       const accentMaterial = new THREE.MeshPhongMaterial({
//         color: parseInt(accentColor.replace('#', '0x')),
//         emissive: parseInt(accentColor.replace('#', '0x')),
//         emissiveIntensity: 0.4,
//         shininess: 90
//       });
      
//       // Mixer base
//       const base = new THREE.Mesh(
//         new THREE.BoxGeometry(8, 1, 4),
//         baseMaterial
//       );
      
//       // Create turntables
//       const leftPlatter = new THREE.Mesh(
//         new THREE.CylinderGeometry(1.2, 1.2, 0.2, 32),
//         accentMaterial
//       );
//       leftPlatter.position.set(-2.5, 0.6, 0);
//       leftPlatter.rotation.x = Math.PI / 2;
      
//       const rightPlatter = new THREE.Mesh(
//         new THREE.CylinderGeometry(1.2, 1.2, 0.2, 32),
//         accentMaterial
//       );
//       rightPlatter.position.set(2.5, 0.6, 0);
//       rightPlatter.rotation.x = Math.PI / 2;
      
//       // Mixer controls (buttons and faders)
//       const controlsPanel = new THREE.Mesh(
//         new THREE.BoxGeometry(3, 0.2, 3),
//         new THREE.MeshPhongMaterial({ color: 0x222222 })
//       );
//       controlsPanel.position.set(0, 0.6, 0);
      
//       // Add fader tracks
//       for (let i = 0; i < 3; i++) {
//         const faderTrack = new THREE.Mesh(
//           new THREE.BoxGeometry(0.2, 0.05, 2),
//           new THREE.MeshBasicMaterial({ color: 0x444444 })
//         );
//         faderTrack.position.set(-0.8 + i * 0.8, 0.7, 0);
        
//         const fader = new THREE.Mesh(
//           new THREE.BoxGeometry(0.3, 0.1, 0.3),
//           new THREE.MeshPhongMaterial({ color: 0xFFFFFF })
//         );
//         fader.position.y = 0.03;
//         fader.position.z = Math.random() * 1.6 - 0.8; // Random fader position
        
//         faderTrack.add(fader);
//         controlsPanel.add(faderTrack);
//       }
      
//       // Add buttons and knobs with glowing effect
//       for (let i = 0; i < 6; i++) {
//         const row = Math.floor(i / 3);
//         const col = i % 3;
        
//         const buttonColor = colors[Math.floor(Math.random() * colors.length)];
//         const buttonMaterial = new THREE.MeshPhongMaterial({
//           color: parseInt(buttonColor.replace('#', '0x')),
//           emissive: parseInt(buttonColor.replace('#', '0x')),
//           emissiveIntensity: 0.6,
//           shininess: 100
//         });
        
//         const button = new THREE.Mesh(
//           new THREE.CylinderGeometry(0.15, 0.15, 0.1, 16),
//           buttonMaterial
//         );
//         button.position.set(-0.8 + col * 0.8, 0.7, -1 + row * 0.6);
//         button.rotation.x = Math.PI / 2;
        
//         controlsPanel.add(button);
//       }
      
//       mixerGroup.add(base);
//       mixerGroup.add(leftPlatter);
//       mixerGroup.add(rightPlatter);
//       mixerGroup.add(controlsPanel);
      
//       // Position the mixer
//       mixerGroup.position.set(15, 8, 22);
//       mixerGroup.rotation.y = -Math.PI / 3;
      
//       // Add to scene and save reference
//       scene.add(mixerGroup);
//       charactersRef.current.push({
//         object: mixerGroup,
//         originalY: mixerGroup.position.y,
//         floatSpeed: 0.35,
//         rotationSpeed: 0.003 / 3, // 3x slower
//         floatAmplitude: 1,
//         isMixer: true,
//         spinPlatters: true,
//         characterType: 'djMixer'
//       });
//     };
    
//     // Start animation
//     const animateCharacters = (): void => {
//       // Animation loop
//       const animate = (): void => {
//         charactersRef.current.forEach(char => {
//           if (!char.object) return;
          
//           // Basic floating animation
//           char.object.position.y = char.originalY + Math.sin(Date.now() * 0.001 * char.floatSpeed) * char.floatAmplitude;
          
//           // Gentle rotation
//           char.object.rotation.y += char.rotationSpeed;
          
//           // Special animation for vinyl records
//           if (char.characterType === 'vinyl' && char.spinSpeed) {
//             // Spin the record - 3x slower
//             char.object.rotation.z += char.spinSpeed;
//           }
          
//           // Special animation for DJ mixer
//           if (char.isMixer && char.spinPlatters) {
//             // Spin the turntables - 3x slower
//             const leftPlatter = char.object.children[1];
//             const rightPlatter = char.object.children[2];
            
//             if (leftPlatter && rightPlatter) {
//               leftPlatter.rotation.z += 0.02 / 3; // 3x slower
//               rightPlatter.rotation.z += 0.03 / 3; // 3x slower
//             }
            
//             // Animate the faders - same speed since it's a subtle movement
//             const controlPanel = char.object.children[3];
//             if (controlPanel) {
//               controlPanel.children.forEach(faderTrack => {
//                 if (faderTrack.children[0]) {
//                   faderTrack.children[0].position.z = Math.sin(Date.now() * 0.002 + faderTrack.position.x) * 0.8;
//                 }
//               });
//             }
//           }
//         });
        
//         if (typeof window !== 'undefined') {
//           window.requestAnimationFrame(animate);
//         }
//       };
      
//       animate();
//     };
    
//     // Initialize
//     createCharacters();
//     animateCharacters();
    
//     // Cleanup function
//     return () => {
//       if (charactersRef.current.length > 0 && scene) {
//         charactersRef.current.forEach(char => {
//           if (char.object) {
//             scene.remove(char.object);
            
//             // Dispose geometry and materials
//             if (char.object instanceof THREE.Mesh) {
//               if (char.object.geometry) char.object.geometry.dispose();
//               if (char.object.material) {
//                 if (Array.isArray(char.object.material)) {
//                   char.object.material.forEach(material => material.dispose());
//                 } else {
//                   char.object.material.dispose();
//                 }
//               }
//             } else if (char.object instanceof THREE.Group) {
//               char.object.traverse(child => {
//                 if (child instanceof THREE.Mesh) {
//                   if (child.geometry) child.geometry.dispose();
//                   if (child.material) {
//                     if (Array.isArray(child.material)) {
//                       child.material.forEach(material => material.dispose());
//                     } else {
//                       child.material.dispose();
//                     }
//                   }
//                 }
//               });
//             }
//           }
//         });
        
//         charactersRef.current = [];
//       }
//     };
//   }, []);
  
//   return null;
// };

// export default LoopBopCharacters;