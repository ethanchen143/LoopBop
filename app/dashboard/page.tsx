"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Globe, Music, Trophy } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [userData, setUserData] = useState({
    email: "",
    exercises_count: 0,
    correct_count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          router.push("/auth");
          return;
        }

        const response = await fetch("/api/user", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setUserData(data);
          setLoading(false);
        } else {
          setError("Failed to fetch user data");
          setLoading(false);
          router.push("/auth");
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        setError("An unexpected error occurred");
        setLoading(false);
      }
    };

    fetchUserData();
  }, [router]);

  const handleStartPractice = () => {
    router.push("/practice");
  };

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

  const totalExercises = userData.exercises_count || 1; // Prevent division by zero
  const averageScore = totalExercises
    ? (userData.correct_count / totalExercises).toFixed(2)
    : 0;

  return (
    <div className="flex flex-col min-h-screen bg-purple-50">
      <header className="px-4 lg:px-6 h-14 flex items-center bg-white">
        <Link className="flex items-center justify-center" href="/">
          <Globe className="h-6 w-6 text-purple-600" />
          <span className="ml-2 text-2xl font-bold text-purple-600">LoopBop</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Button variant="link">
            {userData.email}
          </Button>
                
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
        {/* <h1 className="text-3xl font-bold mb-8 text-center">Welcome, </h1> */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Music className="mr-2 h-6 w-6 text-purple-600" />
                Completed Exercises
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-2">
                {userData.exercises_count} Songs
              </div>
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
        </div>
        <div className="text-center">
          <Button
            onClick={handleStartPractice}
            className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-full text-lg font-semibold"
          >
            Start Practice
          </Button>
        </div>
      </main>
      <footer className="py-6 text-center text-sm text-gray-500 bg-white">
        © 2024 LoopBop. All rights reserved.
      </footer>
    </div>
  );
}