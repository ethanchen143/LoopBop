import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ message: "Invalid input" }, { status: 400 });
    }

    await connectToDatabase();

    // Check if the user already exists
    const existingUser = await User.findOne({ email });
    
    if (existingUser) {
      return NextResponse.json({ message: "Email already in use" }, { status: 400 });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user
    await User.create({
      email,
      password: hashedPassword,
    });

    return NextResponse.json({ message: "User registered successfully" }, { status: 201 });
    
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
