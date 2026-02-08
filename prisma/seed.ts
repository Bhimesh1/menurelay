import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
    const email = "admin@example.com"
    const password = "adminpassword"
    const passwordHash = await bcrypt.hash(password, 10)

    try {
        const admin = await prisma.user.upsert({
            where: { email },
            update: {
                passwordHash,
            },
            create: {
                email,
                passwordHash,
            },
        })

        console.log("Admin upserted:", admin.email)
    } finally {
        await prisma.$disconnect()
    }
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
