"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Lock, Mail, UserPlus, ArrowRight } from "lucide-react"
import { signUp } from "@/app/actions/auth"
import { motion } from "framer-motion"

export default function SignUpPage() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (password !== confirmPassword) {
            toast.error("Passwords do not match")
            return
        }

        setIsLoading(true)

        const formData = new FormData()
        formData.append("email", email)
        formData.append("password", password)

        try {
            const result = await signUp(formData)

            if (result?.error) {
                toast.error(result.error)
            } else {
                toast.success("Account created successfully! Please log in.")
                router.push("/login")
            }
        } catch (error) {
            toast.error("An error occurred during sign up")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4 font-sans">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md"
            >
                <Card className="shadow-2xl border-none overflow-hidden bg-white/80 backdrop-blur-xl">
                    <div className="h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                    <CardHeader className="space-y-1 text-center pt-8">
                        <div className="mx-auto bg-indigo-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-transform hover:scale-110 duration-300">
                            <UserPlus className="h-8 w-8 text-indigo-600" />
                        </div>
                        <CardTitle className="text-3xl font-bold tracking-tight text-slate-900">Create Account</CardTitle>
                        <CardDescription className="text-slate-500 font-medium pb-2">
                            Join us to start hosting your own party events
                        </CardDescription>
                    </CardHeader>
                    <form onSubmit={handleSubmit}>
                        <CardContent className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-slate-700 font-bold text-xs uppercase tracking-wider">Email Address</Label>
                                <div className="relative group">
                                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-indigo-500" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="you@example.com"
                                        className="pl-10 h-11 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10 transition-all rounded-xl shadow-sm"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-slate-700 font-bold text-xs uppercase tracking-wider">Password</Label>
                                <div className="relative group">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-indigo-500" />
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="pl-10 h-11 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10 transition-all rounded-xl shadow-sm"
                                        required
                                        minLength={6}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword" className="text-slate-700 font-bold text-xs uppercase tracking-wider">Confirm Password</Label>
                                <div className="relative group">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-indigo-500" />
                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="pl-10 h-11 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10 transition-all rounded-xl shadow-sm"
                                        required
                                    />
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-6 pb-8 flex flex-col space-y-6">
                            <Button
                                type="submit"
                                className="w-full h-12 text-base bg-indigo-600 hover:bg-indigo-700 transition-all font-bold shadow-lg shadow-indigo-100 rounded-xl flex items-center justify-center gap-2 group"
                                disabled={isLoading}
                            >
                                {isLoading ? "Creating account..." : "Create Account"}
                                {!isLoading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
                            </Button>

                            <div className="text-center">
                                <span className="text-sm text-slate-500 font-medium">Already have an account? </span>
                                <Link
                                    href="/login"
                                    className="text-sm text-indigo-600 hover:text-indigo-700 font-bold underline-offset-4 hover:underline transition-all"
                                >
                                    Sign In
                                </Link>
                            </div>
                        </CardFooter>
                    </form>
                </Card>
            </motion.div>
        </div>
    )
}
