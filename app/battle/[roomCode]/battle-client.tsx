"use client";

import { useEffect, useState, useRef, useLayoutEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Music, Trophy, Home, Users, Crown, ArrowLeft, CheckCircle, Circle } from 'lucide-react';
import YouTube from "react-youtube";
import ThreeJSBackground from "@/components/ThreeShape";
import ForceFieldOptions from "@/components/ForceFieldMulti";
import { io, Socket } from "socket.io-client";

// Define interfaces
interface QuestionOption {
  name: string;
  description: string;
}

interface Genre {
  name: string;
  family: string;
  description: string;
}

interface Player {
  id: string;
  name: string;
  isCreator: boolean;
  score: number;
  color?: string;
  isReady?: boolean; // Add isReady property to track ready status
}

interface GenreMatchDetails{
  userGenre: string;
  matchedWith: string;
  score: number;
  explanation?: string;
}

interface Round {
  roundNumber: number;
  songId: string;
  title: string;
  artist: string;
  album: string;
  options: QuestionOption[];
  correctAnswers: QuestionOption[];
  playerSelections: Record<string, string[]>;
  scores: Record<string, number>;
  status: "waiting" | "selecting" | "evaluating" | "completed";
  matchingDetails?: Record<string, GenreMatchDetails[]>;
}

interface GameState {
  roomCode: string;
  songCount: number;
  status: "waiting" | "started" | "round_in_progress" | "evaluating" | "completed";
  creatorId: string;
  players: Player[];
  currentRound: number;
  rounds: Round[];
  playersReady?: Record<string, boolean>; // Add playersReady to track who's ready
}

// Digital number component for arcade scoreboard
const DigitalNumber = ({ value, className = "" }: { value: number; className?: string }) => {
  // Each segment is identified by a letter (a through g)
  const segments = {
    0: ['a', 'b', 'c', 'd', 'e', 'f'],
    1: ['b', 'c'],
    2: ['a', 'b', 'g', 'e', 'd'],
    3: ['a', 'b', 'c', 'd', 'g'],
    4: ['f', 'g', 'b', 'c'],
    5: ['a', 'f', 'g', 'c', 'd'],
    6: ['a', 'f', 'g', 'c', 'd', 'e'],
    7: ['a', 'b', 'c'],
    8: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
    9: ['a', 'f', 'g', 'b', 'c', 'd']
  };

  const activeSegments = segments[value as keyof typeof segments] || [];

  return (
    <div className={`relative ${className || "w-6 h-12"}`}>
      {[
        { pos: "top-0 left-1 right-1 h-1", seg: "a" },
        { pos: "top-1 right-0 w-1 h-4", seg: "b" },
        { pos: "bottom-1 right-0 w-1 h-4", seg: "c" },
        { pos: "bottom-0 left-1 right-1 h-1", seg: "d" },
        { pos: "bottom-1 left-0 w-1 h-4", seg: "e" },
        { pos: "top-1 left-0 w-1 h-4", seg: "f" },
        { pos: "top-5 left-1 right-1 h-1", seg: "g" },
      ].map(({ pos, seg }) => (
        <div
          key={seg}
          className={`absolute ${pos} ${activeSegments.includes(seg) ? 'bg-cyan-400' : 'bg-gray-800'} transition-colors duration-200`}
        />
      ))}
    </div>
  );
};

// Arcade Scoreboard Component for selections tracking
const ArcadeScoreboard = ({ selected, total }: { selected: number; total: number }) => {
  // Convert numbers to individual digits
  const selectedDigits = selected.toString().padStart(2, '0').split('').map(Number);
  const totalDigits = total.toString().padStart(2, '0').split('').map(Number);
  
  return (
    <div className="p-2 rounded-lg border-2 border-pink-500 bg-black bg-opacity-80 backdrop-blur-md">      
      <div className="flex justify-center items-center gap-4">
        <div className="text-center">
          <div className="flex space-x-1 mb-1 animate-pulse">
            {selectedDigits.map((digit, idx) => (
              <DigitalNumber key={`selected-${idx}`} value={digit} className="w-6 h-12" />
            ))}
          </div>
          <p className="text-cyan-400 text-sm font-bold">PICKED</p>
        </div>
        
        <div className="text-cyan-400 text-2xl font-bold">:</div>
        
        <div className="text-center">
          <div className="flex space-x-1 mb-1">
            {totalDigits.map((digit, idx) => (
              <DigitalNumber key={`total-${idx}`} value={digit} className="w-6 h-12" />
            ))}
          </div>
          <p className="text-cyan-400 text-sm font-bold">TOTAL</p>
        </div>
      </div>
    </div>
  );
};

// Helper function to get standardized YouTube ID
const getStandardYouTubeId = (youtubeString: string): string => {
  if (!youtubeString) return "";
  
  // Handle URLs with v= parameter
  if (youtubeString.includes('v=')) {
    const parts = youtubeString.split('v=');
    return parts[1].split('&')[0]; // Remove any additional parameters
  }
  
  // Handle direct video IDs or youtu.be format
  if (youtubeString.includes('youtu.be/')) {
    return youtubeString.split('youtu.be/')[1].split('?')[0];
  }
  
  // Assume it's already a video ID
  return youtubeString;
};

const assignPlayerColors = (players: Player[]): Player[] => {
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
  
  return players.map((player, index) => ({
    ...player,
    color: POP_ART_COLORS[index % POP_ART_COLORS.length]
  }));
};

// Declare this to avoid TypeScript errors with setTimeout cleanup
declare global {
  interface Window {
    lastResetTimeout?: number;
    nextRoundTimeout?: number;
  }
}

// Client component that receives the unwrapped roomCode as a prop
export default function BattleGameClient({ roomCode }: { roomCode: string }) {
  const router = useRouter();
  // Component state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [gameState, setGameState] = useState<Partial<GameState> | null>(null);
  const [userId, setUserId] = useState<string>("");
  const [videoId, setVideoId] = useState("");

  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [optimisticallySelected, setOptimisticallySelected] = useState<string[]>([]);

  const [showRoundResults, setShowRoundResults] = useState(false);
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);
  const [showFinalResults, setShowFinalResults] = useState(false);
  const [containerDimensions, setContainerDimensions] = useState({ width: 800, height: 600 });
  const [selectionInProgress, setSelectionInProgress] = useState(false);
  const [roundComplete, setRoundComplete] = useState(false);
  const [nextRoundClicked, setNextRoundClicked] = useState(false);
  const [currentPlayerReady, setCurrentPlayerReady] = useState(false); // Track current player's ready status

  // just to satisfy eslint
  console.log(showRoundResults);
  console.log(nextRoundClicked);
  console.log(selectionInProgress)
  
  // Refs
  const forceFieldContainerRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const dimensionsRef = useRef({ width: 800, height: 600 });
  const frameRef = useRef<number | null>(null);
  
  // Keep track of the current view
  const [currentView, setCurrentView] = useState("loading");

  const clickAudioRef = useRef<HTMLAudioElement | null>(null);
  const roundStartAudioRef = useRef<HTMLAudioElement | null>(null);
  const roundResultAudioRef = useRef<HTMLAudioElement | null>(null);
  const finalAudioRef = useRef<HTMLAudioElement | null>(null);
  const readyAudioRef = useRef<HTMLAudioElement | null>(null);
  
  useEffect(() => {
    if (typeof window !== "undefined" && typeof Audio !== "undefined") {
      clickAudioRef.current = new Audio('/sounds/click.mp3');
      roundStartAudioRef.current = new Audio('/sounds/round-start.mp3');
      roundResultAudioRef.current = new Audio('/sounds/round-result.mp3');
      finalAudioRef.current = new Audio('/sounds/finally.wav');
      readyAudioRef.current = new Audio('/sounds/ready-click.wav');
    }
  }, []);
  
  // Get current round info from game state
  const currentRound = gameState?.rounds?.[gameState.currentRound || 0];  
  
  // Calculate options per player
  const optionsPerPlayer = useCallback(() => {
    if (!currentRound || !gameState?.players) return 1;
    
    return Math.max(1, currentRound.correctAnswers?.length || 1);
  }, [currentRound, gameState?.players]);

  const handleOptionSelect = useCallback(
    (option: string) => {
      clickAudioRef.current?.play();  
      if (!socketRef.current) {
        console.error("Socket not connected");
        return;
      }
      if (!currentRound || currentRound.status !== 'selecting') {
          console.warn("Cannot select: Not in selecting phase.");
          return;
      }

      const max = optionsPerPlayer();

      // Combined check: already confirmed OR already optimistically selected
      if (selectedAnswers.includes(option) || optimisticallySelected.includes(option)) {
        console.log("Option already selected (confirmed or optimistically):", option);
        return;
      }

      // Combined check: quota reached considering confirmed AND optimistic selections
      if (selectedAnswers.length + optimisticallySelected.length >= max) {
        console.log(`Max selections (${max}) reached (considering optimistic).`);
        // Optionally show a brief message to the user
        // e.g., toast.info(`You can only select ${max} options.`);
        return;
      }

      console.log(`Optimistically selecting: ${option}`);
      // 1. Optimistic UI Update: Add to temporary optimistic state
      setOptimisticallySelected(prev => [...prev, option]);
      // UI rendering will now use `allSelectedForDisplay` which includes this

      // 2. Emit event to server with ACK callback
      socketRef.current.emit(
        "select-genre",
        { option },
        (ack: {
            status: "success" | "fail";
            // Server sends back the user's *confirmed* selections on success
            playerSelections?: Record<string, string[]>;
            message?: string;
         }) => {
          console.log(`ACK received for ${option}:`, ack);

          // 3. Remove from optimistic state regardless of outcome
          // Use functional update to ensure we're working with the latest state
          setOptimisticallySelected(prevOptimistic => prevOptimistic.filter(item => item !== option));

          if (ack.status === "success" && ack.playerSelections) {
            // 4a. SUCCESS: Server confirmed.
            // Sync local *confirmed* selections with the server's accurate state for this user provided in the ACK.
            // This makes the UI instantly consistent for the user even before the broadcast.
            const myConfirmedSelections = ack.playerSelections[userId] || [];
            setSelectedAnswers(myConfirmedSelections);
            console.log(`Selection confirmed via ACK for ${option}. My selections now:`, myConfirmedSelections);

            // Optional: Trigger visual refresh if needed (e.g., ForceField might need explicit trigger)
            // Consider if ForceField already reacts to selectedAnswers change. If not:
            // setContainerDimensions(prev => ({ ...prev, width: prev.width + 0.0001 }));
            // setTimeout(() => setContainerDimensions(dimensionsRef.current), 50);

          } else if (ack.status === "fail") {
            // 4b. FAIL: Server rejected.
            // State is already reverted by removing from `optimisticallySelected`.
            // `selectedAnswers` remains unchanged.
            console.warn(`Selection failed for ${option}: ${ack.message || 'Unknown reason'}`);
            // Optionally: Show a brief error message to the user (e.g., using a toast library)
            // e.g., toast.error(`Couldn't select ${option}: ${ack.message}`);
          } else {
             // Handle unexpected ACK format (optional)
             console.error("Received unexpected ACK format:", ack);
          }
        }
      );
    },
    [
      socketRef,
      currentRound, // Add dependency
      selectedAnswers,
      optimisticallySelected,
      optionsPerPlayer,
      userId,
      // No need for setGameState here directly
    ]
  );


  // Function to check if the current player has already made all selections
  const hasCompletedSelections = useCallback(() => {
    if (!currentRound || !userId) return false;
    
    const mySelections = currentRound.playerSelections?.[userId] || [];
    const requiredSelections = optionsPerPlayer();
    
    console.log(`Selection check: ${mySelections.length}/${requiredSelections}`);
    return mySelections.length >= requiredSelections;
  }, [currentRound, userId, optionsPerPlayer]);
  
  // Function to check if round is complete (all players have selected all options)
  const isRoundComplete = useCallback(() => {
    if (!currentRound || !gameState?.players) return false;
    
    // Get all real player IDs and their selection counts
    const realPlayerIds = gameState.players.map(p => p.id);
    const requiredSelections = optionsPerPlayer();
    
    // Check if all players have made enough selections
    return realPlayerIds.every(playerId => {
      const playerSelections = currentRound.playerSelections?.[playerId] || [];
      return playerSelections.length >= requiredSelections;
    });
  }, [currentRound, gameState?.players, optionsPerPlayer]);
  
  // Function to check if all players are ready to proceed to next round
  const areAllPlayersReady = useCallback(() => {
    if (!gameState?.players || !gameState?.playersReady) return false;
    
    // Get all player IDs 
    const realPlayerIds = gameState.players.map(p => p.id);
    
    // Check if all players are ready
    return realPlayerIds.every(playerId => gameState.playersReady?.[playerId] === true);
  }, [gameState?.players, gameState?.playersReady]);
  
  // Get the current player
  const currentPlayer = gameState?.players?.find(p => p.id === userId);
  
  // Stable dimensions handling with proper memoization
  useLayoutEffect(() => {
    if (!forceFieldContainerRef.current) return;
    
    // Function to measure dimensions but only update state when significantly changed
    const measureDimensions = () => {
      if (!forceFieldContainerRef.current) return;
      
      const rect = forceFieldContainerRef.current.getBoundingClientRect();
      const newWidth = Math.floor(rect.width);
      const newHeight = Math.floor(rect.height);
      
      // Store current dimensions in ref (doesn't cause re-render)
      dimensionsRef.current = { 
        width: newWidth, 
        height: newHeight 
      };
      
      // Only update state if dimensions changed significantly
      setContainerDimensions(prev => {
        if (
          Math.abs(prev.width - newWidth) > 20 || 
          Math.abs(prev.height - newHeight) > 20
        ) {
          console.log("Dimensions changed significantly:", newWidth, newHeight);
          return { width: newWidth, height: newHeight };
        }
        return prev;
      });
    };
    
    // Initial measurement
    measureDimensions();
    
    // Setup resize observer
    const observer = new ResizeObserver(() => {
      // Cancel any pending frame
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      
      // Schedule a new frame for measurement
      frameRef.current = requestAnimationFrame(measureDimensions);
    });
    
    observer.observe(forceFieldContainerRef.current);
    
    return () => {
      observer.disconnect();
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [currentView]); // Only re-run when view changes
  
  // Socket connection and game state initialization
  useEffect(() => {


    const handleSelectionsUpdated = (data: {
        playerSelections: Record<string, string[]>;
        player: string;
        option: string;
        status: string;
        playerSelectionCounts: Record<string, number>;
        optionsPerPlayer: number;
    }) => {
        console.log('Processing broadcast: selections-updated', data);
      
        setGameState(prev => {
            if (!prev || !prev.rounds || prev.currentRound === undefined || !prev.rounds[prev.currentRound]) {
                console.warn("Cannot update selections, invalid game state:", prev);
                return prev;
            }

            // Deep clone is important here to avoid mutation issues
            const newState = typeof structuredClone !== 'undefined'
                ? structuredClone(prev)
                : JSON.parse(JSON.stringify(prev));

            // Update the player selections in the current round of the gameState
            const currentRoundState = { ...newState.rounds[newState.currentRound] };
            currentRoundState.playerSelections = data.playerSelections;
            newState.rounds = [
                ...newState.rounds.slice(0, newState.currentRound),
                currentRoundState,
                ...newState.rounds.slice(newState.currentRound + 1)
            ];

            return newState;
        });

        // **Crucially, re-sync the local `selectedAnswers` based on the broadcasted truth**
        // This ensures consistency even if the ACK arrives slightly after the broadcast.
        // The ACK handler might re-set this, but it should converge to the same state.
        const myServerSelections = data.playerSelections[userId] || [];
        setSelectedAnswers(myServerSelections);
        setSelectedAnswers(prevSelected => {
          // Only log if it actually changes
          if (JSON.stringify(prevSelected) !== JSON.stringify(myServerSelections)) {
               console.log("Synced local selectedAnswers from broadcast:", myServerSelections);
          }
          return myServerSelections;
        });

        // Trigger ForceField refresh if needed
        // setContainerDimensions(prev => ({ ...prev, width: prev.width + 0.0001 }));
        // setTimeout(() => setContainerDimensions(dimensionsRef.current), 50);
    };

    
    const initSocket = async () => {
      try {
        // First get the user ID
        const token = localStorage.getItem("token");
        if (!token) {
          router.push("/auth");
          return;
        }
        
        // Fetch user data to get ID
        const response = await fetch("/api/user", {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (!response.ok) {
          throw new Error("Failed to fetch user data");
        }
        
        const userData = await response.json();
        const userIdValue = userData._id || userData.id || userData.email;
        setUserId(userIdValue);
        
        console.log("Initializing socket connection for user:", userIdValue);
        
        // Initialize socket with better connection options
        const socket = io({
          path: '/api/socket',
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          transports: ['polling', 'websocket']
        });
        
        socket.on('connect', () => {
          console.log('Socket connected with ID:', socket.id);
          
          // Join the room with a bit of delay to ensure socket is fully established
          setTimeout(() => {
            console.log('Emitting join-room for', roomCode, 'as user', userIdValue);
            
            socket.emit('join-room', {
              roomCode,
              userId: userIdValue,
              token
            });
          }, 500);
        });

        // Better connection error handling
        socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
            setError('Failed to connect to game server: ' + error.message);
            setLoading(false);
        });
  
        // Room joined handler
        socket.on('room-joined', (data) => {
          console.log('Room joined data received:', data);
          
          // Complete game state update with all data
          const coloredPlayers = assignPlayerColors(data.players || []);
          setGameState(() => ({
            ...data,
            players: coloredPlayers
          }));
          
          // Set initial view based on room status
          if (data.status === 'waiting') {
            console.log('Setting view to waiting - room is in waiting state');
            setCurrentView('waiting');
          } else if (data.status === 'evaluating') {
            console.log('Setting view to results - room is in evaluating state');
            setCurrentView('results');
            setShowRoundResults(true);
            
            // Check if this is the final round
            if (data.currentRound === data.songCount - 1 && 
                data.rounds[data.currentRound].status === 'completed') {
              console.log('This is the final round - showing final results');
              setShowFinalResults(true);
            }
            
            // Reset ready status when joining a room in evaluating state
            setCurrentPlayerReady(data.playersReady?.[userIdValue] === true);
          } else if (data.status === 'round_in_progress') {
            console.log('Setting view to playing - room is in round_in_progress state');
            setCurrentView('playing');
            
            if (data.rounds && data.rounds[data.currentRound]) {
              const round = data.rounds[data.currentRound];
              console.log('Current round data:', round);
              
              // Set YouTube video
              const videoIdStr = getStandardYouTubeId(round.songId);
              console.log('Setting video ID to:', videoIdStr);
              setVideoId(videoIdStr);
              
              // Set selected answers
              if (round.playerSelections && round.playerSelections[userIdValue]) {
                console.log('Setting selected answers for current user:', round.playerSelections[userIdValue]);
                setSelectedAnswers(round.playerSelections[userIdValue]);
              } else {
                console.log('No selections found for current user, setting empty array');
                setSelectedAnswers([]);
              }
              
            }
          } else {
            console.warn('Unknown game state:', data.status);
          }
          
          setLoading(false);
        });
        
        // Player joined handler
        socket.on('player-joined', (data) => {
          console.log('Player joined event received:', data);
          
          // Update game state players
          setGameState(prev => {
            if (!prev) return prev;
            const coloredPlayers = assignPlayerColors(data.players || []);
            return { 
              ...prev, 
              players: coloredPlayers 
            };
          });
        });
        
        // Player left handler
        socket.on('player-left', (data) => {
          console.log('Player left event received:', data);
          
          setGameState(prev => {
            if (!prev) return prev;
            const updatedPlayers = prev.players?.filter(p => p.id !== data.userId) || [];
            console.log('Updated players after removal:', updatedPlayers);
            return { 
              ...prev, 
              players: updatedPlayers
            };
          });
        });
        
        // Game started handler
        socket.on('game-started', (data) => {
          console.log('Game started event received:', data);
          
          // Complete state update
          setGameState(prev => {
            if (!prev) return prev;
            
            let updatedRounds = prev.rounds || [];
            // Make sure we have the latest round data
            if (data.round) {
              if (updatedRounds.length <= data.currentRound) {
                updatedRounds = [...updatedRounds, data.round];
              } else {
                updatedRounds = [
                  ...updatedRounds.slice(0, data.currentRound),
                  data.round,
                  ...updatedRounds.slice(data.currentRound + 1)
                ];
              }
            }
            
            return { 
              ...prev, 
              status: data.status,
              currentRound: data.currentRound,
              rounds: updatedRounds
            };
          });
          
          // Reset round-specific state
          setRoundComplete(false);
          setSelectedAnswers([]);
          setShowRoundResults(false);
          setCurrentView('playing');
          setVideoId(getStandardYouTubeId(data.round.songId));
        });
        
        // New round handler
        socket.on('new-round', (data) => {
          roundStartAudioRef.current?.play();
          if (window.nextRoundTimeout) {
            clearTimeout(window.nextRoundTimeout);
            window.nextRoundTimeout = undefined;
          }
          
          // Reset the button state
          setNextRoundClicked(false);
          setLoading(true);
          console.log('New round event received:', data);
            
          setGameState(prev => {
            if (!prev) return prev;
            
            const updatedRounds = [...(prev.rounds || [])];
            
            // Add or update the round
            if (updatedRounds.length <= data.currentRound) {
              updatedRounds.push(data.round);
            } else {
              updatedRounds[data.currentRound] = data.round;
            }
            
            return {
              ...prev,
              status: data.status,
              currentRound: data.currentRound,
              rounds: updatedRounds,
              playersReady: {} // Reset players ready status for new round
            };
          });
          
          // Reset round-specific state
          setRoundComplete(false);
          setSelectedAnswers([]);
          setOptimisticallySelected([]); // Reset optimistic
          setShowRoundResults(false);
          setSelectionInProgress(false);
          setCurrentPlayerReady(false); // Reset ready status for new round
          
          // Use setTimeout to ensure state updates are processed before view change
          setTimeout(() => {
            setCurrentView('playing');
            
            // Update video ID
            if (data.round && data.round.songId) {
              setVideoId(getStandardYouTubeId(data.round.songId));
            }
            setTimeout(() => {
              setLoading(false);
            }, 100);
          }, 50);
        });
        
        // Handle player ready status updates
        socket.on('players-ready-status', (data) => {
          console.log('Players ready status received:', data);
          
          // Update game state with new ready status
          setGameState(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              playersReady: data.playersReady
            };
          });
          
          // Also update current player's ready status
          if (data.playersReady && userIdValue in data.playersReady) {
            setCurrentPlayerReady(data.playersReady[userIdValue]);
          }
          
          // If all players are ready and we have an auto-advance, trigger it
          if (Object.values(data.playersReady || {}).every(ready => ready === true)) {
            console.log('All players are ready, auto-advancing to next round shortly...');
            
            // Small delay to let players see everyone is ready
            setTimeout(() => {
              console.log('User is creator, emitting next-round');
              socketRef.current?.emit('next-round');
            }, 1500);
          }
        });
        
        socket.on('selections-updated', handleSelectionsUpdated);   
          
        // Round complete handler
        socket.on('round-complete', () => {
          console.log('Round complete event received - all players have made their selections');
          setRoundComplete(true);
          
          // Add small random delay before each client tries to evaluate
          // This helps prevent multiple simultaneous evaluation requests
          const randomDelay = Math.floor(Math.random() * 300) + 500; // 500-800ms random delay
          
          // Auto-evaluate, but only if this client is the creator (still only one client evaluates)
          const isCreator = gameState?.players?.find(p => p.id === userIdValue && p.isCreator);
          
          if (isCreator) {
            console.log(`Creator will automatically evaluate round in ${randomDelay}ms`);
            setTimeout(() => {
              socket.emit('evaluate-round');
            }, randomDelay);
          } else {
            console.log('Waiting for host client to auto-evaluate');
          }
        })
        
        // Round evaluated handler
        socket.on('round-evaluated', (data) => {
          roundResultAudioRef.current?.play();
          console.log('Round evaluated event received:', data);
          
          const isHost = (data.players || []).some((p:Player) => p.id === userIdValue && p.isCreator);
          console.log(`User is host: ${isHost}`);
          
          // Check if we have matching details in the response
          const hasMatchingDetails = data.matchingDetails && Object.keys(data.matchingDetails).length > 0;
          console.log(`Has matching details: ${hasMatchingDetails}`);
          
          // Log a sample of the matching details for debugging if available
          if (hasMatchingDetails) {
            const samplePlayer = Object.keys(data.matchingDetails)[0];
            console.log(`Sample matching details for player ${samplePlayer}:`, 
              data.matchingDetails[samplePlayer].slice(0, 1));
          }
          
          setGameState(prev => {
            if (!prev) return prev;
            const updatedRounds = [...(prev.rounds || [])];
            if (updatedRounds[prev.currentRound || 0]) {
              updatedRounds[prev.currentRound || 0] = {
                ...updatedRounds[prev.currentRound || 0],
                scores: data.scores,
                status: 'completed',
                correctAnswers: data.correctAnswers,
                playerSelections: data.playerSelections,
                matchingDetails: data.matchingDetails // Store matching details
              };
            }
            return { 
              ...prev, 
              status: 'evaluating',
              creatorId: data.creatorId,
              players: data.players || prev.players,
              rounds: updatedRounds,
              playersReady: {} // Initialize empty ready status when round is evaluated
            };
          });
          
          // Reset ready status when round is evaluated
          setCurrentPlayerReady(false);
          
          setShowRoundResults(true);
          setCurrentView('results');
          
          // Clear loading state
          setLoading(false);
          
          // Additional logging to verify state
          console.log('State updated, view set to results');
        });
        
        // Game over handler
        socket.on('game-over', (data) => {
          finalAudioRef.current?.play();
          console.log('Game over event received:', data);
          
          setGameState(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              status: 'completed',
              players: data.players
            };
          });
          
          setShowFinalResults(true);
          setCurrentView('results');
        });
        
        // Error handler
        socket.on('error', (data) => {
          console.error('Error event received:', data);
          if (data.message) {
            setError(data.message);
          }
        });
        
        // Room closed handler
        socket.on('room-closed', (data) => {
          console.log('Room closed event received:', data);
          setError('The room has been closed by the host.');
          
          // Automatically return to dashboard after a delay
          setTimeout(() => {
            router.push('/dashboard');
          }, 3000);
        });
        
        // Store the socket for cleanup
        socketRef.current = socket;
        
        return socket;
        
      } catch (error) {
        console.error("Error initializing socket:", error);
        setError("Failed to connect to game server: " + (error as Error).message);
        setLoading(false);
        return null;
      }
    };
    
    initSocket();
    
    // Cleanup socket connection on unmount
    return () => {
      if (socketRef.current) {
        console.log('Disconnecting socket on component unmount');
        socketRef.current?.off('selections-updated', handleSelectionsUpdated);
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      if (window.lastResetTimeout) clearTimeout(window.lastResetTimeout);
      if (window.nextRoundTimeout) clearTimeout(window.nextRoundTimeout);
    };
  }, [socketRef, roomCode, router]); // Only dependencies that won't change

  useEffect(() => {
    if (!currentRound || !currentRound.playerSelections) return;
    
    // Log when player selections change
    console.log("Player selections changed:", currentRound.playerSelections);
    
    // Force update the container dimensions slightly to trigger re-render
    // This is a hack but ensures ForceField updates when selections change
    setContainerDimensions(prev => ({
      width: prev.width + 0.0001,
      height: prev.height
    }));
    
    // After a moment, reset the dimensions to avoid continuous small changes
    setTimeout(() => {
      setContainerDimensions(dimensionsRef.current);
    }, 100);
    
  }, [currentRound?.playerSelections]);

  const togglePlayerEvaluation = (playerId:string) => {
    setExpandedPlayerId(current => current === playerId ? null : playerId);
  };
  
  useEffect(() => {
    if (roundComplete && currentRound?.status === "selecting" && currentPlayer?.isCreator) {
      console.log('Auto-triggering round evaluation');
      handleEvaluateRound();
    }
  }, [roundComplete, currentRound?.status, currentPlayer?.isCreator]);

  const handleEvaluateRound = () => {
    if (!socketRef.current || !currentPlayer?.isCreator) {
      console.warn('Cannot evaluate round: socket not connected or user is not creator');
      return;
    }

    setLoading(true);

    console.log('Evaluating round');
    socketRef.current.emit('evaluate-round');
    
    setTimeout(() => {
        if (loading) {
        console.log('Evaluation response delayed - forcing UI update');
        setLoading(false);
        
        // Force transition to results view if server response is too delayed
        setGameState(prev => {
            if (!prev) return prev;
            return {
            ...prev,
            status: 'evaluating'
            };
        });
        setShowRoundResults(true);
        setCurrentView('results');
        }
    }, 3000); // 3 second timeout
    
    setRoundComplete(false);
  };
  
  // Handle player ready status
  const handleReadyToggle = () => {
    readyAudioRef.current?.play()
    if (!socketRef.current || !userId) {
      console.warn('Cannot set ready status: socket not connected or user ID not available');
      return;
    }
    
    // Toggle ready status
    const newReadyStatus = !currentPlayerReady;
    console.log(`Setting ready status to: ${newReadyStatus}`);
    
    // Update local state immediately for responsive UI
    setCurrentPlayerReady(newReadyStatus);
    
    // Emit to server
    socketRef.current.emit('player-ready', {
      isReady: newReadyStatus
    });
  };
    
  // Handle starting the game (creator only)
  const handleStartGame = () => {
    if (!socketRef.current || !currentPlayer?.isCreator) return;
    
    console.log('Starting game');
    socketRef.current.emit('start-game');
  };
  
  // Handle returning to dashboard
  const returnToDashboard = () => {
    router.push("/dashboard");
  };
  
  // Function to check if it's my turn
  const isMyTurn = useCallback(() => {
    return gameState?.status === 'round_in_progress' && 
           currentRound?.status === 'selecting' && 
           !isRoundComplete();
  }, [gameState?.status, currentRound?.status, isRoundComplete]);

  // Calculate ready players count
  const getReadyPlayersCount = useCallback(() => {
    if (!gameState?.playersReady || !gameState?.players) return 0;
    
    return Object.values(gameState.playersReady).filter(ready => ready === true).length;
  }, [gameState?.playersReady, gameState?.players]);

  // Format options for force field
  const formatOptionsForForceField = useCallback((
    options: Genre[] | QuestionOption[] | string[] | unknown[]
  ): QuestionOption[] => {
    if (!options || !Array.isArray(options)) {
      console.error('Invalid options data received:', options);
      return [];
    }

    return options.map(option => {
      if (typeof option === 'object' && option !== null && 'name' in option) {
        // It's either a Genre or QuestionOption object
        return {
          name: (option as { name: string }).name,
          description: 'description' in option ? 
            (option as { description: string }).description : 
            `${(option as { name: string }).name} music genre`
        };
      } 
      else if (typeof option === 'string') {
        return {
          name: option,
          description: `${option} music genre`
        };
      } 
      else {
        console.warn('Invalid option format:', option);
        return {
          name: String(option),
          description: 'Music genre'
        };
      }
    });
  }, []);

  const allSelectedForDisplay = useMemo(() => {
    // Use a Set to efficiently combine and deduplicate
    return Array.from(new Set([...selectedAnswers, ...optimisticallySelected]));
  }, [selectedAnswers, optimisticallySelected]);


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-cyan-400 to-pink-500 text-3xl font-bold animate-pulse p-4">
          Loading Game...
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
            onClick={returnToDashboard}
          >
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }
  
  if (!gameState) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="bg-gradient-to-r from-black to-indigo-900 p-8 rounded-lg border-4 border-pink-500 shadow-lg shadow-pink-500/30">
          <p className="text-pink-500 text-2xl font-bold mb-4">Game Not Found</p>
          <p className="text-white">The game could not be found or has ended.</p>
          <Button 
            className="mt-6 bg-pink-500 hover:bg-pink-600 text-black font-bold"
            onClick={returnToDashboard}
          >
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }
  
  // Waiting room display
  if (currentView === "waiting") {
    return (
      <div className="relative min-h-screen bg-black text-white overflow-hidden">
        <ThreeJSBackground />
        <div className="container mx-auto px-4 py-20 relative z-10 min-h-screen flex flex-col items-center justify-center">
          <Card className="w-full max-w-2xl border-4 border-purple-500 bg-black bg-opacity-80 backdrop-blur-md">
            <CardHeader className="border-b border-purple-500">
              <div className="flex justify-between items-center">
                <Button
                  variant="outline" 
                  className="rounded-full p-3 border-2 border-cyan-400 bg-transparent hover:bg-cyan-900/30"
                  onClick={returnToDashboard}
                >
                  <Home className="h-6 w-6 text-cyan-400" />
                </Button>
                <CardTitle className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
                  Waiting Room
                </CardTitle>
                <div className="w-12"></div> {/* Spacer for alignment */}
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="mb-6 text-center">
                <p className="text-2xl font-bold text-purple-300 mb-2">Room Code: {roomCode}</p>
                <p className="text-gray-300">Waiting for the host to start the game...</p>
              </div>
              
              <div className="bg-indigo-900/30 rounded-lg p-4 border border-purple-500 mb-6">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xl font-bold text-purple-300">Players</h3>
                  <div className="flex items-center">
                    <Users className="h-5 w-5 text-cyan-400 mr-2" />
                    <span>{gameState.players?.length || 0}</span>
                  </div>
                </div>
                
                <div className="max-h-48 overflow-y-auto pr-2">
                  <ul className="space-y-2">
                    {gameState.players?.map((player) => (
                      <li
                        key={player.id}
                        className="flex justify-between items-center p-3 bg-indigo-900/50 rounded-lg border border-indigo-700"
                      >
                        <span className="text-white font-semibold">{player.name}</span>
                        {player.isCreator && (
                          <span className="text-xs px-2 py-1 bg-purple-700 text-white rounded-full">
                            Host
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              
              <div className="flex justify-center">
                {currentPlayer?.isCreator ? (
                  <Button 
                    className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white text-xl font-bold py-3 px-8"
                    onClick={handleStartGame}
                    disabled={(gameState.players?.length || 0) < 2}
                  >
                    {(gameState.players?.length || 0) < 2 ? "Need More Players" : "Start Game"}
                  </Button>
                ) : (
                  <div className="bg-indigo-900/50 p-4 rounded-lg text-center">
                    <div className="animate-bounce mb-2">
                      <Music className="h-8 w-8 text-cyan-400 mx-auto" />
                    </div>
                    <p className="text-lg text-gray-300">Waiting for the host to start the game...</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  // Round results display
  if (currentView === "results") {
    return (
      <div className="relative min-h-screen bg-black text-white overflow-hidden">
        <ThreeJSBackground />
        <div className="container mx-auto px-4 py-20 relative z-10 min-h-screen flex flex-col items-center justify-center">
          <Card className="w-full max-w-3xl border-4 border-cyan-500 bg-black bg-opacity-80 backdrop-blur-md">
            <CardHeader className="border-b border-cyan-500">
              <div className="flex justify-between items-center">
                <Button
                  variant="outline" 
                  className="rounded-full p-3 border-2 border-cyan-400 bg-transparent hover:bg-cyan-900/30"
                  onClick={returnToDashboard}
                >
                  <Home className="h-6 w-6 text-cyan-400" />
                </Button>
                <CardTitle className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500">
                  {showFinalResults ? "Final Results" : `Round ${(gameState.currentRound || 0) + 1} Results`}
                </CardTitle>
                <div className="w-12"></div> {/* Spacer for alignment */}
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {/* Song info */}
              {currentRound && !showFinalResults && (
                <div className="mb-6 text-center">
                  <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">
                    {currentRound.title}
                  </h3>
                  <p className="text-xl text-cyan-300">{currentRound.artist}</p>
                  <p className="text-gray-400">{currentRound.album}</p>
                </div>
              )}
              
              {/* Round results */}
              <div className="bg-indigo-900/30 rounded-lg p-4 border border-purple-500 mb-6">
                <h3 className="text-xl font-bold text-purple-300 mb-3">
                  {showFinalResults ? "Final Scores" : "Round Scores"}
                </h3>
                
                <div className="space-y-3">
                  {[...(gameState.players || [])].filter(player => player && player.id)
                    .sort((a, b) => b.score - a.score)
                    .map((player, index) => {
                    // Get round score
                    const roundScore = currentRound?.scores?.[player.id] || 0;
                    
                    return (
                      <div 
                        key={`player-result-${player.id || index}-${index}`}
                        className={`flex flex-col rounded-lg ${
                          player.id === userId ? 'bg-purple-900/60 border border-purple-400' : 'bg-indigo-900/40'
                        }`}
                      >
                        {/* Player header row - clickable when there are evaluations */}
                        <div 
                          className={`flex items-center justify-between p-3 ${
                            !showFinalResults ? 'cursor-pointer hover:bg-indigo-800/40' : ''
                          }`}
                          onClick={() => !showFinalResults && togglePlayerEvaluation(player.id)}
                        >
                          <div className="flex items-center">
                            {index === 0 && (
                              <Crown className="h-6 w-6 text-yellow-400 mr-2" />
                            )}
                            <span className="font-semibold text-lg text-gray-200">{player.name || 'Unknown Player'}</span>
                            {player.isCreator && (
                              <span className="ml-2 text-xs px-2 py-0.5 bg-purple-700 text-white rounded-full">
                                Host
                              </span>
                            )}
                            {/* Ready status indicator */}
                            {!showFinalResults && (
                              <span className="ml-2 flex items-center">
                                {gameState.playersReady?.[player.id] ? (
                                  <CheckCircle className="h-5 w-5 text-green-400" />
                                ) : (
                                  <Circle className="h-5 w-5 text-gray-400" />
                                )}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-4">
                            {!showFinalResults && (
                              <div className="flex items-center bg-black/60 px-3 py-1 rounded-full border border-cyan-500">
                                <span className="text-cyan-400 font-bold">+{roundScore}</span>
                              </div>
                            )}
                            
                            <div className="flex items-center bg-black/60 px-3 py-1 rounded-full">
                              <Trophy className="h-5 w-5 text-yellow-400 mr-1" />
                              <span className="text-yellow-400 font-bold">{player.score}</span>
                            </div>
                            
                            {!showFinalResults && (
                              <div className="text-gray-300">
                                {expandedPlayerId === player.id ? 
                                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="m18 15-6-6-6 6"/>
                                  </svg> : 
                                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="m6 9 6 6 6-6"/>
                                  </svg>
                                }
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Player genre evaluations - only shown when expanded */}
                        {!showFinalResults && expandedPlayerId === player.id && (
                          <div className="p-3 border-t border-indigo-600/50 bg-indigo-900/20">
                            {currentRound?.playerSelections?.[player.id]?.length ? (
                              <div className="space-y-2">
                                {(currentRound.playerSelections[player.id] || []).map((selection, selIndex) => {
                                  const matchDetail = currentRound.matchingDetails?.[player.id]?.find(d => d.userGenre === selection);
                                  
                                  // Default styling for when we don't have matching details
                                  let scoreDisplay = null;
                                  let badgeClass = "bg-gray-800 text-gray-300 border-gray-600";
                                  let explanation = "No evaluation data available";
                                  
                                  if (matchDetail) {
                                    const score = matchDetail.score;
                                    
                                    // Set colors based on score ranges
                                    if (score === 100) {
                                      badgeClass = "bg-green-900/60 text-green-300 border-green-500";
                                    } else if (score >= 75) {
                                      badgeClass = "bg-teal-900/60 text-teal-300 border-teal-500";
                                    } else if (score >= 50) {
                                      badgeClass = "bg-blue-900/60 text-blue-300 border-blue-500";
                                    } else if (score > 0) {
                                      badgeClass = "bg-amber-900/60 text-amber-300 border-amber-500";
                                    } else {
                                      badgeClass = "bg-red-900/60 text-red-300 border-red-500";
                                    }
                                    
                                    scoreDisplay = (
                                      <span className="ml-2 px-2 py-0.5 bg-white/60 rounded-full text-sm">
                                        {score} pts
                                      </span>
                                    );
                                    
                                    explanation = matchDetail.explanation || explanation;
                                  }
                                  
                                  return (
                                    <div 
                                      key={`player-${player.id}-selection-${selIndex}-${selection}`}
                                      className="border border-gray-800 rounded p-2 bg-black/30"
                                    >
                                      <div className="flex items-center">
                                        <span 
                                          className={`px-3 py-1 rounded-full border ${badgeClass}`}
                                        >
                                          {selection}
                                        </span>
                                        {scoreDisplay}
                                      </div>
                                      
                                      {matchDetail && matchDetail.matchedWith && matchDetail.matchedWith !== selection && matchDetail.score > 0 && (
                                        <div className="mt-1 flex items-center">
                                          <span className="text-sm text-gray-400 mr-2">Matched with:</span>
                                          <span 
                                            className="px-2 py-0.5 bg-purple-900/60 text-purple-300 border border-purple-500 rounded-full text-sm"
                                          >
                                            {matchDetail.matchedWith}
                                          </span>
                                        </div>
                                      )}
                                      
                                      {/* Progress bar visualization similar to practice page */}
                                      {matchDetail && (
                                        <div className="mt-2">
                                          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                            <div 
                                              className={`h-full rounded-full ${
                                                matchDetail.score === 100 ? 'bg-gradient-to-r from-green-500 to-green-600' :
                                                matchDetail.score >= 70 ? 'bg-gradient-to-r from-teal-500 to-teal-600' :
                                                matchDetail.score >= 50 ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                                                matchDetail.score > 0 ? 'bg-gradient-to-r from-amber-500 to-amber-600' :
                                                'bg-gradient-to-r from-red-500 to-red-600'
                                              }`} 
                                              style={{ width: `${matchDetail.score}%` }}
                                            ></div>
                                          </div>
                                        </div>
                                      )}
                                      
                                      {matchDetail && (
                                        <p className="mt-1 text-xs text-gray-400">
                                          {explanation}
                                        </p>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="text-gray-400 italic text-center py-2">
                                No selections made by this player
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Correct answers */}
              {currentRound && !showFinalResults && (
                <div className="bg-indigo-900/30 rounded-lg p-4 border border-purple-500 mb-6">
                  <h3 className="text-xl font-bold text-purple-300 mb-3">Correct Genres</h3>
                  
                  <div className="flex flex-wrap gap-2">
                    {currentRound.correctAnswers?.map((option) => (
                      <span 
                        key={option.name}
                        className="px-3 py-1 bg-green-900/60 text-green-300 rounded-full border border-green-500"
                      >
                        {option.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Ready status indicator for non-final results */}
              {!showFinalResults && (
                <div className="flex justify-between items-center mb-4">
                  <div className="text-gray-300">
                    <span className="font-semibold">{getReadyPlayersCount()}</span> of <span className="font-semibold">{gameState.players?.length || 0}</span> players ready
                  </div>
                  
                  {/* Progress bar for ready players */}
                  <div className="w-1/2 bg-gray-800 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-green-600 h-full transition-all duration-300 ease-out" 
                      style={{ width: `${(getReadyPlayersCount() / (gameState.players?.length || 1)) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}
              
              {/* Navigation buttons */}
              <div className="flex justify-center">
                {showFinalResults ? (
                  <Button 
                    className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white text-xl font-bold py-3 px-8"
                    onClick={returnToDashboard}
                  >
                    Return to Dashboard
                  </Button>
                ) : (
                  <>
                    {/* Ready button for all players */}
                    <Button 
                      className={`${currentPlayerReady 
                        ? 'bg-green-600' 
                        : 'bg-green-600 hover:bg-green-700'} 
                        text-white text-xl font-bold py-3 px-8`}
                      onClick={handleReadyToggle}
                      disabled={currentPlayerReady}
                    >
                      {currentPlayerReady 
                        ? 'Ready' 
                        : 'Ready'}
                    </Button>
                  </>
                )}
              </div>
              
              {/* Ready players info */}
              {!showFinalResults && areAllPlayersReady() && (
                <div className="mt-4 text-center text-green-400 animate-pulse">
                  All players ready! Starting next round...
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  // Game play view - unchanged
  if (currentView === "playing") {
    // Calculate required selections
    const maxSelectionsAllowed = optionsPerPlayer();
    const mySelections = currentRound?.playerSelections?.[userId] || [];
    
    return (
      <div className="relative min-h-screen bg-black text-white overflow-hidden">
        <ThreeJSBackground />
        
        {/* Top header with back button */}
        <div className="absolute top-0 left-0 right-0 z-50 bg-gradient-to-b from-black to-transparent">
          <div className="container mx-auto p-4">
            <div className="flex justify-between items-center">
              <Button
                variant="outline" 
                className="rounded-full p-2 border-2 border-pink-400 bg-black/50 hover:bg-pink-900/30"
                onClick={returnToDashboard}
              >
                <ArrowLeft className="h-5 w-5 text-pink-400" />
              </Button>
              
              <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
                Round {(gameState.currentRound || 0) + 1}/{gameState.songCount}
              </div>
              
              <div className="w-12"></div> {/* Spacer for alignment */}
            </div>
          </div>
        </div>
        
        {/* Main content with revised layout */}
        <div className="container mx-auto px-4 pt-20 pb-6 relative z-10 min-h-screen flex flex-col md:flex-row">
          {/* Left sidebar with video and player info (1/4 width) */}
          <div className="w-full md:w-1/4 pr-4 flex flex-col space-y-4 mb-4 md:mb-0">
            {/* Video player now on left */}
            <div className="rounded-xl overflow-hidden border-2 border-purple-500 bg-black bg-opacity-80 backdrop-blur-md shadow-lg shadow-purple-500/20">
              <div className="w-full" style={{ height: "180px" }}>
                <YouTube
                  videoId={videoId}
                  opts={{
                    width: '100%',
                    height: '180',
                    playerVars: {
                      autoplay: 1,
                      modestbranding: 1,
                      controls: 1
                    },
                  }}
                  className="w-full h-full"
                />
              </div>
            </div>
            
            {/* Player scores box */}
            <Card className="border-2 border-pink-500 bg-black bg-opacity-80 backdrop-blur-md flex-grow">
              <CardHeader className="p-3 border-b border-pink-500/30">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg text-pink-300">Top Players</CardTitle>
                  <span className="text-xs text-gray-400">
                    {gameState.players?.length || 0} Total
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-3">
                <div className="space-y-2">
                  {/* Show only top 4 players sorted by score */}
                  {gameState.players
                    ?.filter(player => player && player.id)
                    .sort((a, b) => {
                      // First sort by score
                      if (b.score !== a.score) return b.score - a.score;
                      // Then prioritize current user and host
                      if (a.id === userId) return -1;
                      if (b.id === userId) return 1;
                      if (a.isCreator) return -1;
                      if (b.isCreator) return 1;
                      return 0;
                    })
                    .slice(0, 4) // Limit to top 4 players
                    .map((player) => {
                      const playerSelections = currentRound?.playerSelections?.[player.id] || [];
                      const selectionsCount = playerSelections.length;
                      const playerProgress = (selectionsCount / maxSelectionsAllowed) * 100;
                      
                      return (
                        <div 
                          key={`player-score-${player.id}`}
                          className={`p-3 rounded-lg ${
                            player.id === userId 
                              ? 'bg-purple-900/40 border border-purple-500' 
                              : 'bg-gray-900/50 border border-gray-800'
                          }`}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center">
                              <div 
                                className="w-3 h-3 rounded-full mr-2" 
                                style={{ backgroundColor: player.color || '#FFFFFF' }}
                              ></div>
                              <span className={`font-medium ${player.id === userId ? 'text-purple-300' : 'text-gray-300'}`}>
                                {player.name}
                                {player.isCreator && (
                                  <span className="ml-1 text-xs px-1 py-0.5 bg-purple-700 text-white rounded-full">
                                    Host
                                  </span>
                                )}
                              </span>
                            </div>
                            <div className="bg-black/60 px-2 py-0.5 rounded-full flex items-center">
                              <Trophy className="h-3 w-3 text-yellow-400 mr-1" />
                              <span className="text-yellow-400 text-sm font-medium">{player.score}</span>
                            </div>
                          </div>
                          
                          {/* Selection progress bar */}
                          <div className="h-1.5 bg-gray-800 rounded-full mt-2">
                            <div 
                              className={`h-full rounded-full ${selectionsCount >= maxSelectionsAllowed ? 'bg-green-500' : 'bg-cyan-600'}`} 
                              style={{ width: `${playerProgress}%` }}
                            ></div>
                          </div>
                          
                          {/* Selection count */}
                          <div className="flex justify-end mt-1">
                            <span className="text-xs text-gray-400">
                              {selectionsCount}/{maxSelectionsAllowed} selected
                            </span>
                          </div>
                        </div>
                      );
                    })
                  }
                  
                  {/* Show indication if there are more players */}
                  {(gameState.players?.length || 0) > 4 && (
                    <div className="text-center py-2 text-gray-400 text-sm">
                      + {(gameState.players?.length || 0) - 4} more players
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Right section with horizontal status and force field (3/4 width) */}
          <div className="w-full md:w-3/4 flex flex-col space-y-3">
            {/* Status box as horizontal bar */}
            <div className="rounded-xl border-2 border-cyan-500 bg-black bg-opacity-80 backdrop-blur-md shadow-lg shadow-cyan-500/20 p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex-grow">
                  <p className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
                    {isMyTurn() 
                      ? hasCompletedSelections()
                        ? "Done! Waiting for others to select genres..."
                        : "Game start! Double click the right genres" 
                      : roundComplete 
                        ? "All selections complete!" 
                        : "Waiting for players to make selections..."}
                  </p>
                </div>
                
                {/* Original arcade scoreboard */}
                <ArcadeScoreboard 
                  selected={mySelections.length} 
                  total={maxSelectionsAllowed} 
                />
              </div>
            </div>
            
            {/* Force Field container - now with more space */}
            <div 
              ref={forceFieldContainerRef} 
              className="flex-grow bg-black/30 rounded-xl border-2 border-pink-500/50 shadow-inner shadow-pink-500/20"
              style={{ height: "calc(100vh - 220px)", minHeight: "520px" }}
            >
              {currentRound && containerDimensions.width > 10 && (
                <ForceFieldOptions
                key={`forcefield-${roomCode}-${gameState.currentRound || 0}`}
                options={formatOptionsForForceField(currentRound.options || [])}
                selectedAnswers={allSelectedForDisplay}
                onSelect={handleOptionSelect}
                containerWidth={containerDimensions.width}
                containerHeight={containerDimensions.height}
                disabled={!isMyTurn() || (mySelections.length >= maxSelectionsAllowed)}
                playerSelections={currentRound.playerSelections || {}}
                userId={userId}
                players={gameState.players || []}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback view
  return (
    <div className="flex items-center justify-center min-h-screen bg-black">
      <div className="text-center">
        <p className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-cyan-400 to-pink-500 text-3xl font-bold mb-4">
          Loading game view...
        </p>
        <Button 
          className="bg-pink-500 hover:bg-pink-600 text-black font-bold"
          onClick={returnToDashboard}
        >
          Return to Dashboard
        </Button>
      </div>
    </div>
  );
}