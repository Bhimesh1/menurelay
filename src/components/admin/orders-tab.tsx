"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Users, FileText, Download, AlertCircle, Utensils, IndianRupee, Euro, Layers, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SPICE_LEVELS } from "@/lib/utils"
import { format } from "date-fns"
import { useState } from "react"
import { deleteGuestOrder } from "@/app/actions/orders"
import { toast } from "sonner"

import { PDFDownloadButton } from "./pdf-download-button"
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"

export function OrdersTab({ event, orders }: { event: any, orders: any[] }) {
    const spiceScale = event.spiceScale as "GERMAN" | "INDIAN"
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const handleDelete = async (id: string, guestName: string) => {
        if (!confirm(`Are you sure you want to delete ${guestName}'s order?`)) return

        setDeletingId(id)
        try {
            await deleteGuestOrder(id, event.slug)
            toast.success(`Deleted ${guestName}'s order`)
        } catch (error) {
            toast.error("Failed to delete order")
        } finally {
            setDeletingId(null)
        }
    }

    // Helper to get the most accurate price for an item
    const getPrice = (item: any) => {
        if (item.priceSnapshot && item.priceSnapshot > 0) return item.priceSnapshot
        if (item.optionPrice && item.optionPrice > 0) return item.optionPrice
        return item.menuItem?.price || item.bundle?.price || 0
    }

    interface TotalItem {
        code: string;
        name: string;
        optionLabel?: string | null;
        kind: string;
        qty: number;
        notes: { guest: string; note?: string | null; spice: number; scale: "GERMAN" | "INDIAN" }[];
    }

    // Calculate totals by menu item and option
    const itemTotals = orders.reduce((acc: Record<string, TotalItem>, order: any) => {
        order.items.forEach((item: any) => {
            const key = `${item.codeSnapshot} -${item.optionLabel || 'base'}`
            const existing = acc[key]

            if (existing) {
                existing.qty += item.qty
                if (item.note || item.spiceLevel > 0) {
                    existing.notes.push({
                        guest: order.guestName,
                        note: item.note,
                        spice: item.spiceLevel,
                        scale: item.spiceScale as "GERMAN" | "INDIAN"
                    })
                }
            } else {
                acc[key] = {
                    code: item.codeSnapshot,
                    name: item.nameSnapshot,
                    optionLabel: item.optionLabel,
                    kind: item.kind,
                    qty: item.qty,
                    notes: (item.note || item.spiceLevel > 0) ? [{
                        guest: order.guestName,
                        note: item.note,
                        spice: item.spiceLevel,
                        scale: item.spiceScale as "GERMAN" | "INDIAN"
                    }] : []
                }
            }
        })
        return acc
    }, {} as Record<string, TotalItem>)

    const sortedTotals = Object.values(itemTotals).sort((a: TotalItem, b: TotalItem) => a.code.localeCompare(b.code))

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* 📥 EXPORT & SUMMARY ACTIONS */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm ring-1 ring-slate-200/50">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 leading-none mb-1.5">Fulfillment Dashboard</h2>
                    <p className="text-sm font-medium text-slate-400">Total Orders: <span className="text-indigo-600 font-bold">{orders.length}</span> • Everything synced & ready.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="border-slate-200 h-12 px-6 rounded-xl font-bold gap-2 text-indigo-600 hover:bg-indigo-50 transition-all active:scale-95 shadow-sm">
                                <Utensils className="h-4 w-4" />
                                View Kitchen Summary
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-5xl w-[95vw] h-[90vh] p-0 overflow-hidden border-none shadow-2xl rounded-[2.5rem] bg-slate-50 flex flex-col">
                            <DialogHeader className="p-8 pb-4 shrink-0">
                                <DialogTitle className="text-2xl font-black text-slate-900">Kitchen Master List</DialogTitle>
                                <DialogDescription className="text-slate-400 font-medium">Consolidated totals and guest preferences for all orders.</DialogDescription>
                            </DialogHeader>
                            <div className="flex-1 min-h-0">
                                <ScrollArea className="h-full">
                                    <div className="px-8 pt-2 pb-10 space-y-10">
                                        {/* Consolidated List Inside Dialog */}
                                        <section className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-x-auto">
                                            <Table>
                                                <TableHeader className="bg-slate-50/50">
                                                    <TableRow className="border-slate-100/50">
                                                        <TableHead className="w-24 font-black text-slate-400 uppercase tracking-widest text-[10px] pl-8 h-12">Code</TableHead>
                                                        <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[10px]">Item</TableHead>
                                                        <TableHead className="w-24 text-center font-black text-slate-400 uppercase tracking-widest text-[10px] pr-8">Qty</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {sortedTotals.map((item, idx) => (
                                                        <TableRow key={idx} className="border-slate-50">
                                                            <TableCell className="pl-8">
                                                                <Badge className="bg-slate-100 text-slate-600 border-none font-black px-2.5 h-7 rounded-lg">
                                                                    {item.code}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="py-4">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-bold text-slate-800 text-sm">{item.name}</span>
                                                                    {item.optionLabel && (
                                                                        <Badge variant="outline" className="text-[9px] font-black uppercase text-indigo-500 border-indigo-100 bg-indigo-50/30">
                                                                            {item.optionLabel}
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-center pr-8">
                                                                <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-indigo-600 text-white font-black text-sm">
                                                                    {item.qty}
                                                                </span>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </section>

                                        {/* Special Notes Inside Dialog */}
                                        <section className="space-y-4">
                                            <div className="flex items-center gap-2 ml-1">
                                                <AlertCircle className="h-4 w-4 text-amber-500" />
                                                <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Special Preferences</h4>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {sortedTotals.filter(i => i.notes.length > 0).map((item, idx) => (
                                                    <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                                                        <div className="grid grid-cols-[1fr,auto] gap-4 text-[10px] font-black uppercase tracking-widest border-b border-slate-50 pb-2">
                                                            <span className="text-slate-900 truncate pr-2">{item.name}</span>
                                                            <span className="text-slate-400 tabular-nums">{item.code}</span>
                                                        </div>
                                                        <div className="space-y-3">
                                                            {item.notes.map((note, nIdx) => (
                                                                <div key={nIdx} className="text-[11px] leading-relaxed">
                                                                    <div className="flex justify-between items-center mb-1">
                                                                        <span className="font-bold text-slate-500">{note.guest}</span>
                                                                        {note.spice > 0 && (
                                                                            <span className="text-rose-500 font-black uppercase text-[8px] tracking-tighter">
                                                                                {note.scale === 'GERMAN' ? 'GERMAN' : 'INDIAN'} {(SPICE_LEVELS[note.scale] as any)[note.spice]}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    {note.note && <p className="text-slate-400 italic font-medium pl-2 border-l border-amber-200">"{note.note}"</p>}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>
                                    </div>
                                </ScrollArea>
                            </div>
                        </DialogContent>
                    </Dialog>
                    <PDFDownloadButton event={event} totals={sortedTotals} orders={orders} />
                </div>
            </div>

            <div className="space-y-8">
                {/* 👥 GUEST ORDERS (FULL WIDTH) */}
                <div className="flex justify-between items-end px-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-indigo-50 flex items-center justify-center">
                            <Users className="h-5 w-5 text-indigo-600" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight italic underline decoration-indigo-100 decoration-8 underline-offset-8">Live Guest Feed</h3>
                    </div>
                    {orders.length > 0 && (
                        <div className="text-right">
                            <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">Total Amount</p>
                            <p className="text-3xl font-black text-emerald-600 tracking-tighter">
                                {orders.reduce((sum: number, order: any) =>
                                    sum + order.items.reduce((s: number, item: any) => s + (getPrice(item) * item.qty), 0)
                                    , 0).toFixed(2)}<span className="text-xl ml-0.5 font-black text-emerald-400">€</span>
                            </p>
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.02)] ring-1 ring-slate-200/50 overflow-hidden border border-slate-100">
                    <Table>
                        <TableHeader className="bg-slate-50/50">
                            <TableRow className="border-slate-100/50 hover:bg-transparent">
                                <TableHead className="w-1/4 font-black text-slate-400 uppercase tracking-widest text-[9px] pl-10 h-14">Guest & Time</TableHead>
                                <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[9px] h-14">Items Ordered</TableHead>
                                <TableHead className="w-32 text-center font-black text-slate-400 uppercase tracking-widest text-[9px] h-14">Total Amount</TableHead>
                                <TableHead className="w-20 text-center font-black text-slate-400 uppercase tracking-widest text-[9px] pr-10 h-14">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {orders.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-60 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center">
                                                <Users className="h-6 w-6 text-slate-200" />
                                            </div>
                                            <p className="text-slate-400 font-black text-sm uppercase tracking-widest">Awaiting First Guest...</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                orders.map((order: any) => {
                                    const orderTotal = order.items.reduce((s: number, item: any) => s + (getPrice(item) * item.qty), 0)
                                    return (
                                        <TableRow key={order.id} className="border-slate-50 hover:bg-slate-50/30 transition-colors group/row">
                                            {/* GUEST & TIME */}
                                            <TableCell className="pl-10 py-5 align-top">
                                                <div className="space-y-1.5">
                                                    <p className="font-black text-slate-900 text-lg leading-none italic decoration-indigo-200/50 decoration-2 underline-offset-4">{order.guestName}</p>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100/30">
                                                            {format(new Date(order.createdAt), "h:mm a")}
                                                        </span>
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2.5 py-1 rounded-lg">
                                                            {order.items.length} items
                                                        </span>
                                                    </div>
                                                </div>
                                            </TableCell>

                                            {/* ITEMS LIST */}
                                            <TableCell className="py-5 align-top">
                                                <div className="space-y-4">
                                                    <div className="flex flex-wrap gap-2">
                                                        {order.items.map((item: any, iIdx: number) => (
                                                            <div key={iIdx} className="flex flex-wrap items-center gap-x-2 gap-y-1 bg-white px-3 py-1.5 rounded-xl border border-slate-100 shadow-sm ring-1 ring-slate-200/20 group/item">
                                                                <span className="text-indigo-600 font-black text-xs">{item.qty}x</span>
                                                                <Badge variant="ghost" className="bg-slate-50 text-slate-400 font-black text-[8px] h-3.5 px-1.5 uppercase tracking-tighter border-none">
                                                                    {item.codeSnapshot}
                                                                </Badge>
                                                                <span className="font-black text-slate-800 text-xs">{item.nameSnapshot}</span>
                                                                {item.optionLabel && (
                                                                    <Badge variant="outline" className="text-[8px] font-black uppercase text-indigo-300 border-indigo-50 px-1 h-3.5">
                                                                        {item.optionLabel}
                                                                    </Badge>
                                                                )}
                                                                {item.spiceLevel > 0 && (
                                                                    <div className="flex items-center gap-1 bg-rose-50 px-1.5 py-0.5 rounded-md border border-rose-100/50">
                                                                        <span className="text-[10px]">🔥</span>
                                                                        <span className="text-[7px] font-black uppercase text-rose-500 tracking-tighter">
                                                                            {item.spiceScale === 'GERMAN' ? 'GERMAN' : 'INDIAN'} {(SPICE_LEVELS[item.spiceScale as "GERMAN" | "INDIAN"] as any)[item.spiceLevel]}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                                {item.note && (
                                                                    <div className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse ml-0.5" title={item.note} />
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* GENERAL NOTE IF EXISTS */}
                                                    {order.notes && (
                                                        <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100/30 flex items-start gap-2 max-w-md">
                                                            <FileText className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />
                                                            <p className="text-[10px] text-slate-500 font-bold leading-relaxed italic">"{order.notes}"</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>

                                            {/* TOTAL AMOUNT */}
                                            <TableCell className="text-center py-5 align-top">
                                                <span className="inline-flex items-center justify-center font-black text-emerald-600 text-xl tracking-tighter pt-1.5">
                                                    {orderTotal.toFixed(2)}<span className="text-xs ml-0.5 mt-1 font-black opacity-60">€</span>
                                                </span>
                                            </TableCell>

                                            {/* ACTIONS */}
                                            <TableCell className="text-center pr-10 py-5 align-top">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDelete(order.id, order.guestName)}
                                                    disabled={deletingId === order.id}
                                                    className="h-10 w-10 rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all opacity-0 group-hover/row:opacity-100 shadow-sm hover:shadow-rose-100 active:scale-90"
                                                >
                                                    <Trash2 className={`h-4.5 w-4.5 ${deletingId === order.id ? "animate-pulse" : ""}`} />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    )
}

