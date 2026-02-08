import prisma from "@/lib/prisma"
import { notFound } from "next/navigation"
import { GuestMenuClient } from "@/components/guest/guest-menu-client"
import { auth } from "@/auth"

export default async function GuestEventPage({ params }: { params: { slug: string } }) {
    const { slug } = await params
    const session = await auth()

    const event = await prisma.event.findUnique({
        where: { slug },
        include: {
            categories: {
                orderBy: { sort: "asc" },
                include: {
                    items: {
                        where: { isHidden: false },
                        orderBy: { sortOrder: "asc" },
                        include: {
                            images: { orderBy: { sort: "asc" } },
                            options: true
                        }
                    }
                }
            },
            bundles: {
                include: {
                    lines: true
                }
            }
        },
    })

    if (!event) {
        notFound()
    }

    const isOwner = session?.user?.id === event.userId

    // Only allow public view if published or locked, unless owner
    if (event.status === "DRAFT" && !isOwner) {
        notFound()
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <GuestMenuClient
                eventSlug={event.slug}
                eventName={event.title}
                restaurantName={event.restaurantName}
                showPrices={event.showPrices}
                eventSpiceScale={event.spiceScale}
                categories={event.categories}
                menuItems={event.categories.flatMap(c => c.items)}
                bundles={event.bundles}
                vipName={event.vipName}
                vipMessage={event.vipMessage}
            />
        </div>
    )
}
