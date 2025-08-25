import { NextResponse } from 'next/server';
import neo4j from 'neo4j-driver';

export async function GET() {
  const driver = neo4j.driver(
    process.env.NEO4J_URI!,
    neo4j.auth.basic(process.env.NEO4J_USER!, process.env.NEO4J_PASSWORD!)
  );

  try {
    const session = driver.session({ database: process.env.NEO4J_DATABASE });
    
    // Simple query to keep the database active
    const result = await session.run('MATCH (n) RETURN count(n) as count LIMIT 1');
    
    await session.close();
    await driver.close();
    
    return NextResponse.json({ 
      success: true, 
      timestamp: new Date().toISOString(),
      nodeCount: result.records[0]?.get('count').toNumber() || 0
    });
  } catch (error) {
    console.error('Neo4j ping error:', error);
    await driver.close();
    return NextResponse.json({ success: false, error: 'Failed to ping Neo4j' }, { status: 500 });
  }
}