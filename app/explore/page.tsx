"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Music, Disc, User, ArrowRight, ArrowLeft, Search, Loader2, ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ThreeJSBackground from "@/components/ThreeShape";

const categories = [
  { name: "Song", icon: Music },
  { name: "Artist", icon: User },
  { name: "Album", icon: Disc },
];

interface SelectedItem {
  name: string;
  artist?: string;
  artists?: string; 
  album?: string; 
  youtube?: string; 
  pic?: string;
  description?: string;
}

export default function ExplorePage() {
  const [selectedCategory, setSelectedCategory] = useState("Song");
  const [searchResults, setSearchResults] = useState([]); 
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSearchTerm, setActiveSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const limit = 15;
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/explore?page=${page}&limit=${limit}&category=${selectedCategory}&search=${encodeURIComponent(activeSearchTerm)}`
        );
        const result = await response.json();
        setSearchResults(result.results);
        setSelectedItem(null);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [selectedCategory, page, activeSearchTerm]);

  const handleNextPage = () => setPage((prev) => prev + 1);
  const handlePrevPage = () => setPage((prev) => Math.max(1, prev - 1));
  
  const handleSearch = () => {
    setIsSearching(true);
    setActiveSearchTerm(searchTerm);
    setPage(1);
    setTimeout(() => setIsSearching(false), 800); // Simulate loading for animation
  };

  const handlePractice = () => {
    if (selectedItem) {
      const practiceUrl = `/practice?song=${encodeURIComponent(selectedItem.name)}&artist=${encodeURIComponent(selectedItem.artist || "")}&album=${encodeURIComponent(selectedItem.album || "")}`;
      router.push(practiceUrl);
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        duration: 0.5,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: "spring", stiffness: 300, damping: 24 }
    }
  };

  return (
    <div className="relative flex flex-col min-h-screen w-full overflow-hidden bg-black">
      {/* Three.js Background */}
      <ThreeJSBackground />
      
      {/* Grid pattern background */}
      <div className="absolute inset-0 z-0 bg-grid-pattern opacity-100"></div>
      
      {/* Overlay with darker gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-indigo-950/60 to-black backdrop-blur-sm z-10" />
      
      {/* Back Button */}
      <Link href="/dashboard" className="absolute top-6 left-6 z-30">
        <Button 
          variant="ghost" 
          className="text-white hover:bg-pink-500/30 hover:text-pink-300 group"
        >
          <ChevronLeft className="h-5 w-5 mr-1 group-hover:animate-pulse" />
          Back to Dashboard
        </Button>
      </Link>
      
      {/* Header */}
      <header className="relative z-20 px-6 py-4 flex items-center justify-center">
        <Link href="/" className="flex items-center">
          <Music className="h-6 w-6 text-pink-500 mr-2" />
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-cyan-400 to-pink-500">
            LoopBop
          </h1>
        </Link>
      </header>
      
      {/* Main Content */}
      <motion.main 
        className="relative z-20 flex-1 container mx-auto px-4 py-6 gap-4 flex flex-col md:flex-row"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Page Title */}
        {/* <motion.div variants={itemVariants} className="w-full mb-6 text-center">
          <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-cyan-400 to-pink-500">
            Explore Music
          </h2>
          <p className="text-white/70">Discover new songs, artists, and albums for your practice sessions</p>
        </motion.div> */}
        
        <div className="flex flex-col md:flex-row gap-4 w-full">
          {/* Left Sidebar - Categories */}
          <motion.div variants={itemVariants} className="w-full md:w-1/6">
            <Card className="backdrop-blur-md bg-black/50 border border-pink-500/30 shadow-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500 text-xl">
                  Categories
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <ul className="space-y-1">
                  {categories.map((category) => (
                    <li key={category.name}>
                      <Button
                        variant="ghost"
                        className={`w-full justify-start text-white hover:bg-pink-500/20 ${
                          selectedCategory === category.name ? "bg-pink-500/30 text-pink-300" : ""
                        }`}
                        onClick={() => {
                          setSelectedCategory(category.name);
                          setPage(1);
                        }}
                      >
                        <category.icon className="mr-2 h-4 w-4" />
                        {category.name}
                      </Button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>

          {/* Mid-Left Sidebar - Search Results */}
          <motion.div variants={itemVariants} className="w-full md:w-1/4">
            <Card className="backdrop-blur-md bg-black/50 border border-pink-500/30 shadow-xl h-full flex flex-col">
              <CardHeader className="pb-4">
                <CardTitle className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500 text-xl">
                  Search
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col h-full pb-0">
                <div className="mb-4 flex gap-2">
                  <div className="relative flex-grow">
                    <Search className="absolute left-3 top-2.5 h-5 w-5 text-white/60" />
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-10 py-2 bg-black/30 border-white/20 text-white placeholder:text-white/50 focus:border-pink-500/50 focus:ring-pink-500/30 rounded-md"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSearch();
                        }
                      }}
                    />
                  </div>
                  <Button
                    className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white"
                    onClick={handleSearch}
                    disabled={isSearching}
                  >
                    {isSearching ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Search"
                    )}
                  </Button>
                </div>
                
                <div className="flex-1 overflow-hidden flex flex-col">
                  {loading ? (
                    <div className="flex justify-center items-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
                    </div>
                  ) : (
                    <ul className="space-y-2 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                      {searchResults.length > 0 ? (
                        searchResults.map((item: SelectedItem, index) => (
                          <motion.li 
                            key={index}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                          >
                            <Button
                              variant="ghost"
                              className={`w-full justify-start text-white hover:bg-pink-500/20 ${
                                selectedItem?.name === item.name ? "bg-pink-500/30 text-pink-300" : ""
                              }`}
                              onClick={() => setSelectedItem(item)}
                            >
                              {item.name}
                            </Button>
                          </motion.li>
                        ))
                      ) : (
                        <p className="text-white/60 text-center py-4">No results found</p>
                      )}
                    </ul>
                  )}
                </div>
                
                <div className="flex justify-between p-4 border-t border-pink-500/20 mt-auto">
                  <Button 
                    onClick={handlePrevPage} 
                    disabled={page === 1}
                    variant="ghost"
                    className="text-white hover:bg-pink-500/20"
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Prev
                  </Button>
                  <span className="text-white/80">Page {page}</span>
                  <Button 
                    onClick={handleNextPage} 
                    disabled={searchResults.length < limit}
                    variant="ghost"
                    className="text-white hover:bg-pink-500/20"
                  >
                    Next
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Right Sidebar - Item Details */}
          <motion.div variants={itemVariants} className="w-full md:w-1/2">
            <Card className="backdrop-blur-md bg-black/50 border border-pink-500/30 shadow-xl h-full">
              <CardHeader className="pb-4 border-b border-pink-500/20">
                <CardTitle className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500 text-xl">
                  {selectedItem ? selectedItem.name : "Details"}
                </CardTitle>
              </CardHeader>
              <CardContent className="py-6">
                {selectedItem ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    {selectedCategory === "Song" && (
                      <>
                        <p className="text-white/80 mb-1">in {`"`+selectedItem.album+ `"`|| "N/A"}</p>
                        <p className="text-white/80 mb-4">by {selectedItem.artist || "N/A"}</p>
                        {selectedItem.youtube && (
                          <div className="mt-6 mb-6 flex justify-center">
                            <div className="w-full aspect-video rounded-lg overflow-hidden border border-pink-500/20 shadow-glow-pink">
                              <iframe
                                width="100%"
                                height="100%"
                                src={`https://www.youtube.com/embed/${new URL(selectedItem.youtube).searchParams.get("v")}`}
                                title="YouTube video player"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              ></iframe>
                            </div>
                          </div>
                        )}
                        <Button
                          className="mt-6 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-medium transition-all duration-300 border-none h-11 shadow-glow-pink w-full"
                          onClick={handlePractice}
                        >
                          Start Practice Session
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {selectedCategory === "Artist" && (
                      <div className="flex flex-col items-center md:flex-row md:items-start gap-6">
                        {selectedItem.pic && (
                          <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-pink-500/30 shadow-glow-pink flex-shrink-0">
                            <img 
                              src={selectedItem.pic} 
                              alt={`${selectedItem.name}`} 
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-cyan-400 mb-3">
                            {selectedItem.name}
                          </h3>
                          <p className="text-white/80 leading-relaxed">
                            {selectedItem.description || "No description available."}
                          </p>
                        </div>
                      </div>
                    )}
                    {selectedCategory === "Album" && (
                      <div className="flex flex-col items-center md:flex-row md:items-start gap-6">
                        {selectedItem.pic && (
                          <div className="w-48 h-48 rounded-lg overflow-hidden border border-pink-500/30 shadow-glow-pink flex-shrink-0">
                            <img 
                              src={selectedItem.pic} 
                              alt={`${selectedItem.name} Cover`} 
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-cyan-400 mb-2">
                            {selectedItem.name}
                          </h3>
                          <p className="text-white/80 mb-3">by {selectedItem.artists || "N/A"}</p>
                          <p className="text-white/80 leading-relaxed">
                            {selectedItem.description || "No description available."}
                          </p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-center">
                    <Music className="h-12 w-12 text-white/20 mb-4" />
                    <p className="text-white/60">Select an item from the list to see its details here.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.main>
      
      {/* Footer */}
      <footer className="relative z-20 p-4 text-center text-white/60 text-xs">
        © {new Date().getFullYear()} LoopBop. All rights reserved.
      </footer>
      
      {/* Global styles */}
      <style jsx global>{`
        @keyframes pulse-slow {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
        
        .animate-pulse-slow {
          animation: pulse-slow 3s infinite;
        }
        
        .shadow-glow-cyan {
          box-shadow: 0 0 15px 5px rgba(56, 189, 248, 0.3);
        }
        
        .shadow-glow-pink {
          box-shadow: 0 0 15px 5px rgba(236, 72, 153, 0.2);
        }
        
        .bg-grid-pattern {
          background-image: 
            linear-gradient(to right, rgba(54, 219, 255, 0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(54, 219, 255, 0.1) 1px, transparent 1px);
          background-size: 50px 50px;
        }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(236, 72, 153, 0.5);
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(236, 72, 153, 0.8);
        }
      `}</style>
    </div>
  );
}