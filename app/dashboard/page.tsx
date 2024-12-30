"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Globe, Music, Trophy, Search, Mic } from 'lucide-react';

interface UserData {
  email: string;
  exercises_count: number;
  correct_count: number;
  rank?: number;
}

interface LeaderboardEntry {
  email: string;
  exercises_count: number;
  accuracy: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData>({
    email: "",
    exercises_count: 0,
    correct_count: 0,
  });
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          router.push("/auth");
          return;
        }

        const [userResponse, leaderboardResponse] = await Promise.all([
          fetch("/api/user", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("/api/leaderboard", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (userResponse.ok && leaderboardResponse.ok) {
          const userData = await userResponse.json();
          const leaderboardData = await leaderboardResponse.json();
          setUserData(userData);
          setLeaderboard(leaderboardData);
          setLoading(false);
        } else {
          setError("Failed to fetch data");
          setLoading(false);
          router.push("/auth");
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("An unexpected error occurred");
        setLoading(false);
      }
    };
    fetchData();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  const totalExercises = userData.exercises_count || 1;
  const averageScore = (userData.correct_count / totalExercises).toFixed(2);

  return (
    <div className="flex flex-col min-h-screen bg-purple-50">
      <header className="px-4 lg:px-6 h-14 flex items-center bg-white">
        <Link className="flex items-center justify-center" href="/">
          <Globe className="h-6 w-6 text-purple-600" />
          <span className="ml-2 text-2xl font-bold text-purple-600">LoopBop</span>
        </Link>
        <nav className="ml-auto flex">
          <Button variant="link">{userData.email}</Button>
          <Button
            variant="link"
            onClick={() => {
              localStorage.removeItem("token");
              router.push("/");
            }}
          >
            Sign Out
          </Button>
        </nav>
      </header>
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Music className="mr-2 h-6 w-6 text-purple-600" />
                Completed Songs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-2">{userData.exercises_count}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Trophy className="mr-2 h-6 w-6 text-purple-600" />
                Average Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{averageScore}%</div>
              <Progress value={Number(averageScore)} className="w-full" />
            </CardContent>
          </Card>
          <Card className="bg-purple-600 text-white hover:bg-purple-700 transition-colors cursor-pointer" onClick={() => router.push("/practice")}>
            <CardHeader>
              <CardTitle className="text-white">Start Practice</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg">Begin your musical journey now!</p>
            </CardContent>
          </Card>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Leaderboard</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {leaderboard.map((entry, index) => (
                  <li key={index} className="flex justify-between items-center">
                    <span>{entry.email.split('@')[0]}</span>
                    <span>{entry.exercises_count} songs, {entry.accuracy.toFixed()}% accuracy</span>
                  </li>
                ))}
              </ul>
              {userData.rank && userData.rank > 10 && (
                <p className="mt-4">Your rank: {userData.rank}</p>
              )}
            </CardContent>
          </Card>
          
          <div className="space-y-4">
            <Card className="hover:bg-purple-100 transition-colors cursor-pointer" onClick={() => router.push("/explore")}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Search className="mr-2 h-6 w-6 text-purple-600" />
                  Exploration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p>Discover songs, artists, and musical tags</p>
              </CardContent>
            </Card>
            
            <Card className="hover:bg-purple-100 transition-colors cursor-pointer" onClick={() => router.push("/playground")}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Mic className="mr-2 h-6 w-6 text-purple-600" />
                  Playground
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p>Generate your own music in our AI-powered playground</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <footer className="py-6 text-center text-sm text-gray-500 bg-white">
        © 2024 LoopBop. All rights reserved.
      </footer>
    </div>
  );
}