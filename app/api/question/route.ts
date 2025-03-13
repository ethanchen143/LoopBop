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
      MATCH (s)-[:Era]->(e:Era)
      RETURN 
        collect(DISTINCT {name: g.tag, family: g.family, description: COALESCE(g.description, "No description available")}) AS genres, 
        collect(DISTINCT {name: e.tag, description: COALESCE(e.description, "No description available")}) AS eras
    `;

    const songTagsResult = await mainSession.run(songTagsQuery, { songName });

    if (songTagsResult.records.length === 0) {
      return NextResponse.json({ message: "No tags found for the song." }, { status: 404 });
    }

    const tagsRecord = songTagsResult.records[0];

    // Fetch random eras, genres using separate sessions
    const eraQuery = (label: string, number: string) => `
      MATCH (t:${label})
      RETURN 
        t.tag AS name,
        t.description AS description 
      ORDER BY rand()
      LIMIT ${number}
    `;

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
    const erasSession = getSession();

    const [erasResult, genresResult] = await Promise.all([
      erasSession.run(eraQuery("Era", "2")),
      genresSession.run(genreQuery("Genre", "6")),
    ]);

    // Close all sessions
    await Promise.all([erasSession.close(), genresSession.close()]);
    await mainSession.close();

    interface Record {
      get: (key: string) => string | null;
    }

    const formatOptions = (
      result: { records: { get: (key: string) => string }[] },
      correctAnswers: { name: string; description: string }[]
    ) => {
      const randomOptions = result.records.map((record: Record) => ({
        name: record.get("name"),
        description: record.get("description") || "No description available",
        family: (() => {
          try {
            return record.get("family") || "N/A";
          } catch {
            return "N/A";
          }
        })()
      }));

      const correctOptions = correctAnswers.map(({ name, description }) => ({
        name,
        description: description || "No description available",
        family: (() => {
          try {
            return record.get("family") || "N/A";
          } catch {
            return "N/A";
          }
        })()
      }));

      // Merge options without duplicates based on `name`
      return [
        ...new Map(
          [...randomOptions, ...correctOptions].map((option) => [
            option.name,
            option,
          ])
        ).values(),
      ];
    };

    // Ensure these are always arrays
    const eras = tagsRecord.get("eras") || [];
    const genres = tagsRecord.get("genres") || [];

    console.log(erasResult)
    console.log(genresResult)

    // Prepare questions for each aspect
    const questions = [
      {
        type: "Era",
        youtube: record.get("youtube"),
        title: record.get("name"),
        artist: record.get("artist"),
        album: record.get("album"),
        explanation: record.get('explanation'),
        question: "Which era best fits the song?",
        options: formatOptions(erasResult, eras),
        correctAnswers: eras,
      },
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