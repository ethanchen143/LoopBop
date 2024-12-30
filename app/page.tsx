"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Globe, Headphones, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();

  const handleLoginClick = () => {
    router.push('/auth');
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-4 lg:px-6 h-14 flex items-center">
        <Link className="flex items-center justify-center" href="#">
          <Globe className="h-6 w-6 text-purple-600" />
          <span className="ml-2 text-2xl font-bold text-purple-600">LoopBop</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6 justify-center">
          <Link className="text-sm font-medium hover:underline underline-offset-4" href="#">
            Guide
          </Link>
          <Link className="text-sm font-medium hover:underline underline-offset-4" href="#">
            LoopBop Premium
          </Link>
          <Link className="text-sm font-medium hover:underline underline-offset-4" href="#">
            About
          </Link>
        </nav>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-purple-50">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                  A fun new way of music creation!
                </h1>
                <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                  No DAW required, master music terminology and unlock your creativity with AI music prompting.
                </p>
              </div>
              <div className="space-x-4">
                <Button className="bg-purple-600 hover:bg-purple-700" onClick={handleLoginClick}>
                  Log in with Spotify
                </Button>
                <Button variant="outline" onClick={handleLoginClick}>
                  Log in
                </Button>
              </div>
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32 bg-white">
          <div className="container mx-auto px-4 md:px-6">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl text-center mb-12">Key Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-center items-center">
              <Card>
                <CardContent className="flex flex-col items-center space-y-4 p-6">
                  <Zap className="h-12 w-12 text-purple-600" />
                  <h3 className="text-2xl font-bold text-center">Enhanced Prompting</h3>
                  <p className="text-gray-500 text-center">Experiment with music generation prompting.</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex flex-col items-center space-y-4 p-6">
                  <Headphones className="h-12 w-12 text-purple-600" />
                  <h3 className="text-2xl font-bold text-center">Spotify Integration</h3>
                  <p className="text-gray-500 text-center">Import and learn from your favorite songs and genres.</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex flex-col items-center space-y-4 p-6">
                  <CheckCircle className="h-12 w-12 text-purple-600" />
                  <h3 className="text-2xl font-bold text-center">Gamified Learning</h3>
                  <p className="text-gray-500 text-center">Enjoy personalized quizzes to master music terminology.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-gray-500 text-center">© 2024 LoopBop. All rights reserved.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6 justify-center">
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            Terms of Service
          </Link>
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  );
}