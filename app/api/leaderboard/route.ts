import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await connectToDatabase();

    // Fetch all users
    const users = await User.find({}, "email exercises_count correct_count").lean();

    // Calculate leaderboard entries
    const leaderboard = users
      .map((user) => ({
        email: user.email,
        exercises_count: user.exercises_count,
        accuracy: user.exercises_count > 0 ? user.correct_count / user.exercises_count : 0,
      }))
      .sort((a, b) => b.accuracy*b.exercises_count - a.accuracy*a.exercises_count)
      .slice(0, 10); // Limit to top 10 users

    return NextResponse.json(leaderboard);
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json({ message: "Failed to fetch leaderboard" }, { status: 500 });
  }
}