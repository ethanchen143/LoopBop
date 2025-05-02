import { NextRequest, NextResponse } from 'next/server';
import { getSession } from "@/lib/neo4j";

export async function GET(request: NextRequest) {
    const session = getSession();
    
    const url = new URL(request.url);
    const mode = url.searchParams.get('mode') || 'main';
    const arg = url.searchParams.get('arg') || '';

    try {
        let query = '';
        let params = {};
        let result;
        
        switch (mode) {
        case 'main':
            // Return distinct main genres (families) with generated colors
            query = `
                MATCH (g:Genre)
                WITH DISTINCT g.family AS family
                WHERE family IS NOT NULL
                RETURN family
            `;
            result = await session.run(query);
            const mainGenres = result.records.map(record => {
            return {
                name: record.get('family'),
            };
            });
            return NextResponse.json({ results: mainGenres });
        
        case 'songs':
            // Return 5 songs for a given genre (family or tag)
            query = `
                MATCH (s:Song)-[:Genre]->(g:Genre)
                MATCH (s)-[:BELONGS_TO]->(a:Album)
                MATCH (ar:Artist)-[:MAKES]->(s)
                WHERE g.family = $genre OR g.tag = $genre
                WITH s, a, ar
                ORDER BY rand()
                LIMIT 5
                RETURN collect({
                    name: s.title, 
                    youtube: s.youtube_link, 
                    artist: ar.name, 
                    album: a.title, 
                    pic: a.pic 
                }) AS results
            `;
            console.log('Genre:', arg);
            params = { genre: arg };
            result = await session.run(query, params);
            const songs = result.records.map(record => record.get('results'));
            console.log('Songs:', songs);
            return NextResponse.json({ results: songs });
        
        case 'song':
            // Return details for a specific song and its genres
            query = `
                MATCH (s:Song {youtube_link: $songId})
                MATCH (s)-[:BELONGS_TO]->(a:Album)
                MATCH (ar:Artist)-[:MAKES]->(s)
                OPTIONAL MATCH (s)-[:Genre]->(g:Genre)
                WITH s, a, ar, collect(g.tag) AS genres
                RETURN {
                    name: s.title, 
                    youtube: s.youtube_link, 
                    artist: ar.name, 
                    album: a.title, 
                    pic: a.pic, 
                    genres: genres
                } AS result
            `;
            // Using Youtube ID to identify songs
            params = { songId: arg };
            result = await session.run(query, params);
            const songData = result.records.length > 0 ? result.records[0].get('result') : null;  

            return NextResponse.json({ results: [songData] });
        
        default:
            return NextResponse.json({ message: 'Invalid mode specified.' }, { status: 400 });
        }
    } catch (err) {
        console.error('Error in journey endpoint:', err);
        return NextResponse.json({ message: 'Something went wrong.' }, { status: 500 });
    } finally {
        await session.close();
    }
}