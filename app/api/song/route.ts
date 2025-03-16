import { NextResponse, NextRequest } from "next/server";
import { getSession } from "@/lib/neo4j";

// Define Neo4j specific types
interface Neo4jInteger {
  low: number;
  high: number;
  toNumber: () => number;
}

interface Neo4jNode {
  properties: Record<string, unknown>;
}

interface Neo4jDateTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  nanosecond: number;
  timeZoneOffsetSeconds: number;
  toString: () => string;
}

// Helper function to safely convert Neo4j integers to JavaScript numbers
const toNumber = (value: unknown): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'object' && value !== null && 'low' in value && 'high' in value) {
    // It's a Neo4j Integer
    return (value as Neo4jInteger).toNumber();
  }
  return Number(value);
};

// Helper function to safely parse Neo4j results
const safeParseNeo4jValue = (value: unknown): unknown => {
  if (value === null || value === undefined) return null;
  
  // Convert Neo4j integers
  if (typeof value === 'object' && value !== null && 'low' in value && 'high' in value) {
    return (value as Neo4jInteger).toNumber();
  }
  
  // Handle Neo4j nodes
  if (typeof value === 'object' && value !== null && 'properties' in value) {
    const result: Record<string, unknown> = {};
    for (const key in (value as Neo4jNode).properties) {
      result[key] = safeParseNeo4jValue((value as Neo4jNode).properties[key]);
    }
    return result;
  }
  
  // Handle arrays
  if (Array.isArray(value)) {
    return value.map(item => safeParseNeo4jValue(item));
  }
  
  // Handle objects
  if (typeof value === 'object' && value !== null) {
    const result: Record<string, unknown> = {};
    for (const key in value) {
      result[key] = safeParseNeo4jValue((value as Record<string, unknown>)[key]);
    }
    return result;
  }
  
  return value;
};

interface SongUpdateResponse {
  success: boolean;
  moodFrequency?: number;
  genreSelections?: {
    genre: string;
    frequency: number;
    songTitle: string | null;
    timestamp: Neo4jDateTime; // Neo4j datetime type
  }[];
  likes?: number;
  comment?: CommentData;
}

interface SongData {
    title?: string;
    artist?: string;
    album?: string;
    youtube_link: string;
    [key: string]: unknown; 
}
  
interface MoodData {
    name: string;
    count: number;
}

interface GenreData {
    name: string;
    count: number;
}

interface CommentData {
    id: string;
    text: string;
    timestamp: string;
    userId?: string;
}

interface SongResponse {
    song: SongData;
    moods: MoodData[];
    genres: GenreData[];
    likes: number;
    comments: CommentData[];
}

interface SongRequest {
    youtube_link: string;
    songTitle?: string;
    mood?: string;
    genres?: string[];
    comment?: string;
    userId?: string;
    like?: boolean;
}

// GET endpoint to retrieve song data and statistics
export async function GET(request: NextRequest): Promise<NextResponse<SongResponse | { error: string }>> {
  try {
    const url = new URL(request.url);
    const youtube_link = url.searchParams.get("youtube_link");
    
    if (!youtube_link) {
      return NextResponse.json({ error: "YouTube link is required" }, { status: 400 });
    }
    
    const mainSession = getSession();
    
    // Get song details including mood frequency, genre frequency, likes, and comments
    const query = `
      MATCH (s:Song {youtube_link: $youtube_link})
      OPTIONAL MATCH (s)-[:USER_MOOD]->(m:UserMood)
      OPTIONAL MATCH (s)-[:USER_GENRE]->(g:UserGenre)
      OPTIONAL MATCH (s)-[:USER_COMMENT]->(c:UserComment)
      RETURN s AS song, 
             collect(DISTINCT {name: m.name, count: m.frequency}) AS moods,
             collect(DISTINCT {name: g.name, count: g.frequency}) AS genres,
             s.likes AS likes,
             collect(DISTINCT {id: c.id, text: c.text, timestamp: c.timestamp, userId: c.userId}) AS comments
    `;
    
    const result = await mainSession.run(query, { youtube_link });
    
    if (result.records.length === 0) {
      return NextResponse.json({ error: "Song not found" }, { status: 404 });
    }
    
    const record = result.records[0];
    
    // Convert Neo4j integers to JavaScript numbers
    const songData: SongResponse = {
      song: safeParseNeo4jValue(record.get('song').properties) as SongData,
      moods: safeParseNeo4jValue(record.get('moods')) as MoodData[],
      genres: safeParseNeo4jValue(record.get('genres')) as GenreData[],
      likes: toNumber(record.get('likes')),
      comments: safeParseNeo4jValue(record.get('comments')) as CommentData[]
    };
    
    await mainSession.close();
    return NextResponse.json(songData);
  } catch (error) {
    console.error("Error retrieving song data:", error);
    return NextResponse.json({ error: "Failed to retrieve song data" }, { status: 500 });
  }
}

// POST endpoint to save user interactions with songs
export async function POST(request: NextRequest): Promise<NextResponse<SongUpdateResponse | { error: string }>> {
  let mainSession = null;
  
  try {
    const requestBody: SongRequest = await request.json();
    const { youtube_link, songTitle, mood, genres, comment, userId, like } = requestBody;
    
    if (!youtube_link) {
      return NextResponse.json({ error: "YouTube link is required" }, { status: 400 });
    }
    
    mainSession = getSession();
    
    // Ensure the song exists
    const createSongIfNotExists = `
      MERGE (s:Song {youtube_link: $youtube_link})
      ON CREATE SET s.title = $songTitle
      RETURN s
    `;
    await mainSession.run(createSongIfNotExists, { youtube_link, songTitle });
    
    const response: {
      success: boolean;
      moodFrequency?: number;
      genreFrequencies?: { genre: string; frequency: number }[];
      likes?: number;
      comment?: CommentData;
    } = { success: true };
    
    // Update mood if provided
    if (mood) {
      const moodQuery = `
        MATCH (s:Song {youtube_link: $youtube_link})
        MERGE (m:UserMood {name: $mood})
        MERGE (s)-[:USER_MOOD]->(m)
        ON CREATE SET m.frequency = 1
        ON MATCH SET m.frequency = COALESCE(m.frequency, 0) + 1
        RETURN m.frequency as updatedFrequency
      `;
      
      const moodResult = await mainSession.run(moodQuery, { youtube_link, mood });
      response.moodFrequency = toNumber(moodResult.records[0].get('updatedFrequency'));
    }
    
    if (genres && genres.length > 0) {
      // Close the main session before running genre queries to avoid conflicts
      await mainSession.close();
      mainSession = null;
      
      const genreSelections = [];
      
      // Process genres one at a time to avoid transaction conflicts
      for (const genre of genres) {
        // Create a new session for each genre
        const genreSession = getSession();
        
        try {
          // Modified query to create a more detailed relationship
          const genreQuery = `
            MATCH (s:Song {youtube_link: $youtube_link})
            MERGE (g:UserGenre {name: $genre})
            
            // Create a new relationship type that captures user-specific selection
            MERGE (s)-[r:GENRE_SELECTED {userId: $userId}]->(g)
            ON CREATE SET r.timestamp = datetime(), 
                          r.songTitle = $songTitle
            
            // Still maintain the general USER_GENRE relationship for frequency counts
            MERGE (s)-[ug:USER_GENRE]->(g)
            ON CREATE SET g.frequency = 1
            ON MATCH SET g.frequency = COALESCE(g.frequency, 0) + 1
            
            RETURN g.name as genre, 
                   g.frequency as updatedFrequency, 
                   s.title as songTitle, 
                   r.timestamp as selectionTime
          `;
          
          const result = await genreSession.run(genreQuery, { 
            youtube_link, 
            genre, 
            userId: userId || 'anonymous',
            songTitle
          });
          
          if (result.records.length > 0) {
            genreSelections.push({
              genre: result.records[0].get('genre'),
              frequency: toNumber(result.records[0].get('updatedFrequency')),
              songTitle: result.records[0].get('songTitle'),
              timestamp: result.records[0].get('selectionTime')
            });
          }
        } finally {
          // Always close the session
          await genreSession.close();
        }
      }
      
      response.genreFrequencies = genreSelections.map(item => ({
        genre: item.genre,
        frequency: item.frequency
      }));
      
      // Create a new main session for any remaining operations
      mainSession = getSession();
    }
  
    // Update like count if requested
    if (like) {
      const likeQuery = `
        MATCH (s:Song {youtube_link: $youtube_link})
        SET s.likes = COALESCE(s.likes, 0) + 1
        RETURN s.likes as updatedLikes
      `;
      
      const likeResult = await mainSession.run(likeQuery, { youtube_link });
      response.likes = toNumber(likeResult.records[0].get('updatedLikes'));
    }
    
    // Add comment if provided
    if (comment) {
      const commentId = `comment_${Date.now()}`;
      const timeStamp = new Date().toISOString();
      
      const commentQuery = `
        MATCH (s:Song {youtube_link: $youtube_link})
        CREATE (c:UserComment {
          id: $commentId,
          text: $comment,
          timestamp: $timeStamp,
          userId: $userId
        })
        CREATE (s)-[:USER_COMMENT]->(c)
        RETURN c
      `;
      
      const commentResult = await mainSession.run(commentQuery, { 
        youtube_link, 
        comment, 
        commentId,
        timeStamp,
        userId: userId || 'anonymous'
      });
      
      // Convert Neo4j node to plain JavaScript object
      response.comment = safeParseNeo4jValue(commentResult.records[0].get('c').properties) as CommentData;
    }
    
    // Close the session if it's still open
    if (mainSession) {
      await mainSession.close();
    }
    
    return NextResponse.json(response);
  } catch (error) {
    console.error("Error updating song data:", error);
    
    // Ensure the session is closed even if an error occurs
    if (mainSession) {
      try {
        await mainSession.close();
      } catch (closeError) {
        console.error("Error closing Neo4j session:", closeError);
      }
    }
    
    return NextResponse.json({ error: "Failed to update song data" }, { status: 500 });
  }
}