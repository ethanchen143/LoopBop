import { NextResponse,NextRequest } from "next/server";
import { getSession } from "@/lib/neo4j";
import neo4j from "neo4j-driver";

export async function GET(request:NextRequest) {
  try {
    const session = getSession();

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") ?? "1", 10);
    const limit = parseInt(url.searchParams.get("limit") ?? "15", 10);
    const skip = (page - 1) * limit;
    const category = url.searchParams.get("category") ?? "Song";
    const search = url.searchParams.get("search")?.toLowerCase() ?? "";

    if (isNaN(page) || isNaN(limit) || page <= 0 || limit <= 0) {
      return NextResponse.json(
        { message: "Invalid pagination parameters." },
        { status: 400 }
      );
    }

    // Ensure integers for SKIP and LIMIT
    const neo4jSkip = neo4j.int(Math.trunc(skip));
    const neo4jLimit = neo4j.int(Math.trunc(limit));

    let query = "";
    switch (category) {
      case "Song":
        query = `
          MATCH (s:Song)
          WHERE toLower(s.title) CONTAINS $search
          WITH s
          ORDER BY s.title
          SKIP $skip
          LIMIT $limit
          OPTIONAL MATCH (artist:Artist)-[:MAKES]->(s)-[:BELONGS_TO]->(album:Album)
          RETURN collect({ name: s.title, youtube: s.youtube_link, artist: artist.name, album: album.title, pic: album.pic }) AS results
        `;
        break;
      case "Album":
        query = `
          MATCH (a:Album)
          WHERE toLower(a.title) CONTAINS $search
          OPTIONAL MATCH (artist:Artist)-[:MAKES]->(:Song)-[:BELONGS_TO]->(a)
          WITH a, collect(DISTINCT artist.name) AS artists
          ORDER BY a.title
          SKIP $skip
          LIMIT $limit
          RETURN collect({ name: a.title, artists: artists, pic: a.pic, description: COALESCE(a.description, "No description available.") }) AS results
        `;
        break;
      case "Artist":
        query = `
          MATCH (artist:Artist)
          WHERE toLower(artist.name) CONTAINS $search
          WITH artist
          ORDER BY artist.name
          SKIP $skip
          LIMIT $limit
          RETURN collect({ name: artist.name, pic: artist.pic, description: COALESCE(artist.description, "No description available.") }) AS results
        `;
        break;
      case "Mood":
        query = `
          MATCH (m:Mood)
          WHERE toLower(m.tag) CONTAINS $search
          WITH m
          ORDER BY m.tag
          SKIP $skip
          LIMIT $limit
          RETURN collect({ name: m.tag, pic: m.pic, description: COALESCE(m.description, "No description available.") }) AS results
        `;
        break;
      case "Era":
        query = `
          MATCH (e:Era)
          WHERE toLower(e.tag) CONTAINS $search
          WITH e
          ORDER BY e.tag
          SKIP $skip
          LIMIT $limit
          RETURN collect({ name: e.tag, pic: e.pic, description: COALESCE(e.description, "No description available.") }) AS results
        `;
        break;
      case "Genre":
        query = `
          MATCH (g:Genre)
          WHERE toLower(g.tag) CONTAINS $search
          WITH g
          ORDER BY g.tag
          SKIP $skip
          LIMIT $limit
          RETURN collect({ name: g.tag, pic: g.pic, description: COALESCE(g.description, "No description available.") }) AS results
        `;
        break;
      case "Sound":
        query = `
          MATCH (s:Sound)
          WHERE toLower(s.tag) CONTAINS $search
          WITH s
          ORDER BY s.tag
          SKIP $skip
          LIMIT $limit
          RETURN collect({ name: s.tag, pic: s.pic, description: COALESCE(s.description, "No description available.") }) AS results
        `;
        break;
      default:
        return NextResponse.json(
          { message: "Invalid category." },
          { status: 400 }
        );
    }

    const result = await session.run(query, { skip: neo4jSkip, limit: neo4jLimit, search });
    await session.close();

    if (result.records.length === 0) {
      return NextResponse.json(
        { message: "No data found in the database." },
        { status: 404 }
      );
    }

    const record = result.records[0];
    return NextResponse.json({
      results: record.get("results"),
      page,
      limit,
    });
  } catch (error) {
    console.error("Error querying Neo4j:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}