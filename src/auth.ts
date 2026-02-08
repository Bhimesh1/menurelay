import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { authConfig } from "./auth.config"
import bcrypt from "bcryptjs"

export const { handlers, signIn, signOut, auth } = NextAuth({
    trustHost: true,
    ...authConfig,
    providers: [
        Credentials({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null

                const { default: prisma } = await import("@/lib/prisma")
                const user = await prisma.user.findUnique({
                    where: { email: credentials.email as string },
                })

                if (!user || !user.passwordHash) return null

                const isValid = await bcrypt.compare(
                    credentials.password as string,
                    user.passwordHash
                )

                if (!isValid) return null

                return {
                    id: user.id,
                    email: user.email,
                }
            },
        }),
    ],
})
