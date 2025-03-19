// app/battle/[roomCode]/page.tsx
import BattleGameClient from './battle-client';

// Define the type for params as a Promise
type Params = Promise<{ roomCode: string }>;

// Update the page component to be async and handle the Promise
export default async function BattlePage({ params }: { params: Params }) {
  // Await the params to get the resolved roomCode
  const { roomCode } = await params;

  // Render the component with the resolved roomCode
  return <BattleGameClient roomCode={roomCode} key={roomCode} />;
}