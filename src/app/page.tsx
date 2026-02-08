import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white p-4">
      <div className="max-w-2xl text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <h1 className="text-6xl font-extrabold tracking-tight sm:text-7xl">
          Party Order <span className="text-yellow-300">Simplified</span>
        </h1>
        <p className="text-xl sm:text-2xl text-indigo-100 font-medium">
          Create events, import menus, and collect food orders from your guests in minutes.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Link href="/admin">
            <Button size="lg" className="w-full sm:w-auto bg-white text-indigo-600 hover:bg-indigo-50 text-xl h-14 px-8 rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95 font-bold">
              Admin Dashboard
            </Button>
          </Link>
          <Link href="/signup">
            <Button size="lg" className="w-full sm:w-auto bg-indigo-600/20 border-2 border-white/20 hover:bg-white/10 text-white text-xl h-14 px-8 rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95 font-bold">
              Sign Up
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="ghost" size="lg" className="w-full sm:w-auto text-white hover:bg-white/10 text-xl h-14 px-8 rounded-2xl transition-all hover:scale-105 active:scale-95 font-bold">
              Login
            </Button>
          </Link>
        </div>
      </div>

      <div className="absolute bottom-8 text-indigo-100/50 text-sm font-medium tracking-wider uppercase">
        Built with Next.js • Prisma • Tailwind
      </div>
    </div>
  )
}
