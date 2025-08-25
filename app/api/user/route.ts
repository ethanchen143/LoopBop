import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

export async function PATCH(request: Request) {
  try {
    const token = request.headers.get("Authorization")?.split(" ")[1];

    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; isTemp?: boolean };

    // If it's a temp account, just return success without database operations
    if (decoded.isTemp) {
      // For temp accounts, we don't store data persistently
      // Could optionally store in memory/cache if needed
      return NextResponse.json({ 
        message: "Temp user data updated (session only)",
        isTemp: true 
      });
    }

    await connectToDatabase();

    const user = await User.findById(decoded.id);
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const { exercises_count_increment, correct_count_increment } = await request.json();

    // Update the user's data
    user.exercises_count += exercises_count_increment || 0;
    user.correct_count += correct_count_increment || 0;

    await user.save();
    return NextResponse.json({ message: "User updated successfully" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const token = request.headers.get("Authorization")?.split(" ")[1];

    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { 
      id: string; 
      email?: string;
      isTemp?: boolean;
      exercises_count?: number;
      correct_count?: number;
    };

    // If it's a temp account, return temp user data from token
    if (decoded.isTemp) {
      return NextResponse.json({
        email: decoded.email || `temp_${decoded.id}@temp.loopbop`,
        exercises_count: 0, // Temp accounts always start fresh
        correct_count: 0,
        isTemp: true
      });
    }

    await connectToDatabase();

    const user = await User.findById(decoded.id);
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      email: user.email,
      exercises_count: user.exercises_count,
      correct_count: user.correct_count,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}