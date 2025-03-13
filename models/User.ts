import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  email: string;
  password: string; // Encrypted password
  exercises_count: number;
  correct_count: number; // this is the sum of all the scores
  genre_count: Record<string, number>;
  practiced_songs: String[];
  spotify_account?: string; // Optional field
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    exercises_count: { type: Number, default: 0 },
    correct_count: { type: Number, default: 0 },
    genre_count: { type: Map, of: Schema.Types.Mixed, default: {} },
    practiced_songs: { type: [String], default: [], unique: true },
    spotify_account: { type: String, required: false },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema);