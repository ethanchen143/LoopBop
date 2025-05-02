import { getSession } from "@/lib/neo4j";

// Define interface for Genre object
interface Genre {
  name: string;
  family: string;
  description: string;
}

// Define the return type of the battle data
interface BattleData {
  type: string;
  youtube: string;
  title: string;
  artist: string;
  album: string;
  explanation: string;
  question: string;
  options: Genre[];
  correctAnswers: Genre[];
}

// Service function to fetch battle data directly (without HTTP request)
export async function getBattleData(playerCount: number): Promise<BattleData> {
  try {
    if (isNaN(playerCount) || playerCount < 1) {
      throw new Error("Invalid player count");
    }
    
    const mainSession = getSession();
    
    // Step 1: Fetch a random song
    const songQuery = `
      MATCH (s:Song)
      WHERE s.explanation IS NOT NULL AND trim(s.explanation) <> ""
      MATCH (artist:Artist)-[:MAKES]->(s)-[:BELONGS_TO]->(album:Album)
      RETURN 
        s.title AS name,
        s.youtube_link AS youtube,
        s.explanation AS explanation,
        artist.name AS artist, 
        album.title AS album
      ORDER BY rand()
      LIMIT 1
    `;
    
    const songResult = await mainSession.run(songQuery);
    
    if (songResult.records.length === 0) {
      throw new Error("No songs found in the database.");
    }
    
    const record = songResult.records[0];
    const songName = record.get("name");
    
    // Step 2: Fetch all tags associated with the selected song
    const songTagsQuery = `
      MATCH (s:Song {title: $songName})-[:Genre]->(g:Genre)
      RETURN 
        collect(DISTINCT {
          name: g.tag, 
          family: g.family,
          description: COALESCE(g.description, "No description available")
        }) AS genres
    `;
    
    const songTagsResult = await mainSession.run(songTagsQuery, { songName });
    
    if (songTagsResult.records.length === 0) {
      throw new Error("No tags found for the song.");
    }
    
    const tagsRecord = songTagsResult.records[0];
    const correctGenres: Genre[] = tagsRecord.get("genres") || [];
    
    // Step 3: Calculate how many options we need in total
    const correctGenresCount = correctGenres.length;
    // Make sure we're dealing with integers
    const totalOptionsNeeded = Math.floor(Math.min(correctGenresCount * playerCount, 12)); // Cap at 12 to avoid too many options
    
    // We need to fetch additional genres (totalOptionsNeeded - correctGenresCount)
    const additionalGenresNeeded = Math.floor(Math.max(0, totalOptionsNeeded - correctGenresCount));
    
    // Step 4: Fetch additional random genres (excluding the ones already tagged to the song)
    const additionalGenresQuery = `
      MATCH (g:Genre)
      WHERE NOT g.tag IN $existingTags
      RETURN 
        {
          name: g.tag, 
          family: g.family,
          description: COALESCE(g.description, "No description available")
        } AS genre
      ORDER BY rand()
      LIMIT toInteger($limit)
    `;
    
    // Fix: Added explicit typing for genre and properly access the 'name' property
    const existingTags = correctGenres.map((genre: Genre) => genre.name);
    // Convert to integer for Neo4j
    const limit = parseInt(String(additionalGenresNeeded), 10);
    
    console.log(`Fetching ${limit} additional genres (existing genres: ${correctGenresCount})`);
    
    const additionalGenresResult = await mainSession.run(additionalGenresQuery, {
      existingTags,
      limit: limit
    });
    
    // Step 5: Combine correct genres with additional genres
    const additionalGenres: Genre[] = additionalGenresResult.records.map(record => record.get("genre"));
    const allOptions: Genre[] = [...correctGenres, ...additionalGenres];
    
    // Step 6: Shuffle the options to randomize order
    const shuffledOptions = allOptions.sort(() => Math.random() - 0.5);
    
    // Close the session
    await mainSession.close();
    
    // Step 7: Return the complete battle data
    return {
      type: "Genre", 
      youtube: record.get("youtube"),
      title: record.get("name"),
      artist: record.get("artist"),
      album: record.get("album"),
      explanation: record.get("explanation"),
      question: "Which genres best describe the song?",
      options: shuffledOptions,
      correctAnswers: correctGenres,
    };
    
  } catch (error) {
    console.error("Error fetching battle data from Neo4j:", error);
    throw error;
  }
}