"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Music, Users, Brain, GamepadIcon, ShieldIcon, LockIcon, BarChartIcon, AlertCircleIcon } from "lucide-react";
import ThreeJSBackground from "@/components/ThreeShape";

export default function LandingPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);

  // Set mounted to true after the component mounts
  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle login button click
  const handleLoginClick = () => {
    router.push('/auth');
  };

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
          <button 
            className="text-sm font-medium text-cyan-400 hover:text-pink-400 transition-colors"
            onClick={() => setAboutOpen(true)}
          >
            About Us
          </button>
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
              <div>
                <h1 className="min-h-[76px] text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-cyan-400 to-pink-500 animate-pulse-slow leading-relaxed">
                  pop music, gamified!
                </h1>
              </div>
              {/* <p className="text-xl md:text-2xl text-gray-300 max-w-2xl">
                Pop Loops, Fun Scoops!
              </p> */}
              
              <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
                <Button 
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold text-lg py-6 px-8 rounded-lg shadow-glow-cyan transform transition-transform hover:scale-105"
                  onClick={handleLoginClick}
                >
                  Get Started
                </Button>
              </div>
            </div>
          </div>
        </section>
        
        {/* Testimonials/Stats Section */}
        <section className="py-16 relative from-black to-indigo-900/30">
          <div className="container mx-auto px-4 md:px-6 text-center">
            <h2 className="text-3xl font-bold mb-12 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500">
              Join the Community
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {[
                { count: "100+", label: "ACTIVE USERS" },
                { count: "10000+", label: "ARTISTS" },
                { count: "100", label: "MUSIC GENRES" },
                { count: "10000+", label: "SONGS" }
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
              <button 
                className="text-sm text-gray-400 hover:text-cyan-400 transition-colors"
                onClick={() => setTermsOpen(true)}
              >
                Terms
              </button>
              <button 
                className="text-sm text-gray-400 hover:text-cyan-400 transition-colors"
                onClick={() => setTermsOpen(true)}
              >
                Privacy
              </button>
            </div>
            
            <p className="text-sm text-gray-500 mt-4 md:mt-0">
              © 2025 LoopBop. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* About Modal */}
      <Dialog open={aboutOpen} onOpenChange={setAboutOpen}>
        <DialogContent className="bg-black border-4 border-pink-500 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-cyan-400 to-pink-500">
              About LoopBop
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-8 py-4">
            <section>
              <h3 className="text-2xl font-bold text-cyan-400 mb-4">Our Mission</h3>
              <p className="text-gray-300">
                LoopBop was created to make learning about pop music fun and interactive. We believe that understanding music should be as enjoyable as listening to it. Through our immersive 3D environment and gamified approach, we aim to help music enthusiasts deepen their knowledge of pop music genres, artists, and history.
              </p>
            </section>
            
            <section>
              <h3 className="text-2xl font-bold text-pink-500 mb-4">What We Offer</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-r from-indigo-900 to-black p-6 rounded-xl border-2 border-cyan-500">
                  <div className="flex items-center mb-3">
                    <GamepadIcon className="h-8 w-8 text-cyan-400 mr-3" />
                    <h4 className="text-xl font-bold text-cyan-400">Gamified Learning</h4>
                  </div>
                  <p className="text-gray-300">
                    Learn while having fun in our immersive 3D environment with quizzes and challenges based on your favorite pop hits.
                  </p>
                </div>
                
                <div className="bg-gradient-to-r from-indigo-900 to-black p-6 rounded-xl border-2 border-pink-500">
                  <div className="flex items-center mb-3">
                    <Music className="h-8 w-8 text-pink-400 mr-3" />
                    <h4 className="text-xl font-bold text-pink-400">Music Explorer</h4>
                  </div>
                  <p className="text-gray-300">
                    Navigate through our extensive database of songs, albums, artists, and genres to discover new connections.
                  </p>
                </div>
                
                <div className="bg-gradient-to-r from-indigo-900 to-black p-6 rounded-xl border-2 border-cyan-500">
                  <div className="flex items-center mb-3">
                    <Brain className="h-8 w-8 text-cyan-400 mr-3" />
                    <h4 className="text-xl font-bold text-cyan-400">Interactive Space</h4>
                  </div>
                  <p className="text-gray-300">
                    Master describing music with Genre, Era, Mood, and Sound parameters for a deeper understanding of pop music elements.
                  </p>
                </div>
                
                <div className="bg-gradient-to-r from-indigo-900 to-black p-6 rounded-xl border-2 border-pink-500">
                  <div className="flex items-center mb-3">
                    <Users className="h-8 w-8 text-pink-400 mr-3" />
                    <h4 className="text-xl font-bold text-pink-400">Community</h4>
                  </div>
                  <p className="text-gray-300">
                    Join thousands of other pop music enthusiasts in our growing community. Share discoveries and compete in music challenges.
                  </p>
                </div>
              </div>
            </section>
            
            <section>
              <h3 className="text-2xl font-bold text-cyan-400 mb-4">Creator</h3>
              <p className="text-gray-300">
                LoopBop was founded Ethan Chen. (https://blue-mirror.com/)
              </p>
            </section>
            
            <section>
              <h3 className="text-2xl font-bold text-pink-500 mb-4">Try it Out</h3>
              <p className="text-gray-300 mb-6">
                Start your pop music journey today and dive into our immersive 3D pop verse. Discover new genres, artists, songs, and much more!
              </p>
              <Button 
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold text-lg py-6 px-8 rounded-lg shadow-glow-cyan transform transition-transform hover:scale-105"
                onClick={() => {
                  setAboutOpen(false);
                  handleLoginClick();
                }}
              >
                Start Game
              </Button>
            </section>
          </div>
          
          <DialogClose asChild>
            <Button className="absolute right-4 top-4 bg-pink-500 hover:bg-pink-600 text-black font-bold">
              Close
            </Button>
          </DialogClose>
        </DialogContent>
      </Dialog>

      {/* Terms Modal */}
      <Dialog open={termsOpen} onOpenChange={setTermsOpen}>
        <DialogContent className="bg-black border-4 border-pink-500 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-cyan-400 to-pink-500">
              Terms & Privacy
            </DialogTitle>
            <DialogDescription className="text-gray-300 text-lg">
              Last updated: March 15, 2025
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-8 py-4">
            <section>
              <div className="flex items-center mb-4">
                <ShieldIcon className="h-8 w-8 text-cyan-400 mr-3" />
                <h3 className="text-2xl font-bold text-cyan-400">Privacy Policy</h3>
              </div>
              <p className="text-gray-300 mb-4">
                At LoopBop, we&apos;re committed to protecting your privacy while providing an engaging music learning experience. This policy explains our data practices and your rights.
              </p>
            </section>
            
            <section>
              <div className="flex items-center mb-4">
                <LockIcon className="h-8 w-8 text-pink-400 mr-3" />
                <h3 className="text-2xl font-bold text-pink-400">Personal Data</h3>
              </div>
              <div className="bg-gradient-to-r from-indigo-900 to-black p-6 rounded-xl border-2 border-pink-500 mb-4">
                <h4 className="text-xl font-bold text-pink-400 mb-2">We Do Not Collect:</h4>
                <ul className="list-disc pl-6 text-gray-300 space-y-2">
                  <li>Personally identifiable information</li>
                  <li>Payment information</li>
                  <li>Social media profiles</li>
                  <li>Contact information</li>
                  <li>Location data</li>
                </ul>
              </div>
              <p className="text-gray-300">
                LoopBop operates on a privacy-first principle. We don&apos;t need or want your personal information to provide you with a great music learning experience.
              </p>
            </section>
            
            <section>
              <div className="flex items-center mb-4">
                <BarChartIcon className="h-8 w-8 text-cyan-400 mr-3" />
                <h3 className="text-2xl font-bold text-cyan-400">Anonymized Data Collection</h3>
              </div>
              <p className="text-gray-300 mb-4">
                To improve our platform, we collect certain anonymized data, including:
              </p>
              <div className="bg-gradient-to-r from-indigo-900 to-black p-6 rounded-xl border-2 border-cyan-500 mb-4">
                <ul className="list-disc pl-6 text-gray-300 space-y-2">
                  <li>Game performance statistics (fully anonymized)</li>
                  <li>Feature usage patterns</li>
                  <li>Music preference trends (aggregated)</li>
                  <li>App performance metrics</li>
                  <li>Error reports</li>
                </ul>
              </div>
              <p className="text-gray-300">
                This data is collected solely to improve your experience and enhance our platform. It cannot be traced back to individual users and is only analyzed in aggregate form.
              </p>
            </section>
            
            <section>
              <div className="flex items-center mb-4">
                <AlertCircleIcon className="h-8 w-8 text-pink-400 mr-3" />
                <h3 className="text-2xl font-bold text-pink-400">Additional Terms</h3>
              </div>
              <div className="space-y-4 text-gray-300">
                <p>
                  <span className="font-bold text-pink-400">Age Restriction:</span> LoopBop is intended for users of all ages, including those under 18, with appropriate parental guidance.
                </p>
                <p>
                  <span className="font-bold text-cyan-400">Content Ownership:</span> All content, including music, graphics, and educational materials, is owned by LoopBop or our licensed partners.
                </p>
                <p>
                  <span className="font-bold text-pink-400">User Conduct:</span> Users agree to engage respectfully with the platform and other users. Abusive behavior may result in account termination.
                </p>
                <p>
                  <span className="font-bold text-cyan-400">Updates:</span> These terms may be updated periodically. Significant changes will be announced within the app.
                </p>
              </div>
            </section>
            
            <section>
              <h3 className="text-2xl font-bold text-pink-500 mb-4">Contact Us</h3>
              <p className="text-gray-300">
                If you have any questions or concerns about these terms or our privacy practices, please contact us at support@loopbop.com.
              </p>
            </section>
          </div>
          
          <DialogClose asChild>
            <Button className="absolute right-4 top-4 bg-pink-500 hover:bg-pink-600 text-black font-bold">
              Close
            </Button>
          </DialogClose>
        </DialogContent>
      </Dialog>
      
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