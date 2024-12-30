"use client";

import { useEffect, useState } from "react";
import YouTube from "react-youtube";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Globe } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import DelayedTooltip from "@/components/DelayedTooltip";

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

export default function PracticePage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [score, setScore] = useState(0); 
  const [loading, setLoading] = useState(true);
  const [userUpdated, setUserUpdated] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const songTitle = searchParams.get("song") || "";

  // Check if user is logged in
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/auth"); // Redirect to login if no token
        return;
      }
      try {
        const response = await fetch("/api/user", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          router.push("/auth"); // Redirect if authentication fails
        }
      } catch (error) {
        console.error("Error verifying user authentication:", error);
        router.push("/auth"); // Redirect on error
      }
    };

    checkAuth();
  }, [router]);

  // Fetch questions
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await fetch(`/api/question?song=${encodeURIComponent(songTitle)}`);
        const data = await response.json();
        setQuestions(data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching questions:", error);
        setLoading(false);
      }
    };
    fetchQuestions();
  }, [songTitle]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading questions...</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>No questions available.</p>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = (currentQuestionIndex / questions.length) * 100;

  // Handle user selecting/deselecting an answer
  const handleAnswerSelect = (answer: string) => {
    setSelectedAnswers((prevSelected) =>
      prevSelected.includes(answer)
        ? prevSelected.filter((a) => a !== answer)
        : [...prevSelected, answer]
    );
  };

  // Check answers for current question
  const handleCheckAnswers = async () => {
    const correctCount = selectedAnswers.filter((answer) =>
      currentQuestion.correctAnswers.some((correct: { name: string }) => correct.name === answer)
    ).length;

    const incorrectCount = selectedAnswers.length - correctCount;

    // Simple or partial scoring formula
    const questionScore = Math.max(
      0,
      correctCount / currentQuestion.correctAnswers.length - 
      incorrectCount / currentQuestion.options.length
    );

    setScore((prevScore) => prevScore + questionScore);
    setShowFeedback(true);

    // If this is the last question, update user info
    if (currentQuestionIndex === questions.length - 1 && !userUpdated) {
      const totalCorrectCount = Math.round(((score+questionScore)/questions.length)*100);
      console.log(totalCorrectCount);
      await updateUserInfo(1, totalCorrectCount);
      setUserUpdated(true);
    }
  };

  // Go to next question
  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswers([]);
      setShowFeedback(false);
    }
  };

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

  return (
    <div className="flex flex-col min-h-screen bg-purple-50">
      <header className="px-4 lg:px-6 h-14 flex items-center bg-white">
        <Link className="flex items-center justify-center" href="/">
          <Globe className="h-6 w-6 text-purple-600" />
          <span className="ml-2 text-2xl font-bold text-purple-600">LoopBop</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Button
            variant="link"
            onClick={() => {
              router.push("/dashboard");
            }}
          >
            Back to Dashboard
          </Button>
        </nav>
      </header>
      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="flex justify-center mb-8">
          <YouTube
            videoId={currentQuestion.youtube.split("v=")[1]}
            opts={{ playerVars: { autoplay: 0 } }}
            className="rounded-lg shadow-lg"
          />
        </div>
        <div className="max-w-2xl mx-auto">
          <Progress value={progress} className="w-full mb-6" />
          <h2 className="text-2xl font-bold mb-4 text-center">{currentQuestion.question}</h2>

          {/* Selected Answers Row */}
          <div className="flex flex-wrap gap-4 mb-6 p-4 border-b-2 border-purple-600">
            {selectedAnswers.length > 0 ? (
              selectedAnswers.map((answer, index) => (
                <Button
                  key={index}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-full transition-transform transform ease-in-out duration-300"
                  onClick={() => handleAnswerSelect(answer)}
                >
                  {answer}
                </Button>
              ))
            ) : (
              <p className="text-gray-500">Select your answers below</p>
            )}
          </div>

          {/* Options as Tags with Tooltip */}
          <div className="flex flex-wrap gap-4">
            {currentQuestion.options.map(
              (option: { name: string; description: string }, index: number) => {
                const isOptionSelected = selectedAnswers.includes(option.name);
                const isOptionCorrect = currentQuestion.correctAnswers.some(
                  (correct: { name: string }) => correct.name === option.name
                );

                let buttonClass = "";
                if (!showFeedback) {
                  buttonClass = isOptionSelected
                    ? "bg-green-200 hover:bg-green-200"
                    : "bg-purple-100 hover:bg-purple-200";
                } else {
                  if (isOptionSelected && isOptionCorrect) {
                    // Correctly selected
                    buttonClass = "bg-green-500 text-white";
                  } else if (isOptionSelected && !isOptionCorrect) {
                    // Incorrectly selected
                    buttonClass = "bg-red-500 text-white";
                  } else if (!isOptionSelected && isOptionCorrect) {
                    // Missed correct
                    buttonClass = "bg-green-200";
                  } else {
                    // Everything else (not selected, not correct)
                    buttonClass = "bg-gray-200";
                  }
                }

                return (
                  <DelayedTooltip key={index} content={option.description}>
                    <Button
                      className={`px-4 py-2 rounded-full border text-black font-semibold transition-transform transform ease-in-out duration-500 hover:scale-105 ${buttonClass}`}
                      onClick={() => handleAnswerSelect(option.name)}
                      disabled={showFeedback}
                    >
                      {option.name}
                    </Button>
                  </DelayedTooltip>
                );
              }
            )}
          </div>

          <div className="mt-6 text-center">
            {!showFeedback ? (
              selectedAnswers.length > 0 && (
                <Button
                  onClick={handleCheckAnswers}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Check Answers
                </Button>
              )
            ) : (
              <>
                <p className="text-lg font-semibold mb-4">
                  {selectedAnswers.every((answer) =>
                    currentQuestion.correctAnswers.some(
                      (correct: { name: string }) => correct.name === answer
                    )
                  )
                    ? "Correct! You've selected the right answers."
                    : "Not quite. Review the correct answers."}
                </p>
                {currentQuestionIndex < questions.length - 1 ? (
                  <Button
                    onClick={handleNextQuestion}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    Next Question
                  </Button>
                ) : (
                  <div>
                    <p className="text-xl font-bold">Quiz Completed!</p>
                    {/* Display final percentage */}
                    <p className="text-lg">
                      Your score:{" "}
                      {(((score / questions.length) * 100)).toFixed()}%
                    </p>
                    <Button
                      onClick={()=>{router.push("/dashboard");}}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-full text-lg font-semibold"
                    >
                      Back to Dashboard
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}