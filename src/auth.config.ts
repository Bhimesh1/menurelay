import type { NextAuthConfig } from "next-auth"

export const authConfig = {
    providers: [], // Empty for now, will be populated in auth.ts
    pages: {
        signIn: "/login",
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user
            const isAdminRoute = nextUrl.pathname.startsWith("/admin")

            if (isAdminRoute) {
                if (isLoggedIn) return true
                return false // Redirect to login
            }
            return true
        },
        async session({ session, token }) {
            if (token.sub && session.user) {
                session.user.id = token.sub
            }
            return session
        },
    },
} satisfies NextAuthConfig
