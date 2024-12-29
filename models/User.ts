import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  email: string;
  password: string; // Encrypted password
  exercises_count: number;
  correct_count: number; // this is really the sum of all hte scores
  spotify_account?: string; // Optional field
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    exercises_count: { type: Number, default: 0 },
    correct_count: { type: Number, default: 0 },
    spotify_account: { type: String, required: false },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema);