import { Server as SocketIOServer, Socket as ServerSocket} from 'socket.io';
import { Server as HTTPServer } from 'http';
import { NextApiRequest } from 'next';
import { NextApiResponse } from 'next';
import { connectToDatabase } from "@/lib/mongodb";
import BattleRoom, { IBattleRoom, IPlayer } from "@/models/BattleRoom";
import User, { IUser } from "@/models/User";
import { getBattleData } from "@/lib/battleService";
import { Document } from 'mongoose';


// Define types for socket data
interface SocketData {
  userId: string;
  roomCode: string;
}

// Define types for socket events
interface ServerToClientEvents {
  'room-created': (data: RoomData) => void;
  'room-joined': (data: RoomData) => void;
  'player-joined': (data: { players: PlayerData[] }) => void;
  'player-left': (data: { userId: string }) => void;
  'selections-updated': (data: SelectionsUpdatedData) => void;
  'round-complete': () => void;
  'round-evaluated': (data: RoundEvaluatedData) => void;
  'new-round': (data: NewRoundData) => void;
  'game-started': (data: GameStartedData) => void;
  'game-over': (data: { players: PlayerData[] }) => void;
  'players-ready-status': (data: { playersReady: Record<string, boolean> }) => void;
  'error': (data: { message: string }) => void;
}

interface SelectGenreAckData {
  status: "success" | "fail";
  playerSelections?: Record<string, string[]>;
  message?: string;
}

interface ClientToServerEvents {
  'create-room': (data: CreateRoomData) => void;
  'join-room': (data: JoinRoomData) => void;
  'select-genre': (data: { option: string }, callback: (response: SelectGenreAckData) => void ) => void;
  'evaluate-round': () => void;
  'next-round': () => void;
  'start-game': () => void;
  'player-ready': (data: { isReady: boolean }) => void;
}

// Define types for event data
interface CreateRoomData {
  userId: string;
  songCount: number;
}

interface JoinRoomData {
  roomCode: string;
  userId: string;
}

interface PlayerData {
  id: string;
  name: string;
  isCreator: boolean;
  score: number;
}

interface RoomData {
  roomCode: string;
  players: PlayerData[];
  songCount: number;
  status: string;
  currentRound: number;
  creatorId: string;
  rounds: RoundData[];
  playersReady?: Record<string, boolean>;
}

interface RoundData {
  roundNumber: number;
  songId: string;
  title: string;
  artist: string;
  album?: string;
  explanation?: string;
  options: Genre[];  
  correctAnswers: { name: string; explanation?: string }[];
  playerSelections?: Map<string, string[]> | Record<string, string[]>;
  scores?: Map<string, number> | Record<string, number>;
  matchingDetails?: Map<string, MatchingDetail[]> | Record<string, MatchingDetail[]>;
  status: "selecting" | "completed";
}

interface MatchingDetail {
  userGenre: string;
  matchedWith: string | null;
  score: number;
  matchType: string;
  explanation: string;
}

interface SelectionsUpdatedData {
  playerSelections: Record<string, string[]>;
  player: string;
  status: string;
  option: string;
  playerSelectionCounts: Record<string, number>;
  optionsPerPlayer: number;
}

interface RoundEvaluatedData {
  scores: Record<string, number>;
  correctAnswers: { name: string; explanation?: string }[];
  playerSelections: Record<string, string[]>;
  matchingDetails: Record<string, MatchingDetail[]>;
  players: PlayerData[];
  creatorId: string;
  currentRound: number;
  songCount: number;
}

interface NewRoundData {
  currentRound: number;
  round: RoundData;
  status: string;
}

interface GameStartedData {
  status: string;
  currentRound: number;
  round: RoundData;
  creatorId: string;
}

interface BattleData {
  youtube: string;
  title: string;
  artist: string;
  album: string;
  explanation: string;
  options: Genre[]; // Changed from string[] to Genre[]
  correctAnswers: { name: string; explanation?: string }[];
}

interface ServiceBattleData {
  type: string;
  youtube: string;
  title: string;
  artist: string;
  album: string;
  explanation: string;
  options: Genre[];
  correctAnswers: Genre[];
  question: string;
}

function adaptBattleData(serviceBattleData: ServiceBattleData): BattleData {
  return {
    youtube: serviceBattleData.youtube,
    title: serviceBattleData.title,
    artist: serviceBattleData.artist,
    album: serviceBattleData.album,
    explanation: serviceBattleData.explanation,
    // Convert Genre[] to string[] by extracting the name property
    options: serviceBattleData.options,
    // Convert Genre[] to our expected correctAnswers format
    correctAnswers: serviceBattleData.correctAnswers.map(genre => ({
      name: genre.name,
      explanation: genre.description
    }))
  };
}

interface Genre {
  name: string;
  family: string;
  description: string;
}

type SocketNextApiResponse = NextApiResponse & {
  socket: {
    server: HTTPServer & {
      io?: SocketIOServer<ClientToServerEvents, ServerToClientEvents, object, SocketData>;
    };
  };
};

// Store active socket connections by roomCode
const activeRooms = new Map<string, Set<string>>();

// Helper function to generate room code
function generateRoomCode(): string {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// Helper functions to handle email addresses in keys
function encodeEmail(email: string): string {
  return email.replace(/\./g, '__DOT__');
}

function decodeEmail(encoded: string): string {
  return encoded.replace(/__DOT__/g, '.');
}

const fetchBattleData = async (playerCount: number): Promise<BattleData> => {
  try {
    // Ensure playerCount is an integer and at least 1
    const count = Math.max(1, Math.floor(Number(playerCount)));
    console.log(`Fetching battle data for ${count} players`);
    
    // Get the data from the battle service
    const serviceBattleData = await getBattleData(count);
    
    // Convert it to the format expected by socket.ts
    return adaptBattleData(serviceBattleData);
  } catch (error) {
    console.error('Error fetching battle data:', error);
    throw error;
  }
};

export default async function SocketHandler(
  req: NextApiRequest, 
  res: SocketNextApiResponse
): Promise<void> {
  if (res.socket.server.io) {
    console.log('Socket server already running');
    res.end();
    return;
  }

  console.log('Setting up socket server...');
  
  // Create socket server
  const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents, object, SocketData>(
    res.socket.server, 
    {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: '*',
        methods: ['GET', 'POST', 'OPTIONS']
      },
      transports: ['polling', 'websocket'],
      allowEIO3: true
    }
  );
  
  // Store io instance on server
  res.socket.server.io = io;
  console.log('Socket server started');

  // Handle connections
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('join-room', async (data: JoinRoomData) => {
      try {
        const { roomCode, userId } = data;
        
        if (!roomCode || !userId) {
          socket.emit('error', { message: 'Missing roomCode or userId' });
          return;
        }
        
        console.log(`User ${userId} joining room ${roomCode}`);
        
        // Add socket to room
        socket.join(roomCode);
        
        // Track this socket in active rooms
        if (!activeRooms.has(roomCode)) {
          activeRooms.set(roomCode, new Set<string>());
        }
        activeRooms.get(roomCode)?.add(socket.id);
        
        // Store user info on socket
        socket.data.userId = userId;
        socket.data.roomCode = roomCode;
        
        // Get room data from database
        await connectToDatabase();
        
        const room = await BattleRoom.findOne({ code: roomCode }) as (Document & IBattleRoom) | null;
        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }
        
        // Check if player is already in the room
        const existingPlayerIndex = room.players.findIndex((p: IPlayer) => p.userId === userId);
        
        // If player is not in the room, add them
        if (existingPlayerIndex === -1) {
          // Add player to the room
          const newPlayer: IPlayer = {
            userId,
            name: userId.split('@')[0], // Default name is username from email
            isCreator: false,
            score: 0
          };
          
          room.players.push(newPlayer);
          await room.save();
        }
        
        // Get all users
        const userIds = room.players.map(player => player.userId);
        const users = await User.find({ email: { $in: userIds } }) as (Document & IUser)[];
        
        // Format player data
        const players: PlayerData[] = room.players.map((player: IPlayer) => {
          const user = users.find(u => u.email === player.userId);
          return {
            id: player.userId,
            name: player.name || (user ? user.email.split('@')[0] : "Player"),
            isCreator: player.isCreator,
            score: player.score || 0
          };
        });
        
        // Create room data object to ensure consistency
        const roomData: RoomData = {
          roomCode,
          players,
          songCount: room.songCount,
          status: room.status,
          currentRound: room.currentRound,
          creatorId: room.creatorId,
          rounds: room.rounds || [],
          // Add playersReady to the response - convert Map to Record
          playersReady: room.playersReady 
            ? Array.from(room.playersReady).reduce((obj, [encodedKey, value]) => {
                const originalKey = decodeEmail(encodedKey);
                obj[originalKey] = value;
                return obj;
              }, {} as Record<string, boolean>) 
            : {}
        };
        
        // Send room data to the joining client
        socket.emit('room-joined', roomData);
        
        // Notify everyone in the room (including the joiner)
        io.to(roomCode).emit('player-joined', { players });
        
      } catch (error) {
        console.error('Error joining room:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });
    
    // Create room event handler
    socket.on('create-room', async (data: CreateRoomData) => {
      try {
        const { userId, songCount } = data;
        console.log('Creating room for user:', userId);
        
        // Generate room code
        const roomCode = generateRoomCode();
        
        // Create room in database
        await connectToDatabase();
        const room = new BattleRoom({
          code: roomCode,
          creatorId: userId,
          status: 'waiting',
          songCount,
          players: [{
            userId,
            name: userId.split('@')[0],
            isCreator: true,
            score: 0
          }],
          playersReady: new Map([[encodeEmail(userId), false]])
        });
        
        await room.save();
        
        // Join socket room
        socket.join(roomCode);
        
        // Store user info on socket
        socket.data.userId = userId;
        socket.data.roomCode = roomCode;
        
        // Track in active rooms
        if (!activeRooms.has(roomCode)) {
          activeRooms.set(roomCode, new Set<string>());
        }
        activeRooms.get(roomCode)?.add(socket.id);
        
        // Format player data for consistency with join-room
        const players: PlayerData[] = room.players.map((player: IPlayer) => ({
          id: player.userId,
          name: player.name || player.userId.split('@')[0],
          isCreator: player.isCreator,
          score: player.score || 0
        }));
        
        // Send room data to client with more complete information
        socket.emit('room-created', {
          roomCode,
          players,
          songCount: room.songCount,
          status: room.status,
          currentRound: room.currentRound,
          creatorId: room.creatorId,
          rounds: room.rounds || []
          
        });
        
        console.log('Room created:', roomCode);
      } catch (error) {
        console.error('Error creating room:', error);
        socket.emit('error', { message: 'Failed to create room' });
      }
    });
    
    // Select genre handler
    socket.on('select-genre', async (data: { option: string }, ack) => {
      const { option } = data;
      const { userId, roomCode } = socket.data;

      // Ensure ack is a function before proceeding
      if (typeof ack !== 'function') {
        console.error(`User ${userId} in room ${roomCode}: No ack function provided for select-genre.`);
        // Optionally emit an error back if ack is missing, though it shouldn't happen with correct client code
        socket.emit('error', { message: 'Internal error: Missing acknowledgement callback.' });
        return;
      }

      if (!userId || !roomCode) {
        console.warn(`select-genre attempt from socket ${socket.id} without userId or roomCode.`);
        return ack({ status: 'fail', message: 'Not properly joined to a room.' });
      }

      console.log(`User ${userId} attempting to select genre '${option}' in room ${roomCode}`);
      const encodedUserId = encodeEmail(userId);

      try {
        await connectToDatabase();

        // --- Step 1: Fetch the current room state ---
        const roomDoc = await BattleRoom.findOne({ code: roomCode }) as (Document & IBattleRoom) | null;

        // --- Step 2: Perform Pre-Update Checks ---
        if (!roomDoc) {
          return ack({ status: 'fail', message: 'Room not found.' });
        }
        if (roomDoc.status !== 'round_in_progress') {
          return ack({ status: 'fail', message: 'Game is not in progress.' });
        }

        const currentRoundIndex = roomDoc.currentRound;
        // Need to cast rounds array elements to ensure type safety if necessary
        const currentRound = roomDoc.rounds[currentRoundIndex];

        if (!currentRound || currentRound.status !== 'selecting') {
          return ack({ status: 'fail', message: 'Round is not active for selection.' });
        }

        // Ensure playerSelections map exists
        if (!currentRound.playerSelections) {
            currentRound.playerSelections = new Map<string, string[]>();
        }
        const currentPlayerSelections = currentRound.playerSelections.get(encodedUserId) || [];

        // Check if option already selected by this player
        if (currentPlayerSelections.includes(option)) {
          console.log(`User ${userId} already selected '${option}'.`);
          // Already selected, acknowledge success with current state
          return ack({
              status: 'success',
              playerSelections: { [userId]: currentPlayerSelections } // Return current selections
          });
        }

        // Check if player has already reached the maximum selections
        const maxSelections = currentRound.correctAnswers?.length || 1;
        if (currentPlayerSelections.length >= maxSelections) {
          console.log(`User ${userId} has already reached max selections (${maxSelections}).`);
          return ack({ status: 'fail', message: `Maximum selections (${maxSelections}) already reached.` });
        }

        // --- Step 3: Attempt Atomic Update ---
        const selectionPath = `rounds.${currentRoundIndex}.playerSelections.${encodedUserId}`;

        const updateResult = await BattleRoom.updateOne(
          {
            code: roomCode,
            _id: roomDoc._id, // Ensure we target the exact document
            __v: roomDoc.__v, // Optimistic concurrency control using Mongoose's version key
            status: 'round_in_progress', // Ensure still in progress
            [`rounds.${currentRoundIndex}.status`]: 'selecting', // Ensure round still selecting
            // Add condition to ensure the specific option isn't *already* in the array for this user
            // This prevents adding duplicates even if the in-memory check above passed due to a race condition
            [selectionPath]: { $ne: option },
            // Check length constraint using $expr and $size (more robust than relying solely on in-memory check)
            $expr: { $lt: [ { $size: { $ifNull: [`$${selectionPath}`, []] } }, maxSelections ] }

          },
          {
            $push: { [selectionPath]: option } // Add the option to the user's array
          }
        );

        // --- Step 4: Handle Update Result ---
        if (updateResult.modifiedCount === 1) {
          // SUCCESS! The update went through.
          console.log(`User ${userId} successfully selected '${option}' in room ${roomCode}.`);

          // Construct the user's *new* confirmed selections
          const newUserSelections = [...currentPlayerSelections, option];

          // Acknowledge success to the specific client FIRST
          ack({
              status: 'success',
              playerSelections: { [userId]: newUserSelections }
          });

          // Now, prepare data for broadcast
          // Fetch the *very latest* room doc again to ensure broadcast data is consistent
          // (Alternatively, update the in-memory roomDoc carefully, but fetching is safer)
          const updatedRoomDoc = await BattleRoom.findOne({ code: roomCode }) as IBattleRoom | null;
          if (!updatedRoomDoc) {
              console.error(`CRITICAL: Room ${roomCode} disappeared after successful update for ${userId}`);
              return; // Avoid broadcasting stale/incorrect data
          }
          const finalRoundState = updatedRoomDoc.rounds[updatedRoomDoc.currentRound];
          const finalSelectionsMap = finalRoundState.playerSelections || new Map<string, string[]>();

          const broadcastSelections: Record<string, string[]> = {};
          const broadcastCounts: Record<string, number> = {};
          const realPlayerIds = updatedRoomDoc.players.map(p => p.userId);

          for (const [encodedKey, value] of finalSelectionsMap.entries()) {
              const originalKey = decodeEmail(encodedKey);
              broadcastSelections[originalKey] = value;
          }
           // Calculate counts for *all* players based on the final state
          for (const pId of realPlayerIds) {
              broadcastCounts[pId] = finalSelectionsMap.get(encodeEmail(pId))?.length || 0;
          }

          // Broadcast the updated state to everyone
          io.to(roomCode).emit('selections-updated', {
              playerSelections: broadcastSelections,
              player: userId, // Inform who triggered this update
              option: option, // Inform which option was added
              status: 'success',
              playerSelectionCounts: broadcastCounts,
              optionsPerPlayer: maxSelections
          });

          // Check if the round is now complete AFTER the successful update and broadcast
          const isReadyForEvaluation = realPlayerIds.every(playerId =>
              (finalSelectionsMap.get(encodeEmail(playerId))?.length || 0) >= maxSelections
          );

          if (isReadyForEvaluation) {
              console.log(`Round ${currentRoundIndex} in room ${roomCode} is now complete.`);
              // Use timeout to prevent race condition with final selection broadcast/ack
              setTimeout(() => {
                 io.to(roomCode).emit('round-complete');
              }, 100); // Small delay
          }

        } else {
          // FAILURE: modifiedCount was 0. Update didn't happen.
          // This means the conditions in updateOne failed (likely __v mismatch due to concurrent update,
          // or the $ne: option check failed, or the $expr length check failed).
          console.warn(`User ${userId} selection failed for '${option}' (concurrent update or condition fail). Result:`, updateResult);

          // Fetch the current selections again to see the actual state
          const currentDocAfterFail = await BattleRoom.findOne({ code: roomCode }) as IBattleRoom | null;
          const actualSelections = currentDocAfterFail?.rounds[currentRoundIndex]?.playerSelections?.get(encodedUserId) || [];

          ack({
            status: 'fail',
            message: 'Selection failed. Option might be taken or limit reached.',
            playerSelections: { [userId]: actualSelections } // Send current state on failure too
          });
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error processing select-genre for user ${userId} in room ${roomCode}:`, error);
        // Acknowledge failure on server error
        ack({ status: 'fail', message: 'Server error during selection: ' + errorMessage });
        socket.emit('error', { message: 'Failed to select genre: ' + errorMessage }); // Also emit general error
      }
    });
    

    socket.on('player-ready', async (data: { isReady: boolean }) => {
      try {
        const { roomCode, userId } = socket.data;
        
        if (!roomCode || !userId) {
          socket.emit('error', { message: 'Not in a room' });
          return;
        }
        
        console.log(`Player ${userId} ready status changed to: ${data.isReady} in room ${roomCode}`);
        
        await connectToDatabase();
        
        const room = await BattleRoom.findOne({ code: roomCode }) as (Document & IBattleRoom) | null;
        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }
        
        // Initialize playersReady if not exists
        if (!room.playersReady) {
          room.playersReady = new Map<string, boolean>();
        }
        
        // Encode email to avoid issues with dots in Map keys
        const encodedUserId = encodeEmail(userId);
        
        // Update ready status
        room.playersReady.set(encodedUserId, data.isReady);
        
        // Mark as modified for Mongoose
        room.markModified('playersReady');
        await room.save();
        
        // Create object from Map for emitting to clients
        const playersReadyObject: Record<string, boolean> = {};
        
        if (room.playersReady) {
          for (const [encodedKey, value] of room.playersReady.entries()) {
            const originalKey = decodeEmail(encodedKey);
            playersReadyObject[originalKey] = value;
          }
        }
        
        // Notify all clients about ready status change
        io.to(roomCode).emit('players-ready-status', { 
          playersReady: playersReadyObject 
        });
        
        // Check if all players are ready - safely handle undefined
        const allPlayersReady = room.players.every(player => {
          const encodedPlayerId = encodeEmail(player.userId);
          return room.playersReady?.get(encodedPlayerId) === true;
        });
        
        console.log(`All players ready: ${allPlayersReady}`);
        
        // // If all players are ready, auto-advance to next round
        // if (allPlayersReady && room.creatorId === userId) {
        //   console.log('All players ready, auto-advancing to next round...');
        //   // Use socket.emit instead of direct function call to ensure everything goes through the socket flow
        //   handleNextRound(socket);
        // }
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error updating player ready status:', error);
        socket.emit('error', { message: 'Failed to update ready status: ' + errorMessage });
      }
    });
    
    // Evaluate round handler
    socket.on('evaluate-round', async () => {
      try {
        const { roomCode } = socket.data;
        const userId = socket.data.userId;
        
        if (!roomCode || !userId) {
          socket.emit('error', { message: 'Not in a room' });
          return;
        }
        
        console.log(`Evaluate round event received from user ${userId} for room ${roomCode}`);
        
        await connectToDatabase();
        
        const room = await BattleRoom.findOne({ code: roomCode }) as (Document & IBattleRoom) | null;
        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }
        
        if (room.creatorId !== userId) {
          socket.emit('error', { message: 'Only creator can evaluate round' });
          return;
        }
        
        const currentRoundIndex = room.currentRound;
        const currentRound = room.rounds[currentRoundIndex];
        
        if (!currentRound || currentRound.status !== 'selecting') {
          socket.emit('error', { message: 'Round not in selecting state' });
          return;
        }
        
        // Get the correct genres
        const correctGenres = currentRound.correctAnswers.map(answer => answer.name);
        
        // Calculate scores for each player
        const scoreMap = new Map<string, number>();
        const scoresObject: Record<string, number> = {};
        const matchingDetailsMap = new Map<string, MatchingDetail[]>(); // Store matching details for each player
        const matchingDetailsObject: Record<string, MatchingDetail[]> = {}; // For sending to clients
        
        // Process scores for each player using the genre-similarity API
        for (const player of room.players) {
          const playerId = player.userId;
          const encodedPlayerId = encodeEmail(playerId);
          
          // Get selections for this player
          const selections = currentRound.playerSelections?.get(encodedPlayerId) || [];
          
          if (selections.length === 0) {
            // No selections made by player
            scoreMap.set(encodedPlayerId, 0);
            scoresObject[playerId] = 0;
            matchingDetailsMap.set(encodedPlayerId, []);
            matchingDetailsObject[playerId] = [];
            continue;
          }
          
          // Call the genre-similarity API - using proper absolute URL format
          try {
            console.log(`Calling genre-similarity API for player ${playerId} with selections:`, selections);
            
            // Important: Use a proper absolute URL for server-side fetch
            // If this is running in the same Next.js instance, we need to form a complete URL
            const apiUrl = new URL('/api/evaluate', 'http://localhost:3000').toString();
            
            const response = await fetch(apiUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userGenres: selections,
                correctGenres: correctGenres
              }),
            });
            
            if (!response.ok) {
              console.error(`API error for player ${playerId}:`, await response.text());
              throw new Error(`API responded with status ${response.status}`);
            }
            
            interface SimilarityResult {
              averageScore: number;
              matchingScores: {
                [key: string]: {
                  genre: string;
                  score: number;
                  matchType: string;
                  explanation: string;
                }
              }
            }
            
            const similarityResult = await response.json() as SimilarityResult;
            console.log(`Similarity result for player ${playerId}:`, similarityResult);
            
            // Extract the average score
            const score = similarityResult.averageScore;
            
            // Store the detailed matching information from the API
            const matchingDetails: MatchingDetail[] = [];
            for (const userGenre of selections) {
              if (similarityResult.matchingScores[userGenre]) {
                const match = similarityResult.matchingScores[userGenre];
                matchingDetails.push({
                  userGenre,
                  matchedWith: match.genre,
                  score: match.score,
                  matchType: match.matchType,
                  explanation: match.explanation
                });
              }
            }
            
            // Store the results
            scoreMap.set(encodedPlayerId, score);
            scoresObject[playerId] = score;
            matchingDetailsMap.set(encodedPlayerId, matchingDetails);
            matchingDetailsObject[playerId] = matchingDetails;
            
            // Update player's total score
            player.score = (player.score || 0) + score;
            
          } catch (error) {
            console.error(`Error evaluating selections for player ${playerId}:`, error);
            
            // Fallback to simple exact matching if API fails
            const exactMatches = selections.filter(selection => correctGenres.includes(selection));
            const exactMatchCount = exactMatches.length;
            const score = Math.round((exactMatchCount / Math.max(1, correctGenres.length)) * 100);
            
            // Create fallback matching details
            const matchingDetails: MatchingDetail[] = selections.map(selection => {
              if (correctGenres.includes(selection)) {
                return {
                  userGenre: selection,
                  matchedWith: selection,
                  score: 100,
                  matchType: 'exact',
                  explanation: `Perfect match! "${selection}" is exactly correct.`
                };
              } else {
                // For non-matches, just pair with the first correct genre as a fallback
                return {
                  userGenre: selection,
                  matchedWith: correctGenres[0] || null,
                  score: 0,
                  matchType: 'fallback',
                  explanation: `"${selection}" doesn't match any of the correct genres.`
                };
              }
            });
            
            scoreMap.set(encodedPlayerId, score);
            scoresObject[playerId] = score;
            matchingDetailsMap.set(encodedPlayerId, matchingDetails);
            matchingDetailsObject[playerId] = matchingDetails;
            
            // Update player's total score
            player.score = (player.score || 0) + score;
          }
        }
        
        // Update the room document
        currentRound.status = 'completed';
        currentRound.scores = scoreMap;
        currentRound.matchingDetails = matchingDetailsMap; // Store detailed matching information
        room.status = 'evaluating';
        
        // Mark modified fields
        room.markModified(`rounds.${currentRoundIndex}.scores`);
        room.markModified(`rounds.${currentRoundIndex}.matchingDetails`);
        room.markModified('players');
        
        // Save document
        await room.save();
        
        // Create playerSelections object for client emission
        const playerSelectionsObject: Record<string, string[]> = {};
        if (currentRound.playerSelections) {
          for (const [encodedKey, value] of currentRound.playerSelections.entries()) {
            const originalKey = decodeEmail(encodedKey);
            playerSelectionsObject[originalKey] = value;
          }
        }
        
        // Send results to all clients in room with additional matching details
        io.to(roomCode).emit('round-evaluated', {
          scores: scoresObject,
          correctAnswers: currentRound.correctAnswers || [],
          playerSelections: playerSelectionsObject,
          matchingDetails: matchingDetailsObject, // Include matching details
          players: room.players.map(p => ({
            id: p.userId,
            name: p.name || p.userId.split('@')[0],
            isCreator: p.isCreator,
            score: p.score || 0
          })),
          creatorId: room.creatorId,
          currentRound: currentRoundIndex,
          songCount: room.songCount
        });
        
        console.log(`Round ${currentRoundIndex} evaluated for room ${roomCode}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error evaluating round:', error);
        socket.emit('error', { message: 'Failed to evaluate round: ' + errorMessage });
      }
    });

    const handleNextRound = async (socket: ServerSocket) => {
      try {
        const { roomCode } = socket.data;
        const userId = socket.data.userId;
        
        if (!roomCode || !userId) {
          socket.emit('error', { message: 'Not in a room' });
          return;
        }
        
        await connectToDatabase();
        
        const room = await BattleRoom.findOne({ code: roomCode }) as (Document & IBattleRoom) | null;
        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }
        
        // Check if this is the final round
        if (room.currentRound >= room.songCount - 1) {
          // Game is complete
          room.status = 'completed';
          await room.save();
          
          io.to(roomCode).emit('game-over', {
            players: room.players.map(p => ({
              id: p.userId,
              name: p.name || p.userId.split('@')[0],
              isCreator: p.isCreator,
              score: p.score || 0
            })).sort((a, b) => b.score - a.score)
          });
          return;
        }
        
        // Move to next round
        room.currentRound += 1;
        room.status = 'round_in_progress';
        
        // Reset player ready statuses for the new round
        if (room.playersReady) {
          room.players.forEach(player => {
            const encodedPlayerId = encodeEmail(player.userId);
            room.playersReady!.set(encodedPlayerId, false);
          });
          room.markModified('playersReady');
        }
        
        // Fetch new battle data for this round
        const battleData = await fetchBattleData(room.players.length);
        
        // Create new round
        const newRound = {
          roundNumber: room.currentRound,
          songId: battleData.youtube,
          title: battleData.title,
          artist: battleData.artist,
          album: battleData.album,
          explanation: battleData.explanation,
          options: battleData.options,
          correctAnswers: battleData.correctAnswers,
          playerSelections: new Map<string, string[]>(),
          scores: new Map<string, number>(),
          status: "selecting" as const
        };
        
        room.rounds[room.currentRound] = newRound;
        
        room.markModified(`rounds.${room.currentRound}`);
        await room.save();
        
        // Send new round to all clients
        io.to(roomCode).emit('new-round', {
          currentRound: room.currentRound,
          round: room.rounds[room.currentRound],
          status: room.status
        });
      } catch (error) {
        // Provide a more user-friendly error message
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error starting next round:', error);
        socket.emit('error', { message: 'Failed to start next round: ' + errorMessage });
      }
    };
    
    // Next round handler
    socket.on('next-round', async () => {
      await handleNextRound(socket);
    });
    
    // Start game (first round)
    socket.on('start-game', async () => {
      try {
        const { roomCode } = socket.data;
        const userId = socket.data.userId;
        
        if (!roomCode || !userId) {
          socket.emit('error', { message: 'Not in a room' });
          return;
        }
        
        await connectToDatabase();
        
        const room = await BattleRoom.findOne({ code: roomCode }) as (Document & IBattleRoom) | null;
        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }
        
        // Only creator can start game
        if (room.creatorId !== userId) {
          socket.emit('error', { message: 'Only creator can start game' });
          return;
        }
        
        // Check if enough players
        if (room.players.length < 2) {
          socket.emit('error', { message: 'Need at least 2 players' });
          return;
        }
        
        // Set up first round
        room.status = 'round_in_progress';
        room.currentRound = 0;

        // Initialize or reset playersReady for the start of the game
        if (!room.playersReady) {
          room.playersReady = new Map<string, boolean>();
        }
        
        // Set all players to not ready for the first round
        room.players.forEach(player => {
          const encodedPlayerId = encodeEmail(player.userId);
          room.playersReady!.set(encodedPlayerId, false);
        });
        
        room.markModified('playersReady');
        
        // Fetch battle data from our new endpoint
        const battleData = await fetchBattleData(room.players.length);
        
        // Create first round with battle data
        const firstRound = {
          roundNumber: 0,
          songId: battleData.youtube,
          title: battleData.title,
          artist: battleData.artist,
          album: battleData.album,
          explanation: battleData.explanation,
          options: battleData.options,
          correctAnswers: battleData.correctAnswers,
          playerSelections: new Map<string, string[]>(),
          scores: new Map<string, number>(),
          status: "selecting" as const
        };
        
        room.rounds = [firstRound];
        
        room.markModified('rounds');
        await room.save();
        
        // Notify all players that game has started
        io.to(roomCode).emit('game-started', {
          status: room.status,
          currentRound: room.currentRound,
          round: room.rounds[0],
          creatorId: room.creatorId
        });
      } catch (error) {
        // Provide a more user-friendly error message
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error starting game:', error);
        socket.emit('error', { message: 'Failed to start game: ' + errorMessage });
      }
    });
    
    // Disconnect handling
    socket.on('disconnect', () => {
      try {
        const { roomCode, userId } = socket.data;
        
        if (!roomCode || !userId) {
          return;
        }
        
        console.log(`Client disconnected: ${socket.id}, User: ${userId}, Room: ${roomCode}`);

        // Remove from active rooms
        if (roomCode && activeRooms.has(roomCode)) {
          activeRooms.get(roomCode)?.delete(socket.id);
          
          // If room is empty, cleanup
          if (activeRooms.get(roomCode)?.size === 0) {
            activeRooms.delete(roomCode);
          } else {
            // Count remaining sockets for this user (in case of multiple tabs)
            let userStillConnected = false;
            
            // Check if user has other active connections
            activeRooms.get(roomCode)?.forEach(socketId => {
              const clientSocket = io.sockets.sockets.get(socketId);
              if (clientSocket && clientSocket.data.userId === userId) {
                userStillConnected = true;
              }
            });
            
            // Only notify about player leaving if they have no other connections
            if (!userStillConnected) {
              io.to(roomCode).emit('player-left', { userId });
            }
          }
        }
      } catch (error) {
        console.error('Error handling disconnect:', error);
      }
    });
  });

  console.log('Socket server started');
  res.end();
}