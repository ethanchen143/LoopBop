import { NextResponse, NextRequest } from "next/server";
import { getSession } from "@/lib/neo4j";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const songTitle = url.searchParams.get("song"); // Get the song title from query parameters
    const mainSession = getSession();
    
    // Query to fetch either a specific song or a random one
    const songQuery = songTitle
      ? `
        MATCH (s:Song {title: $title})
        WHERE s.explanation IS NOT NULL AND trim(s.explanation) <> ""
        MATCH (artist:Artist)-[:MAKES]->(s)-[:BELONGS_TO]->(album:Album)
        RETURN
          s.title AS name, 
          s.youtube_link AS youtube,
          s.explanation AS explanation,
          artist.name AS artist, 
          album.title AS album
      `
      : `
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

    const params = songTitle ? { title: songTitle } : {}; // Pass the title parameter only if provided
    const songResult = await mainSession.run(songQuery, params);

    if (songResult.records.length === 0) {
      return NextResponse.json({ message: "No songs found in the database." }, { status: 404 });
    }

    const record = songResult.records[0];
    const songName = record.get("name");

    // Query to fetch all tags associated with the selected song
    const songTagsQuery = `
    MATCH (s:Song {title: $songName})-[:Genre]->(g:Genre)
    RETURN 
      collect(DISTINCT {name: g.tag, family: g.family, description: COALESCE(g.description, "No description available")}) AS genres
    `;

    const songTagsResult = await mainSession.run(songTagsQuery, { songName });

    if (songTagsResult.records.length === 0) {
      return NextResponse.json({ message: "No tags found for the song." }, { status: 404 });
    }

    const tagsRecord = songTagsResult.records[0];

    const genreQuery = (label: string, number: string) => `
      MATCH (t:${label})
      RETURN 
        t.tag AS name,
        t.description AS description,
        t.family AS family
      ORDER BY rand()
      LIMIT ${number}
    `;

    const genresSession = getSession();

    const [genresResult] = await Promise.all([
      genresSession.run(genreQuery("Genre", "6")),
    ]);

    // Close all sessions
    await Promise.all([genresSession.close()]);
    await mainSession.close();

    // interface Record {
    //   get: (key: string) => string | null;
    // }

    const formatOptions = (
      result: { records: { get: (key: string) => string }[] },
      correctAnswers: { name: string; family?: string; description?: string }[]
    ) => {
      // 1) turn your random DB hits into option objects
      const randomOptions = result.records.map(rec => ({
        name: rec.get("name"),
        description: rec.get("description") || "No description available",
        family: rec.get("family") || "N/A"
      }));
    
      // 2) map your correct tags (from tagsRecord.get("genres")) into the same shape
      const correctOptions = correctAnswers.map(ans => ({
        name: ans.name,
        description: ans.description || "No description available",
        family: ans.family || "N/A"
      }));

      console.log("Correct Options:", correctOptions);
    
      // 3) combine & dedupe by name, letting correctOptions overwrite any random dupes
      const combined = [...randomOptions, ...correctOptions];
      const uniq = new Map<string, typeof combined[0]>();
      combined.forEach(opt => uniq.set(opt.name, opt));
      const options = Array.from(uniq.values());
    
      // 4) shuffle so the correct ones aren’t always at the end
      options.sort(() => Math.random() - 0.5);
    
      return options;
    };
    

    const genres = tagsRecord.get("genres") || [];

    // Prepare questions for each aspect
    const questions = [
      {
        type: "Genre",
        youtube: record.get("youtube"),
        title: record.get("name"),
        artist: record.get("artist"),
        album: record.get("album"),
        explanation: record.get('explanation'),
        question: "Which genres best describe the song?",
        options: formatOptions(genresResult, genres),
        correctAnswers: genres,
      }
    ];
    
    return NextResponse.json(questions, { status: 200 });
  } catch (error) {
    console.error("Error fetching questions from Neo4j:", error);
    return NextResponse.json({ message: "An error occurred while fetching the questions." }, { status: 500 });
  }
}