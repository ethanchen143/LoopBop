import { NextResponse } from "next/server";
import { getSession } from "@/lib/neo4j";

export async function GET() {
  try {
    // Create separate sessions for the song and random queries
    const mainSession = getSession();
    const songQuery = `
      MATCH (s:Song)
      MATCH (artist:Artist)-[:MAKES]->(s)-[:BELONGS_TO]->(album:Album)
      RETURN 
        s.title AS name, 
        s.youtube_link AS youtube,
        artist.name AS artist, 
        album.title AS album
      ORDER BY rand()
      LIMIT 1
    `;
    const songResult = await mainSession.run(songQuery);

    if (songResult.records.length === 0) {
      return NextResponse.json({ message: "No songs found in the database." }, { status: 404 });
    }

    const record = songResult.records[0];

    const songName = record.get("name");

    // Query to fetch all tags associated with the selected song
    const songTagsQuery = `
    MATCH (s:Song {title: $songName})-[:Mood]->(m:Mood)
    OPTIONAL MATCH (s)-[:Era]->(e:Era)
    OPTIONAL MATCH (s)-[:Genre]->(g:Genre)
    OPTIONAL MATCH (s)-[:Sound]->(sound:Sound)
    RETURN 
      collect(DISTINCT m {name: m.tag, description: COALESCE(m.description, "No description available")}) AS moods, 
      collect(DISTINCT e {name: e.tag, description: COALESCE(e.description, "No description available")}) AS eras, 
      collect(DISTINCT g {name: g.tag, description: COALESCE(g.description, "No description available")}) AS genres, 
      collect(DISTINCT sound {name: sound.tag, description: COALESCE(sound.description, "No description available")}) AS sounds
  `;

    const songTagsResult = await mainSession.run(songTagsQuery, { songName });

    if (songTagsResult.records.length === 0) {
      return NextResponse.json({ message: "No tags found for the song." }, { status: 404 });
    }

    const tagsRecord = songTagsResult.records[0];

    // Fetch 10 random moods, eras, genres, and sounds using separate sessions
    const randomQuery = (label: string, number: string) => `
      MATCH (t:${label})
      RETURN 
        t.tag AS name,
        t.description AS description 
      ORDER BY rand()
      LIMIT ${number}
    `;

    const moodsSession = getSession();
    const erasSession = getSession();
    const genresSession = getSession();
    const soundsSession = getSession();

    const [moodsResult, erasResult, genresResult, soundsResult] = await Promise.all([
      moodsSession.run(randomQuery("Mood","3")),
      erasSession.run(randomQuery("Era","3")),
      genresSession.run(randomQuery("Genre","10")),
      soundsSession.run(randomQuery("Sound","10"))
    ]);

    // Close all sessions
    await Promise.all([moodsSession.close(), erasSession.close(), genresSession.close(), soundsSession.close()]);
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
    }));
    
    const correctOptions = correctAnswers.map(({ name, description }) => ({
        name,
        description: description || "No description available",
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
      
    // Prepare questions for each aspect
    const questions = [
    {
        type: "Mood",
        youtube: record.get("youtube"),
        title: record.get("name"),
        artist: record.get("artist"),
        album: record.get("album"),
        question: "Which of the following moods best describe the song?",
        options: formatOptions(
        moodsResult,
        tagsRecord.get("moods") || [] // Ensure this is always an array
        ),
        correctAnswers: tagsRecord.get("moods") || [], // Ensure this is always an array
    },
    {
        type: "Era",
        youtube: record.get("youtube"),
        title: record.get("name"),
        artist: record.get("artist"),
        album: record.get("album"),
        question: "Which era best fits the song?",
        options: formatOptions(
        erasResult,
        tagsRecord.get("eras") || [] // Ensure this is always an array
        ),
        correctAnswers: tagsRecord.get("eras") || [], // Ensure this is always an array
    },
    {
        type: "Genre",
        youtube: record.get("youtube"),
        title: record.get("name"),
        artist: record.get("artist"),
        album: record.get("album"),
        question: "What genre best describes the song?",
        options: formatOptions(
        genresResult,
        tagsRecord.get("genres") || [] // Ensure this is always an array
        ),
        correctAnswers: tagsRecord.get("genres") || [], // Ensure this is always an array
    },
    {
        type: "Sound",
        youtube: record.get("youtube"),
        title: record.get("name"),
        artist: record.get("artist"),
        album: record.get("album"),
        question: "Which sounds are prominent in the song?",
        options: formatOptions(
        soundsResult,
        tagsRecord.get("sounds") || [] // Ensure this is always an array
        ),
        correctAnswers: tagsRecord.get("sounds") || [], // Ensure this is always an array
    },
    ];
    return NextResponse.json(questions, { status: 200 });
  } catch (error) {
    console.error("Error fetching questions from Neo4j:", error);
    return NextResponse.json({ message: "An error occurred while fetching the questions." }, { status: 500 });
  }
}