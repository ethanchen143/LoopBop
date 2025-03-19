import { NextResponse, NextRequest } from "next/server";
import { getBattleData } from "@/lib/battleService";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const playerCount = parseInt(url.searchParams.get("playerCount") || "1", 10);
    
    if (isNaN(playerCount) || playerCount < 1) {
      return NextResponse.json({ message: "Invalid player count." }, { status: 400 });
    }
    
    // Use our service function to get battle data
    const battleData = await getBattleData(playerCount);
    
    // Return the battle data
    return NextResponse.json(battleData, { status: 200 });
    
  } catch (error) {
    console.error("Error fetching battle data from Neo4j:", error);
    return NextResponse.json({ message: "An error occurred while fetching battle data." }, { status: 500 });
  }
}