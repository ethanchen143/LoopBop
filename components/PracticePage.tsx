"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame, ArrowLeft, HelpCircle, MessageSquare, Smile, ThumbsUp } from 'lucide-react';
import ThreeJSBackground from "@/components/ThreeShape";
import YouTube from "react-youtube";
import ForceFieldOptions from "@/components/ForceFieldOptions";

// Define interfaces
interface CommentData {
  id: string;
  text: string;
  timestamp: string;
  userId?: string;
}

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
  explanation: string;
  options: QuestionOption[];
  correctAnswers: QuestionOption[];
}

interface GenreMatch {
  genre: string;
  score: number;
}

interface SimilarityScores {
  [key: string]: GenreMatch;
}

// Enhanced cleanText function to handle unusual characters
const cleanText = (text: string): string => {
  if (!text) return '';
  
  return text
    // Replace unusual quotes with standard ones
    .replace(/Ò/g, '"')
    .replace(/Ó/g, '"')
    .replace(/Ô/g, "'")
    .replace(/Õ/g, "'")
    // Replace unusual hyphens/dashes
    .replace(/Ñ/g, "-")
    // Clean up any other unusual characters
    .replace(/É/g, "")
    .replace(/Ê/g, "")
    .replace(/Á/g, "")
    .replace(/Í/g, "")
    .replace(/Ú/g, "")
    .replace(/Ç/g, "");
};

const parseExplanation = (text: string) => {
  // Clean and normalize the text
  const cleanedText = cleanText(text || '')
    .replace(/\*\*/g, ' ')  // Replace ** with spaces
    .replace(/\s+/g, ' ');  // Normalize spaces
  
  // Find all occurrences of "Tag:" and "Quote:"
  const tagIndices = [];
  const quoteIndices = [];
  
  let tagPos = cleanedText.indexOf('Tag:');
  while (tagPos !== -1) {
    tagIndices.push(tagPos);
    tagPos = cleanedText.indexOf('Tag:', tagPos + 1);
  }
  
  let quotePos = cleanedText.indexOf('Quote:');
  while (quotePos !== -1) {
    quoteIndices.push(quotePos);
    quotePos = cleanedText.indexOf('Quote:', quotePos + 1);
  }
  
  // Combine and sort all indices to create segments
  const allMarkers = [...tagIndices.map(idx => ({ type: 'tag', position: idx })),
                      ...quoteIndices.map(idx => ({ type: 'quote', position: idx }))];
  
  // Sort by position in the text
  allMarkers.sort((a, b) => a.position - b.position);
  
  // Process the segments
  const tagQuotePairs = [];
  let currentTag = null;
  
  for (let i = 0; i < allMarkers.length; i++) {
    const currentMarker = allMarkers[i];
    const nextMarker = allMarkers[i + 1];
    
    // Calculate the end position (either the next marker or the end of text)
    const endPos = nextMarker ? nextMarker.position : cleanedText.length;
    
    // Extract content (removing the marker prefix)
    let content = '';
    if (currentMarker.type === 'tag') {
      content = cleanedText.substring(currentMarker.position + 4, endPos).trim();
    } else { // quote
      content = cleanedText.substring(currentMarker.position + 6, endPos).trim();
    }
    
    if (currentMarker.type === 'tag') {
      // Check if it's a tag or actually a quote based on length
      if (content.length < 15) {
        // It's a proper tag
        currentTag = content;
      } else {
        // It's a long "tag" so treat as a quote
        tagQuotePairs.push({
          tag: currentTag,
          quote: 'Tag: ' + content
        });
      }
    } else { // quote
      // Add to pairs with current tag
      tagQuotePairs.push({
        tag: currentTag,
        quote: content
      });
    }
  }
  
  return tagQuotePairs;
};

interface UserData {
  email: string;
  exercises_count?: number;
  correct_count?: number;
}

interface Neo4jInteger {
  low: number;
  high: number;
  toString: () => string;
}

// Helper function to ensure values are proper JavaScript values, not Neo4j objects
const ensureJSValue = (value: unknown): unknown => {
  if (value === null || value === undefined) return value;
  
  // Handle Neo4j integers (objects with low and high properties)
  if (typeof value === 'object' && value !== null && 'low' in value && 'high' in value) {
    return Number((value as Neo4jInteger).toString());
  }
  
  // Handle arrays
  if (Array.isArray(value)) {
    return value.map(item => ensureJSValue(item));
  }
  
  // Handle objects
  if (typeof value === 'object' && value !== null) {
    const result: Record<string, unknown> = {};
    for (const key in value) {
      result[key] = ensureJSValue((value as Record<string, unknown>)[key]);
    }
    return result;
  }
  
  return value;
};

// Digital number component for arcade scoreboard
const DigitalNumber = ({ value, className = "" }: { value: number, className?: string }) => {
  // Each segment is identified by a letter (a through g)
  const segments = {
    0: ['a', 'b', 'c', 'd', 'e', 'f'],
    1: ['b', 'c'],
    2: ['a', 'b', 'g', 'e', 'd'],
    3: ['a', 'b', 'c', 'd', 'g'],
    4: ['f', 'g', 'b', 'c'],
    5: ['a', 'f', 'g', 'c', 'd'],
    6: ['a', 'f', 'g', 'c', 'd', 'e'],
    7: ['a', 'b', 'c'],
    8: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
    9: ['a', 'b', 'c', 'd', 'f', 'g']
  };

  const activeSegments = segments[value as keyof typeof segments] || [];

  return (
    <div className={`relative w-8 h-20 ${className}`}>
      {[
        { pos: "top-0 left-1 right-1 h-2", seg: "a" },
        { pos: "top-1 right-0 w-2 h-8", seg: "b" },
        { pos: "bottom-1 right-0 w-2 h-8", seg: "c" },
        { pos: "bottom-0 left-1 right-1 h-2", seg: "d" },
        { pos: "bottom-1 left-0 w-2 h-8", seg: "e" },
        { pos: "top-1 left-0 w-2 h-8", seg: "f" },
        { pos: "top-9 left-1 right-1 h-2", seg: "g" },
      ].map(({ pos, seg }) => (
        <div
          key={seg}
          className={`absolute ${pos} ${activeSegments.includes(seg) ? 'bg-cyan-400' : 'bg-gray-800'} transition-colors duration-200`}
        />
      ))}
    </div>
  );
};

// Arcade Scoreboard Component
const ArcadeScoreboard = ({ selected, total }: { selected: number, total: number }) => {
  // Convert numbers to individual digits
  const selectedDigits = selected.toString().padStart(2, '0').split('').map(Number);
  const totalDigits = total.toString().padStart(2, '0').split('').map(Number);
  
  return (
    <div className="relative p-4 rounded-lg border-4 border-pink-500 bg-black bg-opacity-80 backdrop-blur-md">      
      <div className="flex justify-center items-center gap-6">
        <div className="text-center">
          <div className="flex space-x-1 mb-2  animate-pulse">
            {selectedDigits.map((digit, idx) => (
              <DigitalNumber key={`selected-${idx}`} value={digit} />
            ))}
          </div>
          <p className="text-cyan-400 text-lg font-bold mt-1">PICKED</p>
        </div>
        
        <div className="text-cyan-400 text-5xl font-bold">:</div>
        
        <div className="text-center">
          <div className="flex space-x-1 mb-2">
            {totalDigits.map((digit, idx) => (
              <DigitalNumber key={`total-${idx}`} value={digit} />
            ))}
          </div>
          <p className="text-cyan-400 text-lg font-bold mt-1">TOTAL</p>
        </div>
      </div>
    </div>
  );
};

export default function PracticePage() {
  const [allOptions, setAllOptions] = useState<QuestionOption[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<"selection" | "feedback">("selection");
  const [correctAnswers, setCorrectAnswers] = useState<QuestionOption[]>([]);
  const [videoId, setVideoId] = useState("");
  const [combo, setCombo] = useState(1); // Start at 1 for first practice
  
  // New state for similarity scores
  const [similarityScores, setSimilarityScores] = useState<SimilarityScores | null>(null);
  const [averageScore, setAverageScore] = useState<number>(0);
  
  // New state for modals and explanations
  const [showExplanationModal, setShowExplanationModal] = useState(false);
  const [showMoodModal, setShowMoodModal] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false); // New state for comments modal
  const [selectedMood, setSelectedMood] = useState("");
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [comments, setComments] = useState<CommentData[]>([]);
  const [newComment, setNewComment] = useState("");
  const [questionData, setQuestionData] = useState<Question | null>(null);
  const [likeCount, setLikeCount] = useState(0);
  const [userLiked, setUserLiked] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null); // New state for user data
  const [showGradingDetails, setShowGradingDetails] = useState(false); // For collapsible grading explanation
  
  // Container dimensions for force field
  const [containerDimensions, setContainerDimensions] = useState({ width: 800, height: 400 });
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const containerRef = useRef<HTMLDivElement>(null);
  const forceFieldContainerRef = useRef<HTMLDivElement>(null);

  const songTitle = searchParams.get("song") || "";

  // Available mood options
  const moodOptions = [
    "Aggressive", "Bittersweet", "Happy", "Chill", "Dark", "Dreamy", 
    "Energetic", "Epic", "Ethereal", "Fun", "Melancholic", "Nostalgic", 
    "Romantic", "Sad", "Seductive", "Smooth", "Warm", "Weird"
  ];

  // Fetch user data - new function
  const fetchUserData = async (): Promise<UserData | null> => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No auth token found");
        return null;
      }
      
      const response = await fetch("/api/user", {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch user info');
      }
      
      const data = await response.json();
      setUserData(data);
      return data;
    } catch (error) {
      console.error("Error fetching user data:", error);
      return null;
    }
  };

  // Helper function to standardize YouTube ID format
  const getStandardYouTubeId = (youtubeString: string): string => {
    if (!youtubeString) return "";
    
    // Handle URLs with v= parameter
    if (youtubeString.includes('v=')) {
      const parts = youtubeString.split('v=');
      return parts[1].split('&')[0]; // Remove any additional parameters
    }
    
    // Handle direct video IDs or youtu.be format
    if (youtubeString.includes('youtu.be/')) {
      return youtubeString.split('youtu.be/')[1].split('?')[0];
    }
    
    // Assume it's already a video ID
    return youtubeString;
  };

  // Helper function to get color based on score
  const getScoreColor = (score: number) => {
    if (score >= 80) return "#22c55e"; // Green
    if (score >= 50) return "#eab308"; // Yellow
    return "#ef4444"; // Red
  };

  // Helper function to get gradient based on score
  const getScoreGradient = (score: number) => {
    if (score >= 80) return "from-green-500 to-green-600";
    if (score >= 50) return "from-yellow-500 to-yellow-600";
    return "from-red-500 to-red-600";
  };

  // Update container dimensions on mount and when view changes
  useEffect(() => {
    const updateDimensions = () => {
      if (forceFieldContainerRef.current) {
        const rect = forceFieldContainerRef.current.getBoundingClientRect();
        
        if (rect.width > 0 && rect.height > 0) {
          setContainerDimensions({
            width: rect.width,
            height: rect.height
          });
        } else {
          // Fallback dimensions
          setContainerDimensions({
            width: 800,
            height: 400
          });
        }
      }
    };
    
    // Initial update with delay to ensure DOM is ready
    const timer = setTimeout(() => {
      updateDimensions();
    }, 500);
    
    // Update on window resize
    window.addEventListener('resize', updateDimensions);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateDimensions);
    };
  }, [currentView]);

  // Check if user is logged in and fetch user data
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/auth");
        return;
      }
      
      try {
        // Fetch user data
        const userData = await fetchUserData();
        
        if (!userData) {
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
        const response = await fetch(`/api/question?song=${encodeURIComponent(songTitle)}`);
        
        if (!response.ok) {
          throw new Error('API call failed');
        }
        
        const data = await response.json();
        
        if (data && data.length > 0) {
          // Store the first question data for explanations
          setQuestionData(data[0]);
          
          // Combine all options from both questions
          const allOptionsFromQuestions = data.flatMap((q: Question) => q.options);
          
          // Combine all correct answers
          const allCorrectAnswers = data.flatMap((q: Question) => q.correctAnswers);
          
          // Get standardized YouTube ID
          const firstYoutubeData = data[0].youtube;
          const standardYoutubeId = getStandardYouTubeId(firstYoutubeData);
          
          console.log("Fetched data:", { 
            optionsCount: allOptionsFromQuestions.length,
            correctCount: allCorrectAnswers.length,
            youtubeId: standardYoutubeId
          });
          
          setAllOptions(allOptionsFromQuestions);
          setCorrectAnswers(allCorrectAnswers);
          setVideoId(standardYoutubeId);

          // Fetch song data from Neo4j using YouTube ID
          fetchSongData(standardYoutubeId);
        } else {
          console.error("No data returned from API");
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching questions:", error);
        setLoading(false);
      }
    };
    
    fetchQuestions();
  }, [songTitle]);

  // Helper function to get full YouTube link from video ID
  const getFullYouTubeLink = (videoId:string) => {
    if (!videoId) return "";
    return `https://www.youtube.com/watch?v=${videoId}`;
  };

  // Modify fetchSongData function to use full YouTube link
  const fetchSongData = async (youtubeId:string) => {
    if (!youtubeId) return;
    
    const fullYoutubeLink = getFullYouTubeLink(youtubeId);
    
    try {
      const response = await fetch(`/api/song?youtube_link=${encodeURIComponent(fullYoutubeLink)}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          // Song not found in database, that's okay for new songs
          console.log("Song not yet in database:", fullYoutubeLink);
          return;
        }
        throw new Error('Failed to fetch song data');
      }
      
      const data = await response.json();
      
      // Process the data to ensure all values are safe to use
      
      interface ProcessedSongData {
        comments?: CommentData[];
        likes?: number | string;
        moods?: unknown[];
        genres?: unknown[];
        song?: Record<string, unknown>;
      }

      const processedData = ensureJSValue(data) as ProcessedSongData;

      // Update state with data from Neo4j
      if (processedData.comments && Array.isArray(processedData.comments)) {
        setComments(processedData.comments);
      }
      
      if (processedData.likes !== undefined) {
        setLikeCount(Number(processedData.likes));
      }
      
      console.log("Fetched song data from Neo4j:", processedData);
    } catch (error) {
      console.error("Error fetching song data:", error);
    }
  };

  // Handle user selecting/deselecting an answer
  const handleAnswerSelect = (answer: string) => {
    console.log("Answer selected:", answer);
    setSelectedAnswers((prevSelected) => {
      if (prevSelected.includes(answer)) {
        return prevSelected.filter((a) => a !== answer);
      } else {
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

  // Updated: handle mood submit to use multiple moods
  const handleMoodSubmit = async () => {
    if (selectedMoods.length === 0 && !selectedMood || !questionData?.title || !videoId) return;
    
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No auth token found");
        return;
      }
      
      // Get userId from userData
      if (!userData) {
        await fetchUserData();
      }
      
      const userId = userData?.email || "anonymous_user";
      const fullYoutubeLink = getFullYouTubeLink(videoId);
      
      // Combine custom mood with selected moods if it exists
      const allMoods = [...selectedMoods];
      if (selectedMood && !selectedMoods.includes(selectedMood)) {
        allMoods.push(selectedMood);
      }
      
      // Create requests for each mood
      const moodPromises = allMoods.map(mood => {
        const songRequest = {
          youtube_link: fullYoutubeLink,
          songTitle: questionData.title,
          mood: mood,
          userId
        };
        
        return fetch("/api/song", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(songRequest),
        });
      });
      
      const responses = await Promise.all(moodPromises);
      
      // Check if all responses were successful
      const allSuccessful = responses.every(response => response.ok);
      
      if (!allSuccessful) {
        throw new Error('Failed to submit one or more moods');
      }
      
      console.log("Moods submitted successfully:", allMoods);
      
      // Reset selections and close modal
      setSelectedMoods([]);
      setSelectedMood("");
      setShowMoodModal(false);
    } catch (error) {
      console.error("Error submitting moods:", error);
    }
  };

  // Updated: handle add comment to use the user's email
  const handleAddComment = async () => {
    if (newComment.trim() === "" || !questionData?.title || !videoId) return;
    
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No auth token found");
        return;
      }
      
      // Get userId from userData
      if (!userData) {
        await fetchUserData();
      }
      
      const userId = userData?.email || "anonymous_user";
      
      const fullYoutubeLink = getFullYouTubeLink(videoId);
      
      const songRequest = {
        youtube_link: fullYoutubeLink,
        songTitle: questionData.title,
        comment: newComment,
        userId
      };
      
      const response = await fetch("/api/song", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(songRequest),
      });
      
      if (!response.ok) {
        throw new Error('Failed to add comment');
      }
      
      const data = await response.json();
      console.log("Comment added successfully:", data);
      
      // Add the new comment to the local state - ensure it's safe for rendering
      if (data.comment) {
        const newCommentData = ensureJSValue(data.comment) as CommentData;
        setComments(prev => [...prev, newCommentData]);
      }
      
      setNewComment("");
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  // Updated: handle like to use the user's email
  const handleLike = async () => {
    if (userLiked || !questionData?.title || !videoId) return;
    
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No auth token found");
        return;
      }
      
      // Get userId from userData
      if (!userData) {
        await fetchUserData();
      }
      
      const userId = userData?.email || "anonymous_user";
      
      const fullYoutubeLink = getFullYouTubeLink(videoId);
      
      const songRequest = {
        youtube_link: fullYoutubeLink,
        songTitle: questionData.title,
        like: true,
        userId
      };
      
      const response = await fetch("/api/song", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(songRequest),
      });
      
      if (!response.ok) {
        throw new Error('Failed to like song');
      }
      
      const data = await response.json();
      console.log("Song liked successfully:", data);
      
      // Update local state
      setLikeCount(data.likes ? Number(data.likes) : likeCount + 1);
      setUserLiked(true);
    } catch (error) {
      console.error("Error liking song:", error);
    }
  };

  // Updated: record genre selections to use the user's email
  const recordGenreSelections = async () => {
    if (selectedAnswers.length === 0 || !questionData?.title || !videoId) return;
    
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No auth token found");
        return;
      }
      
      // Get userId from userData
      if (!userData) {
        await fetchUserData();
      }
      
      const userId = userData?.email || "anonymous_user";
      
      const fullYoutubeLink = getFullYouTubeLink(videoId);
      
      const songRequest = {
        youtube_link: fullYoutubeLink,
        songTitle: questionData.title,
        genres: selectedAnswers,
        userId
      };
      
      const response = await fetch("/api/song", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(songRequest),
      });
      
      if (!response.ok) {
        throw new Error('Failed to record genre selections');
      }
      
      const data = await response.json();
      console.log("Genre selections recorded successfully:", data);
    } catch (error) {
      console.error("Error recording genre selections:", error);
    }
  };

  // Updated: Check answers using the similarity score API
  const handleSubmitAnswers = async () => {
    try {
      const userGenres = selectedAnswers;
      const correctGenreNames = correctAnswers.map(answer => answer.name);
      
      const response = await fetch("/api/evaluate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userGenres,
          correctGenres: correctGenreNames
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to get similarity scores");
      }
      
      const data = await response.json();
      setSimilarityScores(data.matchingScores);
      setAverageScore(data.averageScore);
      
      // Update user info
      await updateUserInfo(1, data.averageScore);
      
      // Record genre selections in Neo4j
      await recordGenreSelections();
      
      setCurrentView("feedback");
    } catch (error) {
      console.error("Error evaluating answers:", error);
      // Fallback to simple scoring if similarity API fails
      const correctCount = selectedAnswers.filter((answer) =>
        correctAnswers.some((correct: QuestionOption) => correct.name === answer)
      ).length;
      const incorrectCount = selectedAnswers.length - correctCount;
      const questionScore = Math.max(
        0,
        correctCount / correctAnswers.length - 
        incorrectCount / (allOptions.length - correctAnswers.length)
      );
      const totalCorrectCount = Math.round(questionScore * 100);
      await updateUserInfo(1, totalCorrectCount);
      
      // Record genre selections in Neo4j
      await recordGenreSelections();
      
      setCurrentView("feedback");
    }
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
          <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-400">
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
            <CardTitle className="text-center text-3xl text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-400">
              No Questions Available
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 text-center">
            <p className="mb-6 text-xl text-gray-300">
              There are no questions available for this exercise.
            </p>
            <Button
              className="bg-gradient-to-r from-cyan-500 to-pink-500 hover:from-cyan-600 hover:to-pink-600 text-white text-xl font-bold py-3"
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
                className="bg-gradient-to-b from-black to-transparent text-white text-l font-bold py-2 px-6"
                onClick={()=>{
                  router.push("/dashboard");
                }}
              >
                <ArrowLeft className="mr-1 h-5 w-5" /> Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
        
        {/* Main content */}
        <div className="container mx-auto px-4 py-20 relative z-10 min-h-screen flex flex-col items-center">
          <div className="flex flex-col md:flex-row w-full max-w-5xl gap-4 mb-6">
            {/* Score boards */}
            <div className="md:w-1/4 flex flex-col space-y-4">
              {/* Objective box */}
              <Card className="border-2 border-cyan-500 bg-black bg-opacity-80 backdrop-blur-md text-white">
                <CardContent className="p-4">
                  <h3 className="font-bold text-cyan-400 mb-1">Objective: Select Genres</h3>
                </CardContent>
              </Card>
              
              {/* Combo scoreboard - now tracks practice count */}
              <Card className="border-2 border-pink-500 bg-black bg-opacity-80 backdrop-blur-md text-white">
                <CardContent className="p-4">
                  <h3 className="text-lg font-bold text-pink-400 mb-1">Practice Streak:</h3>
                  <div className="flex items-center">
                    <Flame className="text-red-500 h-6 w-6 mr-2" />
                    <p className="text-2xl font-bold">{combo}x</p>
                  </div>
                </CardContent>
              </Card>
              
              {/* New Arcade Scoreboard */}
              <ArcadeScoreboard 
                selected={selectedAnswers.length} 
                total={correctAnswers.length} 
              />
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
          
          {/* Force Field Container without visible border */}
          <div 
            ref={forceFieldContainerRef}
            className="w-full max-w-5xl bg-transparent overflow-hidden"
            style={{ height: "375px" }}
          >
            {containerDimensions.width > 0 && allOptions.length > 0 && (
              <ForceFieldOptions
                key="force-field-options" // Adding a key helps prevent unmounting when other props change
                options={allOptions}
                selectedAnswers={selectedAnswers}
                onSelect={handleAnswerSelect}
                containerWidth={containerDimensions.width}
                containerHeight={containerDimensions.height}
              />
            )}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden">
      <ThreeJSBackground />
      
      <div className="container mx-auto px-4 py-16 relative z-10 min-h-screen flex flex-col items-center justify-center">
        <Card className="w-full max-w-2xl border-2 border-cyan-400 bg-black bg-opacity-80 backdrop-blur-md text-white shadow-lg shadow-cyan-400">
          <CardHeader className="border-b border-cyan-400 relative">
            <div className="flex justify-between items-center">
              <Button
                variant="outline" 
                className="rounded-full p-3 border-2 border-cyan-400 bg-transparent hover:bg-cyan-300"
                onClick={() => router.push("/dashboard")}
              >
                <ArrowLeft className="h-7 w-7 text-cyan-400" />
              </Button>
              
              {/* Interactive buttons for Mood, Help, and Comments */}
              <div className="flex space-x-3">
                {/* Mood Button with pulse animation */}
                <Button 
                  variant="outline" 
                  className="rounded-full p-3 border-2 border-yellow-400 bg-transparent hover:bg-yellow-900/30 relative animate-pulse"
                  onClick={() => setShowMoodModal(true)}
                >
                  <Smile className="h-7 w-7 text-yellow-400" />
                  <span className="absolute -top-1 -right-1 h-3 w-3 bg-yellow-500 rounded-full"></span>
                </Button>
                
                {/* Pulsing Help Button */}
                <Button 
                  variant="outline" 
                  className="rounded-full p-3 border-2 border-pink-400 bg-transparent hover:bg-pink-900/30 relative animate-pulse"
                  onClick={() => setShowExplanationModal(true)}
                >
                  <HelpCircle className="h-7 w-7 text-pink-400" />
                  <span className="absolute -top-1 -right-1 h-3 w-3 bg-pink-500 rounded-full"></span>
                </Button>
                
                {/* Comments Button with properly positioned counter */}
                <Button 
                  variant="outline" 
                  className="rounded-full p-3 border-2 border-cyan-400 bg-transparent hover:bg-cyan-900/30 relative"
                  onClick={() => setShowCommentsModal(true)}
                >
                  <MessageSquare className="h-7 w-7 text-cyan-400" />
                  {comments.length > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-cyan-500 rounded-full flex items-center justify-center text-xs font-bold">
                      {comments.length}
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {/* Total Score Meter with Like Button */}
            
            <div className="flex flex-col items-center mb-8">
              {/* Encouragement phrase based on score */}
              <div className="text-center mb-4">
                <p className="text-3xl font-bold bg-clip-text text-gray-300">
                  {averageScore >= 100 ? "Perfect!" : 
                   averageScore >= 90 ? "Great!" :
                   averageScore >= 75 ? "Good" :
                   averageScore >= 50 ? "Imperfect" :
                   "Blunder"}
                </p>
              </div>
  
              <div className="relative w-48 h-48">
                {/* Circular meter background */}
                <div className="absolute inset-0 rounded-full bg-gray-800"></div>
                {/* Circular meter fill */}
                <div 
                  className="absolute inset-0 rounded-full" 
                  style={{
                    background: `conic-gradient(
                      ${getScoreColor(averageScore)} ${averageScore}%, 
                      transparent ${averageScore}%
                    )`,
                    transform: "rotate(-90deg)"
                  }}
                ></div>
                {/* Inner circle with score text */}
                <div className="absolute inset-4 rounded-full bg-black flex items-center justify-center">
                  <span className="text-5xl font-bold" style={{ color: getScoreColor(averageScore) }}>
                    {averageScore}%
                  </span>
                </div>
              </div>
              
              {/* Like button and count */}
              <div className="mt-4 flex items-center gap-2">
                <Button 
                  variant="outline" 
                  className={`rounded-full p-3 border-2 ${userLiked ? 'border-red-400 bg-red-900/30' : 'border-gray-400 bg-transparent hover:bg-gray-900/30'}`}
                  onClick={handleLike}
                  disabled={userLiked}
                >
                  <ThumbsUp className={`h-6 w-6 ${userLiked ? 'text-red-400 fill-red-400' : 'text-gray-400'}`} />
                </Button>
                <span className="text-xl text-gray-300">{likeCount} likes</span>
              </div>
            </div>
            
            {/* Similarity Score Visualizations */}
            <div className="space-y-4 mb-6">         
              {similarityScores && Object.entries(similarityScores).map(([userGenre, data]: [string, GenreMatch]) => (
                <div key={userGenre} className="p-4 rounded-lg bg-gray-900/50 border border-gray-800">
                  <div className="flex justify-between items-center mb-3">
                    <div className="font-medium text-xl text-cyan-400">{userGenre}</div>
                    <div className="text-lg font-semibold px-2 py-1 rounded-md bg-gradient-to-r" 
                         style={{ 
                           background: `linear-gradient(to right, ${getScoreColor(data.score)}, ${getScoreColor(Math.min(100, data.score + 10))})` 
                         }}>
                      {data.score}%
                    </div>
                    <div className="font-medium text-xl text-pink-400">{data.genre}</div>
                  </div>
                  
                  {/* Progress bar visualization */}
                  <div className="h-4 bg-gray-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full bg-gradient-to-r ${getScoreGradient(data.score)}`} 
                      style={{ width: `${data.score}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Navigation buttons */}
            <div className="flex justify-center gap-4 mt-8">
              <Button
                className="border-2 border-cyan-500 bg-transparent hover:bg-cyan-900/20 text-gray-300 text-xl font-bold px-6 py-4"
                onClick={() => {
                  // Increment combo counter for consecutive practices
                  setCombo(prevCombo => prevCombo + 1);
                  
                  // Reset state for a new practice
                  setSelectedAnswers([]);
                  setCurrentView("selection");
                  setLoading(true);
                  setUserLiked(false);
                  setComments([]);
                  
                  // Fetch a new random song
                  fetch("/api/question")
                    .then(response => response.json())
                    .then(data => {
                      if (data && data.length > 0) {
                        // Process the new data
                        setQuestionData(data[0]);
                        const allOptionsFromQuestions = data.flatMap((q: Question) => q.options);
                        const allCorrectAnswers = data.flatMap((q: Question) => q.correctAnswers);
                        
                        // Get standardized YouTube ID
                        const youtubeData = data[0].youtube;
                        const standardYoutubeId = getStandardYouTubeId(youtubeData);
                        
                        setAllOptions(allOptionsFromQuestions);
                        setCorrectAnswers(allCorrectAnswers);
                        setVideoId(standardYoutubeId);
                        
                        // Fetch new song data from Neo4j
                        fetchSongData(standardYoutubeId);
                      }
                      setLoading(false);
                    })
                    .catch(error => {
                      console.error("Error fetching new question:", error);
                      setLoading(false);
                    });
                }}
              >
                Next Song
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Explanation Modal */}
      {showExplanationModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4 overflow-auto">
          <div className="w-full max-w-2xl bg-gradient-to-br from-gray-900 to-black p-6 rounded-lg border-2 border-pink-500 shadow-lg shadow-pink-500/30 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 sticky top-0 bg-gradient-to-br from-gray-900 to-black z-10 py-2">
              <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">
                Genre Analysis
              </h2>
              <Button
                variant="ghost"
                className="text-gray-400 hover:text-pink-400 hover:bg-transparent"
                onClick={() => setShowExplanationModal(false)}
              >
                ✕
              </Button>
            </div>
            
            <div className="space-y-6">
              {questionData ? (
                <>
                  {/* Song information */}
                  <div className="mb-4">
                    <p className="text-2xl text-pink-400 font-semibold">Song: {questionData.title}</p>
                    <p className="text-xl text-cyan-400">Artist: {questionData.artist}</p>
                    <p className="text-lg text-gray-400">Album: {questionData.album}</p>
                  </div>
                  
                  {/* Explanation with Tags and Quotes - Simple stacked format */}
                  <div className="space-y-6 mb-4 max-h-96 overflow-y-auto pr-2">
                    {questionData && questionData.explanation && (
                      <div className="space-y-6">
                        {(() => {
                          // First parse the explanation
                          const parsedItems = parseExplanation(questionData.explanation);
                          
                          // Group by tag
                          const groupedByTag: Record<string, string[]> = {};
                          
                          // First, find all tags
                          parsedItems.forEach(item => {
                            if (item.tag && !groupedByTag[item.tag]) {
                              groupedByTag[item.tag] = [];
                            }
                          });
                          
                          // Then add quotes to their tags
                          parsedItems.forEach(item => {
                            if (item.tag) {
                              groupedByTag[item.tag].push(item.quote);
                            } else {
                              // For quotes without tags, create a standalone entry
                              if (!groupedByTag['__standalone__']) {
                                groupedByTag['__standalone__'] = [];
                              }
                              groupedByTag['__standalone__'].push(item.quote);
                            }
                          });
                          
                          // Render the grouped items
                          return Object.entries(groupedByTag).map(([tag, quotes], groupIndex) => (
                            <div key={`group-${groupIndex}`} className="mb-6">
                              {/* Tag name if it exists */}
                              {tag !== '__standalone__' && (
                                <div className="font-bold text-cyan-400 text-2xl mb-2">
                                  {tag}
                                </div>
                              )}
                              
                              {/* Render all quotes for this tag/group */}
                              <div className="space-y-3">
                                {quotes.map((quote, quoteIndex) => (
                                  <div 
                                    key={`quote-${groupIndex}-${quoteIndex}`} 
                                    className={`bg-gray-800/70 p-4 border-l-4 ${tag !== '__standalone__' ? 'border-cyan-500' : 'border-pink-500'} rounded-r-lg`}
                                  >
                                    <p className="text-xl text-gray-200 italic">
                                      {quote}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    )}
                  </div>
                  
                  {/* Collapsible Grading Method */}
                  <div className="bg-gray-800/50 rounded-lg border border-gray-700">
                    <button 
                      onClick={() => setShowGradingDetails(!showGradingDetails)}
                      className="w-full px-4 py-3 flex justify-between items-center focus:outline-none"
                    >
                      <h3 className="text-2xl font-semibold text-white">Grading Method</h3>
                      <span className="text-white text-2xl">
                        {showGradingDetails ? '−' : '+'}
                      </span>
                    </button>
                    
                    {showGradingDetails && (
                      <div className="p-4 border-t border-gray-700">
                        <h4 className="font-semibold text-xl text-cyan-400 mb-3">How Your Genre Selections Are Scored</h4>
                        <p className="mb-2 text-lg text-gray-300">
                          Our scoring system works on multiple levels to give you credit for your music knowledge:
                        </p>
                        <ol className="list-decimal pl-5 space-y-2 text-lg text-gray-300">
                          <li className="mb-2">
                            <span className="font-semibold text-green-400">Perfect Match (100 points)</span> - When you select a genre that&apos;s exactly right.
                          </li>
                          <li className="mb-2">
                            <span className="font-semibold text-yellow-400">Related Genres (25-95 points)</span> - When your selection isn&apos;t exact but shows good understanding:
                            <ul className="list-disc pl-5 mt-1 space-y-1 text-lg text-gray-400">
                              <li>Genres are scored based on how frequently they appear together in real songs</li>
                              <li>Higher scores (closer to 95) are given when your choice is among the most commonly co-occurring genres</li>
                              <li>Lower scores (closer to 25) are given when your choice rarely co-occurs with the correct genre</li>
                            </ul>
                          </li>
                          <li className="mb-2">
                            <span className="font-semibold text-blue-400">Same Family (50 points)</span> - When your selection is in the same genre family or category as a correct answer.
                          </li>
                          <li>
                            <span className="font-semibold text-gray-400">Learning Opportunity (0 points)</span> - When your selection doesn&apos;t closely match any correct genres, we pair it with a correct genre as a learning opportunity.
                          </li>
                        </ol>
                        <p className="mt-4 text-lg text-gray-300">
                          The final score is the average of all your genre selections.
                        </p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-xl text-gray-400 text-center">No explanation available for this question.</p>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Mood Modal */}
      {showMoodModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="w-full max-w-md bg-gradient-to-br from-gray-900 to-black p-6 rounded-lg border-2 border-yellow-500 shadow-lg shadow-yellow-500/30">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-400">
                How does this song make you feel?
              </h2>
              <Button
                variant="ghost"
                className="text-gray-400 hover:text-yellow-400 hover:bg-transparent"
                onClick={() => setShowMoodModal(false)}
              >
                ✕
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-6">
              {moodOptions.map(mood => (
                <Button
                  key={mood}
                  variant={selectedMoods.includes(mood) ? "default" : "outline"}
                  className={`
                    px-4 py-3 rounded-full border-2 text-lg
                    ${selectedMoods.includes(mood) 
                      ? 'bg-yellow-600 border-yellow-400 text-white' 
                      : 'bg-transparent border-gray-600 text-gray-300 hover:bg-yellow-900/30 hover:border-yellow-500'}
                  `}
                  onClick={() => {
                    setSelectedMoods(prev => 
                      prev.includes(mood)
                        ? prev.filter(m => m !== mood) // Remove if already selected
                        : [...prev, mood] // Add if not already selected
                    );
                  }}
                >
                  {mood}
                </Button>
              ))}
            </div>
            
            {/* Custom mood input */}
            {/* <div className="mb-6">
              <p className="text-xl text-gray-400 mb-2">Or enter your own mood:</p>
              <input
                type="text"
                placeholder="Enter custom mood..."
                className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 text-xl text-white"
                onChange={(e) => setSelectedMood(e.target.value)}
                value={selectedMood}
              />
            </div> */}
            
            <div className="flex justify-center">
              <Button
                className="bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white text-xl font-bold px-6 py-3"
                onClick={handleMoodSubmit}
                disabled={selectedMoods.length === 0 && !selectedMood}
              >
                Submit Moods
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Comments Modal (New) */}
      {showCommentsModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4 overflow-auto">
          <div className="w-full max-w-lg bg-gradient-to-br from-gray-900 to-black p-6 rounded-lg border-2 border-cyan-500 shadow-lg shadow-cyan-500/30 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 sticky top-0 bg-gradient-to-br from-gray-900 to-black z-10 py-2">
              <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                Comments
              </h2>
              <Button
                variant="ghost"
                className="text-gray-400 hover:text-cyan-400 hover:bg-transparent"
                onClick={() => setShowCommentsModal(false)}
              >
                ✕
              </Button>
            </div>
            
            {/* Comments list */}
            <div className="space-y-3 max-h-72 overflow-y-auto mb-6 pr-2">
              {!comments || comments.length === 0 ? (
                <p className="text-xl text-gray-400 text-center italic p-8">No comments yet. Be the first to share your thoughts!</p>
              ) : (
                comments.map(comment => (
                  <div key={comment.id} className="p-4 bg-gray-800/80 rounded border-l-4 border-cyan-500">
                    <div className="flex flex-col">
                      <div className="flex justify-between items-center mb-1">
                        <p className="text-lg font-semibold text-cyan-300">
                          {comment.userId || "Anonymous User"}
                        </p>
                        <span className="text-sm text-gray-500">
                          {typeof comment.timestamp === 'string' 
                            ? new Date(comment.timestamp).toLocaleString() 
                            : 'Just now'}
                        </span>
                      </div>
                      <p className="text-lg text-gray-200">{comment.text}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {/* Add comment input */}
            <div className="flex flex-col gap-3">
              <textarea 
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add your comment..." 
                className="w-full p-3 rounded bg-gray-800 border border-gray-700 text-xl text-white resize-none h-24"
              />
              <Button 
                onClick={handleAddComment}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white text-xl font-bold py-3"
                disabled={newComment.trim() === ""}
              >
                Post Comment
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}