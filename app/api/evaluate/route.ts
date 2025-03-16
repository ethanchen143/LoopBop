import { NextResponse, NextRequest } from "next/server";
import { getSession } from "@/lib/neo4j";

// Define interfaces for our data structures
interface GenreMatchScore {
  genre: string;
  score: number;
  matchType?: 'exact' | 'cooccurrence' | 'family' | 'leftover';
  explanation?: string;
}

interface SimilarityResponse {
  matchingScores: Record<string, GenreMatchScore>;
  averageScore: number;
  unmatchedUserGenres?: string[];
  unmatchedCorrectGenres?: string[];
  gradingExplanation: string;
}

// Interface for co-occurrence data with proper types
interface CoOccurrenceData {
  otherGenre: string;
  count: number; // Will store the number after converting from BigInt
  percentage: number;
  rank?: number;
  totalGenres?: number;
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body to get user-selected genres and correct genres
    const body = await request.json();
    const userGenres: string[] = body.userGenres || [];
    const correctGenres: string[] = body.correctGenres || [];

    // Validate inputs
    if (!Array.isArray(userGenres) || !Array.isArray(correctGenres)) {
      return NextResponse.json({ message: "Invalid input format. Both userGenres and correctGenres must be arrays." }, { status: 400 });
    }

    if (userGenres.length === 0 || correctGenres.length === 0) {
      return NextResponse.json({ message: "Both userGenres and correctGenres must not be empty." }, { status: 400 });
    }

    // Get Neo4j session
    const session = getSession();

    // For each user genre, get co-occurrence data with all genres
    const coOccurrenceQuery = `
      // For each user genre
      UNWIND $userGenres AS userGenre
      
      // Find songs with this genre
      MATCH (s:Song)-[:Genre]->(g:Genre {tag: userGenre})
      WITH userGenre, COLLECT(s) AS songsWithUserGenre, COUNT(s) AS totalSongs
      
      // Find all genres that co-occur with this user genre
      MATCH (s:Song)-[:Genre]->(otherG:Genre)
      WHERE s IN songsWithUserGenre
      
      // Count co-occurrences and calculate percentage
      WITH 
        userGenre, 
        otherG.tag AS otherGenre, 
        COUNT(DISTINCT s) AS coOccurrenceCount,
        totalSongs
      
      // Return all co-occurrences sorted by frequency
      RETURN 
        userGenre,
        otherGenre,
        coOccurrenceCount,
        totalSongs,
        (coOccurrenceCount * 100.0 / totalSongs) AS coOccurrencePercentage
      ORDER BY userGenre, coOccurrenceCount DESC
    `;

    const coOccurrenceResult = await session.run(coOccurrenceQuery, { userGenres });
    
    // Build a data structure for genre co-occurrence rankings
    const genreCoOccurrences: Record<string, CoOccurrenceData[]> = {};
    
    // Process the co-occurrence data
    coOccurrenceResult.records.forEach(record => {
      const userGenre = record.get("userGenre");
      const otherGenre = record.get("otherGenre");
      
      // Handle BigInt conversion for count
      const rawCount = record.get("coOccurrenceCount");
      // Convert BigInt to number safely
      const count = typeof rawCount === 'bigint' ? Number(rawCount) : Number(rawCount);
      
      const coOccurrencePercentage = record.get("coOccurrencePercentage");
      
      if (!genreCoOccurrences[userGenre]) {
        genreCoOccurrences[userGenre] = [];
      }
      
      genreCoOccurrences[userGenre].push({
        otherGenre,
        count,
        percentage: coOccurrencePercentage
      });
    });
    
    // Calculate rankings for each user genre's co-occurrences
    Object.keys(genreCoOccurrences).forEach(userGenre => {
      const coOccurrences = genreCoOccurrences[userGenre];
      const totalGenres = coOccurrences.length;
      
      // Sort by co-occurrence count (already done in Cypher, but ensuring it here)
      // This should no longer have BigInt issues since we've converted all to numbers
      coOccurrences.sort((a, b) => b.count - a.count);
      
      // Assign ranks (1 = highest co-occurrence, n = lowest)
      coOccurrences.forEach((item, index) => {
        item.rank = index + 1;
        item.totalGenres = totalGenres;
      });
    });

    // Get family information for genres that don't co-occur
    const familyQuery = `
      // Get all genres from both lists
      WITH $userGenres AS userGenres, $correctGenres AS correctGenres
      UNWIND userGenres + correctGenres AS genreTag
      MATCH (g:Genre {tag: genreTag})
      RETURN g.tag AS tag, g.family AS family
    `;

    const familyResult = await session.run(familyQuery, { userGenres, correctGenres });
    
    // Build family lookup map
    const genreFamilies: Record<string, string> = {};
    
    familyResult.records.forEach(record => {
      const tag = record.get("tag");
      const family = record.get("family");
      if (tag && family) {
        genreFamilies[tag] = family;
      }
    });

    // Define curve function to map rank to score (95 for top rank, 25 for bottom rank)
    const calculateCurvedScore = (rank: number, totalGenres: number): number => {
      if (totalGenres <= 1) return 50; // Default if there's only one genre
      
      // Calculate score on a scale from 25 to 95 based on rank percentile
      const percentile = (totalGenres - rank) / (totalGenres - 1);
      return 25 + (percentile * 70);
    };

    // Calculate matching scores for each user genre
    const matchingScores: Record<string, GenreMatchScore> = {};
    let totalScore = 0;
    const matchedCorrectGenres: Set<string> = new Set();
    const unmatchedUserGenres: string[] = [];

    userGenres.forEach(userGenre => {
      // If the user's genre is in the correct genres, it's a 100% match
      if (correctGenres.includes(userGenre)) {
        matchingScores[userGenre] = { 
          genre: userGenre, 
          score: 100,
          matchType: 'exact',
          explanation: `Perfect match! "${userGenre}" is exactly correct.`
        };
        matchedCorrectGenres.add(userGenre);
        totalScore += 100;
      } else {
        // Try to find co-occurrence match first
        let bestMatchInfo: {
          genre: string;
          score: number;
          rank: number;
          totalGenres: number;
          percentile?: number;
        } | null = null;
        
        // Check if we have co-occurrence data for this user genre
        if (genreCoOccurrences[userGenre]) {
          // Find best match among correct genres based on ranking
          for (const coOccurrence of genreCoOccurrences[userGenre]) {
            if (
              correctGenres.includes(coOccurrence.otherGenre) && 
              !matchedCorrectGenres.has(coOccurrence.otherGenre) &&
              coOccurrence.rank !== undefined && // Make sure rank is defined
              (!bestMatchInfo || (bestMatchInfo.rank !== undefined && coOccurrence.rank < bestMatchInfo.rank))
            ) {
              const curvedScore = calculateCurvedScore(
                coOccurrence.rank, 
                coOccurrence.totalGenres ?? 1 // Use nullish coalescing
              );
              bestMatchInfo = {
                genre: coOccurrence.otherGenre,
                score: curvedScore,
                rank: coOccurrence.rank,
                totalGenres: coOccurrence.totalGenres ?? 1, // Use nullish coalescing
                percentile: ((coOccurrence.totalGenres ?? 1) - coOccurrence.rank) / 
                           (((coOccurrence.totalGenres ?? 1) - 1) || 1) // Avoid division by zero
              };
            }
          }
        }
        
        // If co-occurrence match found
        if (bestMatchInfo) {
          const explanation = bestMatchInfo.rank === 1 
            ? `Great choice! "${userGenre}" is strongly associated with "${bestMatchInfo.genre}" (ranked #1 among ${bestMatchInfo.totalGenres} related genres).`
            : `Good choice! "${userGenre}" is related to "${bestMatchInfo.genre}" (ranked #${bestMatchInfo.rank} among ${bestMatchInfo.totalGenres} related genres).`;
          
          matchingScores[userGenre] = { 
            genre: bestMatchInfo.genre, 
            score: Math.round(bestMatchInfo.score),
            matchType: 'cooccurrence',
            explanation
          };
          matchedCorrectGenres.add(bestMatchInfo.genre);
          totalScore += bestMatchInfo.score;
        } 
        // If no co-occurrence, try family match
        else if (genreFamilies[userGenre]) {
          const userFamily = genreFamilies[userGenre];
          let familyMatch: string | null = null;
          
          // Find a correct genre with the same family
          for (const correctGenre of correctGenres) {
            if (
              !matchedCorrectGenres.has(correctGenre) && 
              genreFamilies[correctGenre] && 
              genreFamilies[correctGenre] === userFamily
            ) {
              familyMatch = correctGenre;
              break;
            }
          }
          
          if (familyMatch) {
            // Family matches get a 50% score
            matchingScores[userGenre] = { 
              genre: familyMatch, 
              score: 50,
              matchType: 'family',
              explanation: `Close! "${userGenre}" belongs to the same genre family as "${familyMatch}".`
            };
            matchedCorrectGenres.add(familyMatch);
            totalScore += 50;
          } else {
            unmatchedUserGenres.push(userGenre);
          }
        } else {
          unmatchedUserGenres.push(userGenre);
        }
      }
    });

    // For any unmatched user genres, assign leftover correct genres
    const unmatchedCorrectGenres = correctGenres.filter(genre => !matchedCorrectGenres.has(genre));
    
    unmatchedUserGenres.forEach((userGenre, index) => {
      if (index < unmatchedCorrectGenres.length) {
        const leftoverGenre = unmatchedCorrectGenres[index];
        // Give a score of 0 for these fallback matches
        matchingScores[userGenre] = { 
          genre: leftoverGenre, 
          score: 0,
          matchType: 'leftover',
          explanation: `"${userGenre}" isn't closely related to the correct genres, but we've paired it with "${leftoverGenre}" as a learning opportunity.`
        };
        matchedCorrectGenres.add(leftoverGenre);
        totalScore += 0;
      }
    });

    // Calculate average score
    const averageScore = userGenres.length > 0 ? Math.round(totalScore / userGenres.length) : 0;

    // Close Neo4j session
    await session.close();
    
    // Create grading explanation for users
    const gradingExplanation = `
### How Your Genre Selections Are Scored

Our scoring system works on multiple levels to give you credit for your music knowledge:

1. **Perfect Match (100 points)** - When you select a genre that's exactly right.

2. **Related Genres (25-95 points)** - When your selection isn't exact but shows good understanding:
   - Genres are scored based on how frequently they appear together in real songs
   - Higher scores (closer to 95) are given when your choice is among the most commonly co-occurring genres
   - Lower scores (closer to 25) are given when your choice rarely co-occurs with the correct genre
   
3. **Same Family (50 points)** - When your selection is in the same genre family or category as a correct answer.

4. **Learning Opportunity (0 points)** - When your selection doesn't closely match any correct genres, we pair it with a correct genre as a learning opportunity.

The final score is the average of all your genre selections.
    `.trim();

    // Prepare the final response
    const response: SimilarityResponse = {
      matchingScores,
      averageScore,
      gradingExplanation
    };

    // Include any remaining unmatched items for debugging/information
    const finalUnmatchedUserGenres = unmatchedUserGenres.filter((_, index) => index >= unmatchedCorrectGenres.length);
    if (finalUnmatchedUserGenres.length > 0) {
      response.unmatchedUserGenres = finalUnmatchedUserGenres;
    }

    const finalUnmatchedCorrectGenres = unmatchedCorrectGenres.filter((_, index) => index >= unmatchedUserGenres.length);
    if (finalUnmatchedCorrectGenres.length > 0) {
      response.unmatchedCorrectGenres = finalUnmatchedCorrectGenres;
    }

    // Return the results
    return NextResponse.json(response, { status: 200 });
  }
  catch (error) {
    console.error("Error calculating genre similarity scores:", error);
    return NextResponse.json({ message: "An error occurred while calculating genre similarity scores." }, { status: 500 });
  }
}