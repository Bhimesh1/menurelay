import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { PlusCircle, Calendar, Utensils, Users, ArrowRight, Settings } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { CreateEventButton } from "@/components/admin/create-event-button"

export default async function AdminDashboard() {
    const session = await auth()
    const events = await prisma.event.findMany({
        where: { userId: session?.user?.id },
        orderBy: { createdAt: "desc" },
        include: {
            _count: {
                select: { menuItems: true, guestOrders: true },
            },
        },
    })

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="bg-white border-b sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <Utensils className="h-6 w-6 text-indigo-600" />
                        PartyOrder Admin
                    </h1>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-slate-500 font-medium hidden sm:inline-block">
                            {session?.user?.email}
                        </span>
                        <Link href="/api/auth/signout">
                            <Button variant="ghost" size="sm">Logout</Button>
                        </Link>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Your Events</h2>
                        <p className="text-slate-500 mt-1">Manage and track your party food orders.</p>
                    </div>

                    <CreateEventButton />
                </div>

                {events.length === 0 ? (
                    <Card className="border-dashed border-2 bg-transparent">
                        <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                            <div className="p-4 bg-indigo-50 rounded-full">
                                <Calendar className="h-10 w-10 text-indigo-500" />
                            </div>
                            <div className="max-w-xs">
                                <h3 className="text-lg font-semibold text-slate-900">No events found</h3>
                                <p className="text-slate-500 mt-1">
                                    Start by creating your first event to collect orders from your guests.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {events.map((event) => (
                            <Link key={event.id} href={`/admin/e/${event.slug}`}>
                                <Card className="group hover:shadow-xl transition-all duration-300 border-none ring-1 ring-slate-200 overflow-hidden cursor-pointer">
                                    <CardHeader className="pb-3">
                                        <div className="flex justify-between items-start mb-2">
                                            <Badge variant={
                                                event.status === "PUBLISHED" ? "default" :
                                                    event.status === "LOCKED" ? "destructive" : "secondary"
                                            } className="capitalize font-medium">
                                                {event.status.toLowerCase()}
                                            </Badge>
                                            <span className="text-xs text-slate-400 font-medium">
                                                {format(event.createdAt, "MMM d, yyyy")}
                                            </span>
                                        </div>
                                        <CardTitle className="group-hover:text-indigo-600 transition-colors text-xl font-bold">
                                            {event.title}
                                        </CardTitle>
                                        <CardDescription className="line-clamp-1 font-medium">
                                            {event.restaurantName || "No restaurant set"}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="pb-6">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-slate-50 p-3 rounded-xl flex items-center gap-3">
                                                <Utensils className="h-5 w-5 text-indigo-400" />
                                                <div>
                                                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Menu</p>
                                                    <p className="font-bold text-slate-700">{event._count.menuItems} items</p>
                                                </div>
                                            </div>
                                            <div className="bg-slate-50 p-3 rounded-xl flex items-center gap-3">
                                                <Users className="h-5 w-5 text-emerald-400" />
                                                <div>
                                                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Orders</p>
                                                    <p className="font-bold text-slate-700">{event._count.guestOrders} guests</p>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="bg-slate-50/50 py-3 border-t flex justify-between">
                                        <div className="flex items-center gap-2 text-indigo-600 font-semibold text-sm">
                                            Manage Event
                                            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                        <Settings className="h-4 w-4 text-slate-400" />
                                    </CardFooter>
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}
            </main>
        </div>
    )
}
