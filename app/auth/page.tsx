"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import ThreeJSBackground from "@/components/ThreeShape";
import { ArrowRight, Mail, Lock, Loader2, ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Clear any error when switching modes
  useEffect(() => {
    setError("");
  }, [isLogin]);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const endpoint = isLogin ? "/api/login" : "/api/signup";

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("token", data.token);
        router.push("/dashboard");
      } else {
        setError(data.message || "An error occurred");
      }
    } catch (error) {
      console.error(error);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

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
    <div className="relative flex items-center justify-center min-h-screen w-full overflow-hidden bg-black">
      {/* Three.js Background */}
      <ThreeJSBackground />
      
      {/* Grid pattern background similar to landing page */}
      <div className="absolute inset-0 z-0 bg-grid-pattern opacity-100"></div>
      
      {/* Overlay with darker gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-indigo-950/60 to-black backdrop-blur-sm z-10" />
      
      {/* Back Button */}
      <Link href="/" className="absolute top-6 left-6 z-30">
        <Button 
          variant="ghost" 
          className="text-white hover:bg-pink-500/30 hover:text-pink-300 group"
        >
          <ChevronLeft className="h-5 w-5 mr-1 group-hover:animate-pulse" />
          Back to Home
        </Button>
      </Link>
      
      {/* Content */}
      <motion.div 
        className="relative z-20 w-full max-w-md px-4"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.div variants={itemVariants} className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-cyan-400 to-pink-500 mb-2">
            {isLogin ? "Welcome Back" : "Join Us"}
          </h1>
          <p className="text-white/80">
            {isLogin 
              ? "Sign in to access your account" 
              : "Create an account to get started"
            }
          </p>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="backdrop-blur-md bg-black/50 border border-pink-500/30 shadow-xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500 text-xl">
                {isLogin ? "Sign In" : "Create Account"}
              </CardTitle>
              <CardDescription className="text-white/70">
                {isLogin 
                  ? "Enter your credentials below to continue" 
                  : "Fill in your details to set up your account"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <motion.div 
                  className="space-y-2"
                  variants={itemVariants}
                >
                  <Label htmlFor="email" className="text-white">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-5 w-5 text-white/60" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="pl-10 bg-black/30 border-white/20 text-white placeholder:text-white/50 focus:border-pink-500/50 focus:ring-pink-500/30"
                    />
                  </div>
                </motion.div>
                
                <motion.div 
                  className="space-y-2"
                  variants={itemVariants}
                >
                  <Label htmlFor="password" className="text-white">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-5 w-5 text-white/60" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pl-10 bg-black/30 border-white/20 text-white placeholder:text-white/50 focus:border-pink-500/50 focus:ring-pink-500/30"
                    />
                  </div>
                </motion.div>
                
                {error && (
                  <motion.p 
                    className="text-red-300 text-sm px-2 py-1.5 bg-red-900/20 rounded border border-red-400/30"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {error}
                  </motion.p>
                )}
                
                <motion.div variants={itemVariants}>
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-medium transition-all duration-300 border-none h-11 shadow-glow-pink"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {isLogin ? "Signing in..." : "Creating account..."}
                      </>
                    ) : (
                      <>
                        {isLogin ? "Sign In" : "Create Account"}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </motion.div>
              </form>
              
              <motion.div 
                className="mt-6 text-center"
                variants={itemVariants}
              >
                <p className="text-white/80 text-sm">
                  {isLogin ? "Don't have an account?" : "Already have an account?"}
                  <Button
                    variant="link"
                    className="pl-1.5 text-cyan-400 hover:text-pink-400"
                    onClick={() => setIsLogin(!isLogin)}
                  >
                    {isLogin ? "Sign up" : "Sign in"}
                  </Button>
                </p>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div 
          variants={itemVariants}
          className="mt-8 text-center text-white/60 text-xs"
        >
          © {new Date().getFullYear()} LoopBop. All rights reserved.
        </motion.div>
      </motion.div>
      
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
          box-shadow: 0 0 15px 5px rgba(236, 72, 153, 0.3);
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