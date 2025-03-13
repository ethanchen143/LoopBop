"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
// import { Card, CardContent } from "@/components/ui/card";
// import { Music, Search, Headphones, Zap } from 'lucide-react';
import ThreeJSBackground from "@/components/ThreeShape"; // Import the extracted component

export default function LandingPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // Set mounted to true after the component mounts
  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle login button click
  const handleLoginClick = () => {
    router.push('/auth');
  };

  // const features = [
  //   {
  //     icon: <Zap className="h-12 w-12" />,
  //     title: "Interactive Space",
  //     description: "Master the art of describing music with Genre, Era, Mood, and Sound parameters for perfect AI prompts.",
  //     color: "pink",
  //     hoverColor: "from-pink-500 to-purple-600"
  //   },
  //   {
  //     icon: <Headphones className="h-12 w-12" />,
  //     title: "Gamified Learning",
  //     description: "Take quizzes based on songs you love. Learn while having fun in our immersive 3D environment.",
  //     color: "cyan",
  //     hoverColor: "from-cyan-500 to-blue-600"
  //   },
  //   {
  //     icon: <Search className="h-12 w-12" />,
  //     title: "Music Explorer",
  //     description: "Navigate through our graph database of songs, albums, artists, and genres to discover new links.",
  //     color: "yellow",
  //     hoverColor: "from-yellow-400 to-amber-500"
  //   }
  // ];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col relative overflow-hidden">
      {/* Background grid pattern - static and safe for SSR */}
      <div className="absolute inset-0 z-0 bg-grid-pattern opacity-20"></div>
      
      {/* Client-side only Three.js scene */}
      {mounted && <ThreeJSBackground />}
      
      {/* Header - increased z-index */}
      <header className="px-4 lg:px-6 h-16 flex items-center relative z-10 border-b-4 border-pink-500 bg-gradient-to-r from-indigo-900 via-black to-indigo-900">
        <Link className="flex items-center justify-center" href="/">
          <span className="ml-2 text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-cyan-400 to-pink-500">
            LoopBop
          </span>
        </Link>
        <nav className="ml-auto flex gap-6 items-center">
          <Link className="text-sm font-medium text-cyan-400 hover:text-pink-400 transition-colors" href="#">
            Guide
          </Link>
          <Link className="text-sm font-medium text-cyan-400 hover:text-pink-400 transition-colors" href="#">
            About
          </Link>
          <Button 
            className="bg-pink-500 hover:bg-pink-600 text-black font-bold" 
            onClick={handleLoginClick}
          >
            Sign In
          </Button>
        </nav>
      </header>
      
      {/* Main Content - increased z-index */}
      <main className="flex-1 relative z-10">
        {/* Hero Section */}
        <section className="relative w-full py-28 md:py-40 overflow-hidden">
          <div className="container mx-auto px-4 md:px-6 relative z-10">
            <div className="flex flex-col items-center max-w-3xl mx-auto text-center space-y-10">
              <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-cyan-400 to-pink-500 animate-pulse-slow">
                pop music, gamified.
              </h1>
              
              <p className="text-xl md:text-2xl text-gray-300 max-w-2xl">
               Pop Loops, Fun Scoops!
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
                <Button 
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold text-lg py-6 px-8 rounded-lg shadow-glow-cyan transform transition-transform hover:scale-105"
                  onClick={handleLoginClick}
                >
                  Start Game
                </Button>
                {/* <Button 
                  className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold text-lg py-6 px-8 rounded-lg shadow-glow-pink transform transition-transform hover:scale-105"
                  variant="secondary"
                  onClick={() => document.getElementById('learn-more')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Learn More
                </Button> */}
              </div>
            </div>
          </div>
        </section>
        
        {/* Features Section */}
        {/* <section id="learn-more" className="py-20 relative">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <Card 
                  key={index}
                  className={`bg-black bg-opacity-70 backdrop-blur-md border-4 shadow-lg rounded-xl overflow-hidden transform transition-all duration-300 hover:scale-105`}
                >
                  <CardContent className="p-6 h-full flex flex-col">
                    <div className={`w-16 h-16 mb-6 rounded-full flex items-center justify-center bg-gradient-to-r ${feature.hoverColor} text-white`}>
                      {feature.icon}
                    </div>
                    <h3 className={`text-2xl font-bold mb-4 text-${feature.color}-400`}>
                      {feature.title}
                    </h3>
                    <p className="text-gray-300 mb-6 flex-grow">
                      {feature.description}
                    </p>
                    <div className={`h-2 w-full bg-gradient-to-r ${feature.hoverColor} rounded-full mt-auto`}></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section> */}
        {/* CTA Section */}
        {/* <section className="py-20 relative">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-3xl mx-auto text-center bg-gradient-to-r from-indigo-900 to-black p-10 rounded-2xl border-4 border-pink-500 shadow-2xl transform hover:scale-105 transition-transform duration-300">
              <h2 className="text-4xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500">
                Ready to Start Your Pop Music Journey?
              </h2>
              <p className="text-gray-300 mb-8 text-lg">
                Join LoopBop today and dive into our immersive 3D pop verse. Discover new genres, artists, songs, and so much more!
              </p>
              <Button 
                className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold text-lg py-6 px-10 rounded-lg shadow-glow-pink animate-pulse-slow"
                onClick={handleLoginClick}
              >
                Start Game
              </Button>
            </div>
          </div>
        </section> */}
        {/* Testimonials/Stats Section */}
        <section className="py-16 relative from-black to-indigo-900/30">
          <div className="container mx-auto px-4 md:px-6 text-center">
            <h2 className="text-3xl font-bold mb-12 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500">
              JOIN THE LOOPBOP COMMUNITY
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {[
                { count: "10K+", label: "ACTIVE USERS" },
                { count: "500+", label: "ARTISTS" },
                { count: "100+", label: "MUSIC GENRES" },
                { count: "10K+", label: "SONGS" }
              ].map((stat, index) => (
                <div key={index} className="flex flex-col items-center">
                  <span className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-cyan-400">
                    {stat.count}
                  </span>
                  <span className="text-sm font-bold mt-2 text-gray-400">
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      
      {/* Footer - increased z-index */}
      <footer className="py-6 border-t-4 border-pink-500 bg-gradient-to-r from-indigo-900 via-black to-indigo-900 relative z-10">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">            
            <div className="flex gap-8">
              <Link className="text-sm text-gray-400 hover:text-cyan-400 transition-colors" href="#">
                Terms
              </Link>
              <Link className="text-sm text-gray-400 hover:text-cyan-400 transition-colors" href="#">
                Privacy
              </Link>
              <Link className="text-sm text-gray-400 hover:text-cyan-400 transition-colors" href="#">
                Support
              </Link>
            </div>
            
            <p className="text-sm text-gray-500 mt-4 md:mt-0">
              © 2025 LoopBop. All rights reserved.
            </p>
          </div>
        </div>
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
          box-shadow: 0 0 15px 5px rgba(56, 189, 248, 0.5);
        }
        
        .shadow-glow-pink {
          box-shadow: 0 0 15px 5px rgba(236, 72, 153, 0.5);
        }
        
        .bg-grid-pattern {
          background-image: 
            linear-gradient(to right, rgba(54, 219, 255, 0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(54, 219, 255, 0.1) 1px, transparent 1px);
          background-size: 50px 50px;
        }
      `}</style>
    </div>
  );
}