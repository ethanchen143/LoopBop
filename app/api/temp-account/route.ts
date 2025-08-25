import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

export async function POST() {
  try {
    // Generate a unique temporary user ID
    const tempUserId = `temp_${uuidv4()}`;
    const tempEmail = `${tempUserId}@temp.loopbop`;

    // Create a temporary user object (not saved to database)
    const tempUser = {
      id: tempUserId,
      email: tempEmail,
      isTemp: true,
      exercises_count: 0,
      correct_count: 0,
      createdAt: new Date().toISOString(),
    };

    // Generate JWT with temp flag and shorter expiration (e.g., 4 hours)
    const token = jwt.sign(
      { 
        id: tempUser.id, 
        email: tempUser.email,
        isTemp: true,
        createdAt: tempUser.createdAt
      },
      JWT_SECRET,
      { expiresIn: "4h" } // Temp accounts expire after 4 hours
    );

    return NextResponse.json({ 
      message: "Temporary account created", 
      token,
      tempUser: {
        email: tempUser.email,
        exercises_count: tempUser.exercises_count,
        correct_count: tempUser.correct_count,
      }
    }, { status: 200 });
  } catch (error) {
    console.error("Error creating temporary account:", error);
    return NextResponse.json({ message: "Failed to create temporary account" }, { status: 500 });
  }
}