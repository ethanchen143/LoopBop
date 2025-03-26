import mongoose, { Document } from 'mongoose';

// Define player interface
export interface IPlayer {
  userId: string;
  name?: string;
  isCreator: boolean;
  score: number;
}

// Define matching detail interface
export interface MatchingDetail {
  userGenre: string;
  matchedWith: string | null;
  score: number;
  matchType: string;
  explanation: string;
}

export interface Genre {
  name: string;
  family: string;
  description: string;
}

// Define round interface
export interface IRound {
  roundNumber: number;
  songId: string;
  title: string;
  artist: string;
  album?: string;
  explanation?: string;
  options: Genre[];  // Change from string[] to Genre[]
  correctAnswers: { name: string; explanation?: string }[];
  playerSelections?: Map<string, string[]>;
  scores?: Map<string, number>;
  matchingDetails?: Map<string, any[]>;
  status: "selecting" | "completed";
}

// Define battle room interface
export interface IBattleRoom extends Document {
  code: string;
  creatorId: string;
  status: 'waiting' | 'started' | 'round_in_progress' | 'evaluating' | 'completed';
  songCount: number;
  currentRound: number;
  players: IPlayer[];
  rounds: IRound[];
  createdAt: Date;
  playersReady?: Map<string, boolean>;
}

// Schema definitions
const playerSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  name: { type: String },
  isCreator: { type: Boolean, default: false },
  score: { type: Number, default: 0 }
});

const roundSchema = new mongoose.Schema({
  roundNumber: { type: Number, required: true },
  songId: { type: String, required: true },
  title: { type: String, required: true },
  artist: { type: String, required: true },
  album: { type: String },
  explanation: { type: String },
  options: [{
    name: { type: String, required: true },
    family: { type: String, required: true },
    description: { type: String, required: true }
  }],
  correctAnswers: [{
    name: { type: String, required: true },
    explanation: { type: String }
  }],
  playerSelections: { type: Map, of: [String], default: () => new Map() },
  scores: { type: Map, of: Number, default: () => new Map() },
  matchingDetails: { type: Map, of: Array, default: () => new Map() },
  status: {
    type: String,
    enum: ['selecting', 'completed'],
    default: 'selecting'
  }
});

const battleRoomSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  creatorId: { type: String, required: true },
  status: {
    type: String,
    enum: ['waiting', 'started', 'round_in_progress', 'evaluating', 'completed'],
    default: 'waiting'
  },
  songCount: { type: Number, required: true },
  currentRound: { type: Number, default: 0 },
  players: [playerSchema],
  rounds: [roundSchema],
  createdAt: { type: Date, default: Date.now, expires: '24h' },
  playersReady: { type: Map, of: Boolean, default: () => new Map() }
});

// Check if the model is already defined to prevent OverwriteModelError
const BattleRoom = mongoose.models.BattleRoom || 
  mongoose.model<IBattleRoom>('BattleRoom', battleRoomSchema);

export default BattleRoom;