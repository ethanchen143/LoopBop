"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Flame, ArrowLeft } from 'lucide-react';
import ThreeJSBackground from "@/components/ThreeShape";
import YouTube from "react-youtube";

// Define interfaces
interface QuestionOption {
  name: string;
  description: string;
}

interface Question {
  youtube: string;
  title: string;
  artist: string;
  album: string;
  question: string;
  options: QuestionOption[];
  correctAnswers: QuestionOption[];
}

// Pop art color palette (softer, less bright colors)
const POP_ART_COLORS = [
  'rgba(255, 43, 91, 0.8)', // Softer hot pink
  'rgba(255, 199, 0, 0.8)',  // Softer yellow
  'rgba(57, 255, 20, 0.75)', // Softer neon green
  'rgba(0, 255, 255, 0.75)', // Softer cyan
  'rgba(55, 114, 255, 0.8)', // Softer royal blue
  'rgba(173, 0, 255, 0.75)', // Softer purple
  'rgba(242, 34, 255, 0.75)', // Softer magenta
  'rgba(255, 107, 107, 0.8)', // Softer coral
  'rgba(76, 201, 240, 0.8)', // Softer blue
];

export default function PracticePage() {
  const [allOptions, setAllOptions] = useState<QuestionOption[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userUpdated, setUserUpdated] = useState(false);
  const [currentView, setCurrentView] = useState<"selection" | "feedback">("selection");
  const [correctAnswers, setCorrectAnswers] = useState<QuestionOption[]>([]);
  const [videoId, setVideoId] = useState("");
  const [combo, setCombo] = useState(3); // Dummy combo data
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const containerRef = useRef<HTMLDivElement>(null);

  const mode = searchParams.get("mode") || "easy";
  const songTitle = searchParams.get("song") || "";

  // Check if user is logged in
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/auth");
        return;
      }
      
      try {
        const response = await fetch("/api/user", {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (!response.ok) {
          router.push("/auth");
        }
      } catch (error) {
        console.error("Error verifying user authentication:", error);
        router.push("/auth");
      }
    };

    checkAuth();
  }, [router]);

  // Fetch questions and combine all options
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await fetch(`/api/question?song=${encodeURIComponent(songTitle)}&mode=${mode}`);
        const data = await response.json();
        
        if (data && data.length > 0) {
          // Combine all options from both questions
          const allOptionsFromQuestions = data.flatMap((q: Question) => q.options);
          
          // Combine all correct answers
          const allCorrectAnswers = data.flatMap((q: Question) => q.correctAnswers);
          
          // Use the first question's YouTube video
          const firstVideoId = data[0].youtube.split("v=")[1] || data[0].youtube;
          
          setAllOptions(allOptionsFromQuestions);
          setCorrectAnswers(allCorrectAnswers);
          setVideoId(firstVideoId);
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching questions:", error);
        setLoading(false);
      }
    };
    
    fetchQuestions();
  }, [songTitle, mode]);

  // Handle user selecting/deselecting an answer
  const handleAnswerSelect = (answer: string) => {
    setSelectedAnswers((prevSelected) => {
      if (prevSelected.includes(answer)) {
        return prevSelected.filter((a) => a !== answer);
      } else {
        // Increment combo on selection
        setCombo(prevCombo => prevCombo + 1);
        return [...prevSelected, answer];
      }
    });
  };

  // Auto-submit when all correct answers are selected
  useEffect(() => {
    if (correctAnswers.length > 0 && selectedAnswers.length >= correctAnswers.length) {
      handleSubmitAnswers();
    }
  }, [selectedAnswers, correctAnswers]);

  // Check answers
  const handleSubmitAnswers = async () => {
    const correctCount = selectedAnswers.filter((answer) =>
      correctAnswers.some((correct: QuestionOption) => correct.name === answer)
    ).length;

    const incorrectCount = selectedAnswers.length - correctCount;

    // Simple scoring formula
    const questionScore = Math.max(
      0,
      correctCount / correctAnswers.length - 
      incorrectCount / (allOptions.length - correctAnswers.length)
    );

    setScore(questionScore);

    // Update user info
    const totalCorrectCount = Math.round(questionScore * 100);
    await updateUserInfo(1, totalCorrectCount);
    setCurrentView("feedback");
  };

  // Update user info in the database
  const updateUserInfo = async (exercisesIncrement: number, correctIncrement: number) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No auth token found");
        return;
      }
      
      const response = await fetch("/api/user", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          exercises_count_increment: exercisesIncrement,
          correct_count_increment: correctIncrement,
        }),
      });

      if (!response.ok) {
        console.error("Failed to update user info");
      } else {
        console.log("User info updated successfully");
      }
    } catch (error) {
      console.error("Error updating user info:", error);
    }
  };

  if (loading) {
    return (
      <div className="relative flex items-center justify-center min-h-screen bg-black text-white">
        <ThreeJSBackground />
        <div className="text-center z-10">
          <div className="inline-block p-3 rounded-full bg-gradient-to-r from-cyan-500 to-pink-500 animate-spin mb-4">
            <div className="w-8 h-8 rounded-full bg-black"></div>
          </div>
          <p className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-400">
            Loading your music challenge...
          </p>
        </div>
      </div>
    );
  }

  if (allOptions.length === 0) {
    return (
      <div className="relative flex items-center justify-center min-h-screen bg-black text-white">
        <ThreeJSBackground />
        <Card className="max-w-md w-full border-4 border-pink-500 bg-black bg-opacity-80 backdrop-blur-md text-white shadow-lg shadow-pink-500/30 z-10">
          <CardHeader className="border-b border-pink-500/30">
            <CardTitle className="text-center text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-400">
              No Questions Available
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 text-center">
            <p className="mb-6 text-gray-300">
              There are no questions available for this exercise.
            </p>
            <Button
              className="bg-gradient-to-r from-cyan-500 to-pink-500 hover:from-cyan-600 hover:to-pink-600 text-white font-bold"
              onClick={()=>{router.push("/dashboard");}}
            >
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render the selection view
  if (currentView === "selection") {
    return (
      <div className="relative min-h-screen bg-black text-white overflow-hidden" ref={containerRef}>
        <ThreeJSBackground />
        
        {/* Top header */}
        <div className="absolute top-0 left-0 right-0 z-50 p-4 bg-gradient-to-b from-black to-transparent">
          <div className="container mx-auto">
            <div className="flex justify-between items-center mb-2">
              <Button
                className="bg-gradient-to-b from-black to-transparent text-white font-bold"
                onClick={()=>{
                  router.push("/dashboard");
                }}
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
        
        {/* Main content */}
        <div className="container mx-auto px-4 py-20 relative z-10 min-h-screen flex flex-col items-center">
          <div className="flex flex-col md:flex-row w-full max-w-5xl gap-4 mb-6">
            {/* Score boards */}
            <div className="md:w-1/4 flex flex-col space-y-4">
              {/* Options left scoreboard */}
              <Card className="border-2 border-cyan-500 bg-black bg-opacity-80 backdrop-blur-md text-white">
                <CardContent className="p-4">
                  <h3 className="text-sm font-bold text-cyan-400 mb-1">Options Left:</h3>
                  <p className="text-lg font-bold">
                    {Math.max(0, correctAnswers.length - selectedAnswers.length)} left to pick ({correctAnswers.length} total)
                  </p>
                </CardContent>
              </Card>
              
              {/* Combo scoreboard */}
              <Card className="border-2 border-pink-500 bg-black bg-opacity-80 backdrop-blur-md text-white">
                <CardContent className="p-4">
                  <h3 className="text-sm font-bold text-pink-400 mb-1">Combo:</h3>
                  <div className="flex items-center">
                    <Flame className="text-red-500 h-5 w-5 mr-2" />
                    <p className="text-lg font-bold">{combo}x</p>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* YouTube player */}
            <div className="md:w-3/4">
              <div className="rounded-lg overflow-hidden border-2 border-white shadow-lg shadow-cyan-500/30">
                <YouTube
                  videoId={videoId}
                  opts={{
                    width: '100%',
                    height: '100%',
                    playerVars: {
                      autoplay: 0,
                    },
                  }}
                  className="aspect-video w-full"
                />
              </div>
            </div>
          </div>
          
          {/* Option cards grid - redesigned */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4 w-full max-w-5xl">
            {allOptions.map((option, index) => {
              const isSelected = selectedAnswers.includes(option.name);
              
              return (
                <div
                  key={index}
                  className={`group relative overflow-hidden rounded-lg cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg border-2 border-cyan-500 bg-black bg-opacity-80 backdrop-blur-md ${
                    isSelected ? "opacity-50 scale-95 bg-cyan-900 bg-opacity-30" : "opacity-100"
                  }`}
                  onClick={() => handleAnswerSelect(option.name)}
                >
                  {/* Content */}
                  <div className="relative flex items-center justify-center p-4 text-center min-h-12">
                    {/* Option text */}
                    <div className="font-semibold text-md text-white">
                      {option.name}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Add custom keyframe animation */}
          <style jsx global>{`
            @keyframes pulse {
              0% { transform: scale(0.95); opacity: 0.5; }
              50% { transform: scale(1.05); opacity: 0.3; }
              100% { transform: scale(0.95); opacity: 0.5; }
            }
          `}</style>
        </div>
      </div>
    );
  }
  
  // Render the feedback view
  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden">
      <ThreeJSBackground />
      
      <div className="container mx-auto px-4 py-24 relative z-10 min-h-screen flex flex-col items-center justify-center">
        <Card className="w-full max-w-md border-2 border-cyan-500 bg-black bg-opacity-80 backdrop-blur-md text-white shadow-lg shadow-cyan-500/30">
          <CardHeader className="border-b border-cyan-500/30">
            <CardTitle className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-cyan-400">
              Results
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {/* Just show selected and correct answers as text */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold mb-2 text-pink-400">Your Selected Answers:</h3>
              <ul className="list-disc pl-5 space-y-1">
                {selectedAnswers.map((answer, index) => (
                  <li key={index} className="text-white">
                    {answer}
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="mb-6">
              <h3 className="text-sm font-semibold mb-2 text-cyan-400">Correct Answers:</h3>
              <ul className="list-disc pl-5 space-y-1">
                {correctAnswers.map((correct, index) => (
                  <li key={index} className="text-white">
                    {correct.name}
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Return to dashboard button */}
            <div className="flex justify-center mt-6">
              <Button
                className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold px-6 py-3"
                onClick={()=>{router.push("/dashboard");}}
              >
                Return to Dashboard <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}