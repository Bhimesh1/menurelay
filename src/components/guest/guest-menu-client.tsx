"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { Category, MenuItem, Bundle, MenuItemOption, MenuItemImage } from "@prisma/client"
import { motion, AnimatePresence } from "framer-motion"
import { Search, ShoppingBag, Plus, Minus, X, ChevronRight, Info, AlertCircle, CheckCircle, Leaf, Coffee, Flame, Utensils, PartyPopper } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { submitGuestOrder } from "@/app/actions/orders"
import { toast } from "sonner"
import { cn, SPICE_LEVELS, DESSERT_KEYWORDS } from "@/lib/utils"
import confetti from "canvas-confetti"

// Extend types to include relations
type MenuItemWithRelations = MenuItem & {
    options: MenuItemOption[]
    images: MenuItemImage[]
}

type BundleWithRelations = Bundle & {
    lines: { label: string; qty: number; note: string | null }[]
}

interface CartItem {
    id: string // local unique id for cart
    menuItemId?: string
    bundleId?: string
    kind: "ITEM" | "BUNDLE"
    codeSnapshot: string
    nameSnapshot: string
    qty: number
    optionLabel?: string
    optionPrice?: number
    basePrice: number
    priceSnapshot: number // Added for historical pricing sync
    spiceLevel: number
    spiceScale: "GERMAN" | "INDIAN"
    note?: string
}

interface GuestMenuClientProps {
    eventSlug: string
    eventName: string
    restaurantName: string | null
    showPrices: boolean
    eventSpiceScale: "GERMAN" | "INDIAN"
    categories: Category[]
    menuItems: MenuItemWithRelations[]
    bundles: BundleWithRelations[]
    vipName?: string | null
    vipMessage?: string | null
}

export function GuestMenuClient({
    eventSlug,
    eventName,
    restaurantName,
    showPrices,
    eventSpiceScale,
    categories,
    menuItems,
    bundles,
    vipName,
    vipMessage
}: GuestMenuClientProps) {
    const [activeCategory, setActiveCategory] = useState<string>(categories[0]?.id || "all")
    const [searchQuery, setSearchQuery] = useState("")
    const [cart, setCart] = useState<CartItem[]>([])
    const [isCartOpen, setIsCartOpen] = useState(false)
    const [selectedItem, setSelectedItem] = useState<MenuItemWithRelations | null>(null)
    const [selectedBundle, setSelectedBundle] = useState<BundleWithRelations | null>(null)

    // Scroll Indicator State
    const categoryScrollRef = useRef<HTMLDivElement>(null)
    const [scrollProgress, setScrollProgress] = useState(0)

    const checkScroll = () => {
        if (categoryScrollRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = categoryScrollRef.current
            const hiddenWidth = scrollWidth - clientWidth
            if (hiddenWidth > 0) {
                const progress = (scrollLeft / hiddenWidth) * 100
                setScrollProgress(Math.min(100, Math.max(0, progress)))
            } else {
                setScrollProgress(100)
            }
        }
    }

    // Scroll Nudge Effect
    useEffect(() => {
        const timer = setTimeout(() => {
            if (categoryScrollRef.current) {
                categoryScrollRef.current.scrollTo({ left: 50, behavior: "smooth" })
                setTimeout(() => {
                    if (categoryScrollRef.current) {
                        categoryScrollRef.current.scrollTo({ left: 0, behavior: "smooth" })
                    }
                }, 800)
            }
        }, 1000)
        return () => clearTimeout(timer)
    }, [])

    useEffect(() => {
        checkScroll()
        window.addEventListener("resize", checkScroll)
        return () => window.removeEventListener("resize", checkScroll)
    }, [categories, bundles])

    // Order Form State
    const [guestName, setGuestName] = useState("")
    const [orderNotes, setOrderNotes] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [orderSuccess, setOrderSuccess] = useState(false)
    const [showVipCelebration, setShowVipCelebration] = useState(false)

    const [customQty, setCustomQty] = useState(1)
    const [customOption, setCustomOption] = useState<MenuItemOption | null>(null)
    const [customSpice, setCustomSpice] = useState(0)
    const [customSpiceScale, setCustomSpiceScale] = useState<"GERMAN" | "INDIAN">("GERMAN")
    const [customNote, setCustomNote] = useState("")

    // Filter Items
    const filteredItems = useMemo(() => {
        let items = menuItems.filter(item => !item.isHidden)

        if (activeCategory !== "all" && activeCategory !== "bundles") {
            items = items.filter(item => item.categoryId === activeCategory)
        }

        if (searchQuery) {
            const lower = searchQuery.toLowerCase()
            items = items.filter(item =>
                item.name.toLowerCase().includes(lower) ||
                item.code.toLowerCase().includes(lower) ||
                item.description?.toLowerCase().includes(lower)
            )
        }
        return items
    }, [menuItems, activeCategory, searchQuery])

    // Filter Bundles
    const filteredBundles = useMemo(() => {
        if (activeCategory !== "bundles" && activeCategory !== "all") return []
        let b = bundles
        if (searchQuery) {
            const lower = searchQuery.toLowerCase()
            b = b.filter(bundle =>
                bundle.name.toLowerCase().includes(lower) ||
                bundle.code.toLowerCase().includes(lower)
            )
        }
        return b
    }, [bundles, activeCategory, searchQuery])

    // Handlers
    const openItemModal = (item: MenuItemWithRelations) => {
        setSelectedItem(item)
        setCustomQty(1)
        setCustomOption(item.options.length > 0 ? item.options[0] : null)
        setCustomSpice(0)
        setCustomNote("")
        setSelectedBundle(null)
    }

    const openBundleModal = (bundle: BundleWithRelations) => {
        setSelectedBundle(bundle)
        setCustomQty(1)
        setCustomNote("")
        setSelectedItem(null)
    }

    const addToCart = () => {
        if (selectedItem) {
            const price = customOption ? customOption.price : (selectedItem.price || 0)
            const newItem: CartItem = {
                id: Math.random().toString(36).substr(2, 9),
                menuItemId: selectedItem.id,
                kind: "ITEM",
                codeSnapshot: selectedItem.code,
                nameSnapshot: selectedItem.name,
                qty: customQty,
                optionLabel: customOption?.label,
                optionPrice: customOption?.price,
                basePrice: price,
                priceSnapshot: price,
                spiceLevel: customSpice,
                spiceScale: customSpiceScale,
                note: customNote
            }
            setCart(prev => [...prev, newItem])
            setSelectedItem(null)
            toast.success("Added to order")
        } else if (selectedBundle) {
            const newItem: CartItem = {
                id: Math.random().toString(36).substr(2, 9),
                bundleId: selectedBundle.id,
                kind: "BUNDLE",
                codeSnapshot: selectedBundle.code,
                nameSnapshot: selectedBundle.name,
                qty: customQty,
                basePrice: selectedBundle.price,
                priceSnapshot: selectedBundle.price,
                spiceLevel: 0,
                spiceScale: customSpiceScale,
                note: customNote
            }
            setCart(prev => [...prev, newItem])
            setSelectedBundle(null)
            toast.success("Set menu added")
        }

        // Fun burst!
        confetti({
            particleCount: 30,
            spread: 60,
            origin: { y: 0.8 },
            colors: ['#6366f1', '#a855f7', '#ec4899']
        })
    }

    const removeFromCart = (cartId: string) => {
        setCart(prev => prev.filter(item => item.id !== cartId))
    }

    const updateCartQty = (cartId: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.id === cartId) {
                const newQty = Math.max(1, item.qty + delta)
                return { ...item, qty: newQty }
            }
            return item
        }))
    }

    const cartTotal = cart.reduce((sum, item) => sum + (item.basePrice * item.qty), 0)

    const handleSubmitOrder = async () => {
        if (!guestName.trim()) {
            toast.error("Please enter your name")
            return
        }
        if (cart.length === 0) {
            toast.error("Cart is empty")
            return
        }

        setIsSubmitting(true)
        try {
            const payload = {
                guestName,
                notes: orderNotes,
                items: cart.map(item => ({
                    menuItemId: item.menuItemId,
                    bundleId: item.bundleId,
                    kind: item.kind,
                    codeSnapshot: item.codeSnapshot,
                    nameSnapshot: item.nameSnapshot,
                    qty: item.qty,
                    optionLabel: item.optionLabel,
                    optionPrice: item.optionPrice,
                    priceSnapshot: item.priceSnapshot,
                    spiceLevel: item.spiceLevel,
                    spiceScale: item.spiceScale,
                    note: item.note
                }))
            }

            await submitGuestOrder(eventSlug, payload)

            // Trigger VIP Celebration if name matches
            const isVip = vipName && guestName.toLowerCase().trim() === vipName.toLowerCase().trim()
            if (isVip) {
                setShowVipCelebration(true)
            }

            setOrderSuccess(true)
            setCart([])
            setIsCartOpen(false)
            toast.success("Order placed successfully!")
        } catch (error) {
            toast.error("Failed to place order. Please try again.")
        } finally {
            setIsSubmitting(false)
        }
    }

    // Trigger confetti on success
    useEffect(() => {
        if (orderSuccess) {
            const duration = showVipCelebration ? 10 * 1000 : 3 * 1000
            const animationEnd = Date.now() + duration
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 }

            const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min

            const interval: any = setInterval(function () {
                const timeLeft = animationEnd - Date.now()

                if (timeLeft <= 0) {
                    return clearInterval(interval)
                }

                const particleCount = (showVipCelebration ? 100 : 50) * (timeLeft / duration)
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } })
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } })

                if (showVipCelebration && Math.random() > 0.5) {
                    confetti({ ...defaults, particleCount: 20, origin: { x: 0.5, y: 0.5 } })
                }
            }, 250)

            return () => clearInterval(interval)
        }
    }, [orderSuccess, showVipCelebration])

    if (showVipCelebration) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center overflow-hidden">
                <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", damping: 15 }}
                    className="relative z-10 space-y-8"
                >
                    <div className="w-32 h-32 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-pink-500/20 ring-4 ring-pink-500/20">
                        <PartyPopper className="h-16 w-16 text-white animate-bounce" />
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-4xl sm:text-6xl font-black text-white leading-tight">
                            Hooray, {guestName}! ✨
                        </h2>
                        <div className="bg-white/10 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/20 max-w-lg mx-auto shadow-2xl">
                            <p className="text-xl sm:text-2xl font-bold text-pink-200 leading-relaxed italic">
                                "{vipMessage || "Wishing you an amazing celebration! 🎂🥳"}"
                            </p>
                        </div>
                    </div>

                    <Button
                        onClick={() => {
                            setOrderSuccess(false)
                            setShowVipCelebration(false)
                            setGuestName("")
                            setOrderNotes("")
                        }}
                        className="bg-white text-slate-900 hover:bg-slate-100 rounded-2xl h-16 px-10 font-black text-lg shadow-2xl transition-all active:scale-95"
                    >
                        Back to Party 🎈
                    </Button>
                </motion.div>

                {/* Background Sparkles */}
                <div className="absolute inset-0 pointer-events-none">
                    {Array.from({ length: 20 }).map((_, i) => (
                        <motion.div
                            key={i}
                            className="absolute h-2 w-2 rounded-full bg-white/20"
                            animate={{
                                y: [0, -100, 0],
                                opacity: [0, 1, 0],
                                scale: [0, 1.5, 0]
                            }}
                            transition={{
                                duration: Math.random() * 5 + 3,
                                repeat: Infinity,
                                delay: Math.random() * 5
                            }}
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 100}%`
                            }}
                        />
                    ))}
                </div>
            </div>
        )
    }

    if (orderSuccess) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full space-y-6">
                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle className="h-10 w-10 text-emerald-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900">Order confirmed!</h2>
                        <p className="text-slate-500 font-bold mt-2">Thanks {guestName}, items will be served shortly.</p>
                    </div>
                    <Button
                        onClick={() => {
                            setOrderSuccess(false)
                            setGuestName("")
                            setOrderNotes("")
                        }}
                        className="w-full bg-slate-900 text-white rounded-2xl h-14 font-black"
                    >
                        Place Another Order
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50/50 pb-32">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md sticky top-0 z-10 shadow-sm border-b border-indigo-50">
                <div className="px-6 py-4">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h1 className="text-xl font-black text-slate-900 leading-tight tracking-tight">{eventName} 🎉</h1>
                            {restaurantName && <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest">{restaurantName}</p>}
                        </div>
                        <Button
                            variant="default"
                            size="icon"
                            className="relative bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-2xl h-12 w-12 shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all active:scale-95"
                            onClick={() => setIsCartOpen(true)}
                        >
                            <ShoppingBag className="h-5 w-5" />
                            {cart.length > 0 && (
                                <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] font-black h-5 w-5 flex items-center justify-center rounded-full border-2 border-white animate-in zoom-in">
                                    {cart.reduce((a, b) => a + b.qty, 0)}
                                </span>
                            )}
                        </Button>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-4 top-3.5 h-5 w-5 text-indigo-300" />
                        <Input
                            placeholder="Find food or drinks..."
                            className="bg-white border-2 border-indigo-50 h-12 pl-12 rounded-2xl font-bold text-slate-700 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-0 transition-all shadow-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="pb-2 relative group">
                    <div
                        ref={categoryScrollRef}
                        onScroll={checkScroll}
                        className="w-full overflow-x-auto pb-5 flex gap-2 whitespace-nowrap px-6 scrollbar-hide [-ms-overflow-style:'none'] [scrollbar-width:'none'] [&::-webkit-scrollbar]:hidden"
                    >
                        <button
                            onClick={() => setActiveCategory("all")}
                            className={cn(
                                "px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0 active:scale-95",
                                activeCategory === "all" ? "bg-slate-900 text-white shadow-lg shadow-slate-200" : "bg-white text-slate-500 border border-slate-100 hover:border-indigo-100"
                            )}
                        >
                            All 🍽️
                        </button>
                        {bundles.length > 0 && (
                            <button
                                onClick={() => setActiveCategory("bundles")}
                                className={cn(
                                    "px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0 active:scale-95",
                                    activeCategory === "bundles" ? "bg-gradient-to-r from-orange-400 to-amber-500 text-white shadow-lg shadow-orange-200" : "bg-white text-slate-500 border border-slate-100 hover:border-orange-100"
                                )}
                            >
                                Set Menus ✨
                            </button>
                        )}
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={cn(
                                    "px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0 active:scale-95",
                                    activeCategory === cat.id ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "bg-white text-slate-500 border border-slate-100 hover:border-indigo-100"
                                )}
                            >
                                {cat.name}
                            </button>
                        ))}
                        {/* Spacing element to ensure last item isn't covered by fade */}
                        <div className="w-8 shrink-0" />
                    </div>

                    {/* Bottom Scroll Progress Bar */}
                    <div className="absolute bottom-0 left-6 right-6 h-1 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-indigo-500 rounded-full"
                            style={{ width: `${scrollProgress}%` }}
                            layoutId="scroll-progress"
                        />
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="p-6 space-y-8">
                {/* Bundles Section */}
                {filteredBundles.length > 0 && (
                    <div className="space-y-4">
                        <h3 className="font-black text-slate-900 text-lg flex items-center gap-2">
                            <span className="bg-orange-100 text-orange-600 p-1.5 rounded-lg">
                                <Utensils className="h-4 w-4" />
                            </span>
                            Set Menus
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {filteredBundles.map(bundle => (
                                <motion.div
                                    key={bundle.id}
                                    layoutId={`bundle-${bundle.id}`}
                                    className="bg-white rounded-[2rem] p-5 shadow-sm border border-indigo-50 active:scale-[0.98] transition-all hover:shadow-md hover:border-orange-200"
                                    onClick={() => openBundleModal(bundle)}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <Badge className="bg-orange-50 text-orange-600 border-none font-black text-[10px] uppercase tracking-widest pl-2 pr-3 py-1 gap-1">
                                            ✨ BEST VALUE
                                        </Badge>
                                        {showPrices && (
                                            <span className="font-black text-slate-900">{bundle.price.toFixed(2)}€</span>
                                        )}
                                    </div>
                                    <h4 className="font-black text-slate-800 text-lg leading-tight mb-2">{bundle.name}</h4>
                                    <p className="text-xs text-slate-400 font-medium line-clamp-2">{bundle.description}</p>
                                    <div className="mt-4 pt-4 border-t border-dashed border-slate-100">
                                        <div className="space-y-1">
                                            {bundle.lines.slice(0, 3).map((line, i) => (
                                                <div key={i} className="text-xs text-slate-600 font-bold flex items-center gap-2">
                                                    <span className="bg-orange-100 text-orange-700 w-5 h-5 rounded-md flex items-center justify-center text-[10px]">{line.qty}x</span>
                                                    {line.label}
                                                </div>
                                            ))}
                                            {bundle.lines.length > 3 && (
                                                <span className="text-[10px] text-slate-400 font-bold pl-7">+{bundle.lines.length - 3} more items...</span>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Items Grid */}
                <div className="space-y-4">
                    <h3 className="font-black text-slate-900 text-lg flex items-center gap-2">
                        <span className="bg-indigo-100 text-indigo-600 p-1.5 rounded-lg">
                            <Coffee className="h-4 w-4" />
                        </span>
                        Menu Items
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {filteredItems.map(item => (
                            <motion.div
                                key={item.id}
                                layoutId={`item-${item.id}`}
                                className="bg-white rounded-[1.5rem] p-4 shadow-sm border border-slate-100 flex gap-4 active:scale-[0.98] transition-all hover:border-indigo-200 hover:shadow-md"
                                onClick={() => openItemModal(item)}
                            >
                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[10px] font-black bg-indigo-50 text-indigo-400 px-2 py-0.5 rounded-md">{item.code}</span>
                                        {item.categoryId && (
                                            <span className="text-[9px] font-bold text-slate-300 uppercase tracking-wider truncate">
                                                {categories.find(c => c.id === item.categoryId)?.name}
                                            </span>
                                        )}
                                    </div>
                                    <h4 className="font-black text-slate-800 leading-snug mb-1">{item.name}</h4>
                                    {item.description && (
                                        <p className="text-xs text-slate-400 font-medium line-clamp-2 leading-relaxed">{item.description}</p>
                                    )}
                                    <div className="flex flex-wrap gap-1 mt-3">
                                        {item.isVeg && !item.isVegan && <Badge variant="secondary" className="bg-emerald-50 text-emerald-600 text-[9px] px-1.5 h-5 gap-1 hover:bg-emerald-100"><Leaf className="h-2.5 w-2.5" /> VEG</Badge>}
                                        {item.isVegan && <Badge variant="secondary" className="bg-emerald-50 text-emerald-600 text-[9px] px-1.5 h-5 gap-1 hover:bg-emerald-100"><Leaf className="h-2.5 w-2.5" /> VEGAN</Badge>}
                                        {item.isDrink && <Badge variant="secondary" className="bg-blue-50 text-blue-600 text-[9px] px-1.5 h-5 gap-1 hover:bg-blue-100"><Coffee className="h-2.5 w-2.5" /> DRINK</Badge>}
                                    </div>
                                </div>
                                <div className="flex flex-col justify-between items-end shrink-0">
                                    {showPrices && (
                                        <span className="font-black text-slate-900 bg-slate-50 px-2 py-1 rounded-xl shadow-inner text-sm">
                                            {item.price ? item.price.toFixed(2) : "—"}€
                                        </span>
                                    )}
                                    <Button size="icon" className="h-9 w-9 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-colors">
                                        <Plus className="h-5 w-5" />
                                    </Button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {filteredItems.length === 0 && filteredBundles.length === 0 && (
                    <div className="text-center py-20 opacity-50">
                        <ShoppingBag className="h-16 w-16 mx-auto mb-4 text-indigo-200" />
                        <p className="text-lg font-black text-indigo-300">Nothing here yet!</p>
                        <p className="text-sm font-bold text-slate-400">Try searching for something else.</p>
                    </div>
                )}
            </main>

            {/* Item Modal */}
            <Dialog open={!!selectedItem} onOpenChange={(o) => {
                if (!o) setSelectedItem(null)
                if (o) setCustomSpiceScale(eventSpiceScale) // Reset to event default on open
            }}>
                <DialogContent className="max-w-md w-[90%] rounded-[2.5rem] p-0 overflow-hidden bg-white border-none shadow-2xl h-[85vh] flex flex-col">
                    <ScrollArea className="flex-1">
                        <div className="p-8 pb-32"> {/* Extra padding bottom for sticky footer */}
                            <div className="flex justify-between items-start mb-6">
                                <span className="bg-slate-100 text-slate-600 font-black text-xs px-3 py-1 rounded-full">{selectedItem?.code}</span>
                                {/* Default Close button handles the X */}
                            </div>
                            <DialogTitle className="text-2xl font-black text-slate-900 leading-tight mb-2">
                                {selectedItem?.name}
                            </DialogTitle>
                            <DialogDescription className="text-slate-500 font-medium leading-relaxed">
                                {selectedItem?.description}
                            </DialogDescription>

                            <div className="flex flex-wrap gap-2 mt-4">
                                {selectedItem?.isVeg && <Badge variant="outline" className="border-emerald-200 text-emerald-600 bg-emerald-50">Vegetarian</Badge>}
                                {selectedItem?.isVegan && <Badge variant="outline" className="border-emerald-200 text-emerald-600 bg-emerald-50">Vegan</Badge>}
                                {selectedItem?.isDrink && <Badge variant="outline" className="border-amber-200 text-amber-600 bg-amber-50">Drink</Badge>}
                            </div>

                            <div className="space-y-8 mt-8">
                                {/* Options */}
                                {selectedItem?.options && selectedItem.options.length > 0 && (
                                    <div className="space-y-3">
                                        <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Select Option</Label>
                                        <div className="grid grid-cols-1 gap-2">
                                            {selectedItem.options.map(opt => (
                                                <div
                                                    key={opt.id}
                                                    className={cn(
                                                        "flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all",
                                                        customOption?.id === opt.id ? "border-slate-900 bg-slate-50" : "border-slate-100 hover:border-slate-200"
                                                    )}
                                                    onClick={() => setCustomOption(opt)}
                                                >
                                                    <span className="font-bold text-slate-700">{opt.label}</span>
                                                    <span className="font-black text-slate-900">{opt.price.toFixed(2)}€</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Spice Level */}
                                {!selectedItem?.isDrink && !DESSERT_KEYWORDS.some(k => categories.find(c => c.id === selectedItem?.categoryId)?.name.toUpperCase().includes(k)) && (
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <Label className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center justify-between gap-2">
                                                Spice Level
                                                <span className="text-[10px] bg-red-50 text-red-500 px-2 py-0.5 rounded-full font-bold">
                                                    {SPICE_LEVELS[customSpiceScale][customSpice]}
                                                </span>
                                            </Label>

                                            {/* Scale Toggle */}
                                            <div className="bg-slate-100 p-1 rounded-lg flex text-[10px] font-black">
                                                <button
                                                    onClick={() => setCustomSpiceScale("GERMAN")}
                                                    className={cn(
                                                        "px-3 py-1 rounded-md transition-all",
                                                        customSpiceScale === "GERMAN" ? "bg-white shadow-sm text-slate-900" : "text-slate-400 hover:text-slate-600"
                                                    )}
                                                >
                                                    DE
                                                </button>
                                                <button
                                                    onClick={() => setCustomSpiceScale("INDIAN")}
                                                    className={cn(
                                                        "px-3 py-1 rounded-md transition-all",
                                                        customSpiceScale === "INDIAN" ? "bg-white shadow-sm text-slate-900" : "text-slate-400 hover:text-slate-600"
                                                    )}
                                                >
                                                    IN
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex justify-between bg-slate-100 p-1.5 rounded-2xl relative">
                                            {[0, 1, 2, 3, 4].map((level) => (
                                                <button
                                                    key={level}
                                                    onClick={() => setCustomSpice(level)}
                                                    className={cn(
                                                        "w-full h-10 rounded-xl flex items-center justify-center transition-all relative z-10",
                                                        customSpice === level ? "bg-white shadow-sm ring-1 ring-slate-200" : "hover:bg-slate-200/50"
                                                    )}
                                                >
                                                    {level === 0 ? (
                                                        <span className="text-xl">🚫</span>
                                                    ) : (
                                                        <div className="flex gap-0.5">
                                                            {Array.from({ length: level }).map((_, i) => (
                                                                <Flame key={i} className={cn("h-3 w-3", customSpice === level ? "text-red-500" : "text-slate-400")} fill="currentColor" />
                                                            ))}
                                                        </div>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Notes */}
                                <div className="space-y-3">
                                    <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Special Instructions</Label>
                                    <Textarea
                                        placeholder="No onions, extra sauce..."
                                        className="bg-slate-50 border-none rounded-2xl resize-none min-h-[80px]"
                                        value={customNote}
                                        onChange={(e) => setCustomNote(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </ScrollArea>

                    {/* Sticky Footer */}
                    <div className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-slate-100/50 backdrop-blur-xl bg-white/90 rounded-b-[2.5rem]">
                        <div className="flex gap-4">
                            <div className="flex items-center bg-slate-100 rounded-2xl px-2 h-14">
                                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-white" onClick={() => setCustomQty(Math.max(1, customQty - 1))}>
                                    <Minus className="h-4 w-4" />
                                </Button>
                                <span className="w-8 text-center font-black text-lg">{customQty}</span>
                                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-white" onClick={() => setCustomQty(customQty + 1)}>
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                            <Button className="flex-1 h-14 rounded-2xl bg-slate-900 text-white font-black text-lg shadow-xl shadow-slate-200" onClick={addToCart}>
                                Add {showPrices && `• ${(((customOption?.price || selectedItem?.price || 0) * customQty)).toFixed(2)}€`}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Bundle Modal */}
            <Dialog open={!!selectedBundle} onOpenChange={(o) => !o && setSelectedBundle(null)}>
                <DialogContent className="max-w-md w-[90%] rounded-[2.5rem] p-0 overflow-hidden bg-white border-none shadow-2xl">
                    <div className="p-8 pb-4">
                        <DialogTitle className="text-2xl font-black text-slate-900 leading-tight mb-2">
                            {selectedBundle?.name}
                        </DialogTitle>
                        <DialogDescription className="text-slate-500 font-medium leading-relaxed">
                            {selectedBundle?.description}
                        </DialogDescription>

                        <div className="mt-6 bg-indigo-50 rounded-2xl p-4">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-3">Included Items</h4>
                            <div className="space-y-3">
                                {selectedBundle?.lines.map((line, i) => (
                                    <div key={i} className="flex gap-3">
                                        <span className="bg-white text-indigo-700 font-black h-6 w-6 rounded-lg flex items-center justify-center text-xs shadow-sm shrink-0">
                                            {line.qty}x
                                        </span>
                                        <div>
                                            <p className="font-bold text-slate-800 text-sm leading-snug">{line.label}</p>
                                            {line.note && <p className="text-xs text-indigo-400 font-medium">{line.note}</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-6">
                            <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Notes</Label>
                            <Textarea
                                placeholder="Any requests for the set..."
                                className="mt-2 bg-slate-50 border-none rounded-2xl resize-none min-h-[80px]"
                                value={customNote}
                                onChange={(e) => setCustomNote(e.target.value)}
                            />
                        </div>

                        <div className="flex gap-4 mt-8">
                            <div className="flex items-center bg-slate-100 rounded-2xl px-2 h-14">
                                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-white" onClick={() => setCustomQty(Math.max(1, customQty - 1))}>
                                    <Minus className="h-4 w-4" />
                                </Button>
                                <span className="w-8 text-center font-black text-lg">{customQty}</span>
                                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-white" onClick={() => setCustomQty(customQty + 1)}>
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                            <Button className="flex-1 h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg shadow-xl shadow-indigo-200" onClick={addToCart}>
                                Add Set {showPrices && `• ${((selectedBundle?.price || 0) * customQty).toFixed(2)}€`}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Cart Sheet (Simulated with fixed overlay) */}
            <AnimatePresence>
                {isCartOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-slate-900/40 z-40 backdrop-blur-sm"
                            onClick={() => setIsCartOpen(false)}
                        />
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-[2.5rem] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.2)] h-[90vh] flex flex-col"
                        >
                            <div className="p-8 pb-4 flex justify-between items-center border-b border-slate-50">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900">Your Order</h2>
                                    <p className="text-slate-400 font-bold text-xs">{cart.reduce((a, b) => a + b.qty, 0)} items</p>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => setIsCartOpen(false)} className="bg-slate-100 rounded-full">
                                    <X className="h-5 w-5" />
                                </Button>
                            </div>

                            <ScrollArea className="flex-1 px-8">
                                {cart.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-64 text-slate-300">
                                        <ShoppingBag className="h-12 w-12 mb-2" />
                                        <p className="font-black">Cart is empty</p>
                                    </div>
                                ) : (
                                    <div className="space-y-6 py-6">
                                        {cart.map(item => (
                                            <div key={item.id} className="flex gap-4">
                                                <div className="flex flex-col items-center gap-1 bg-slate-100 rounded-xl p-1 h-fit">
                                                    <button className="h-6 w-6 flex items-center justify-center hover:bg-white rounded-lg transition-colors" onClick={() => updateCartQty(item.id, 1)}>
                                                        <Plus className="h-3 w-3" />
                                                    </button>
                                                    <span className="font-black text-xs">{item.qty}</span>
                                                    <button className="h-6 w-6 flex items-center justify-center hover:bg-white rounded-lg transition-colors" onClick={() => item.qty > 1 ? updateCartQty(item.id, -1) : removeFromCart(item.id)}>
                                                        <Minus className="h-3 w-3" />
                                                    </button>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start">
                                                        <h4 className="font-black text-slate-800 leading-snug">{item.nameSnapshot} {item.kind === "BUNDLE" && "(Set)"}</h4>
                                                        {showPrices && <span className="font-bold text-slate-900">{(item.basePrice * item.qty).toFixed(2)}€</span>}
                                                    </div>
                                                    {item.optionLabel && (
                                                        <p className="text-xs text-slate-500 font-medium">with {item.optionLabel}</p>
                                                    )}
                                                    {item.spiceLevel > 0 && (
                                                        <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider mt-0.5">
                                                            {SPICE_LEVELS[item.spiceScale][item.spiceLevel]}
                                                        </p>
                                                    )}
                                                    {item.note && (
                                                        <p className="text-xs text-indigo-500 italic mt-1 bg-indigo-50 px-2 py-1 rounded-lg inline-block">"{item.note}"</p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </ScrollArea>

                            <div className="p-8 bg-slate-50 border-t border-slate-100 space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase tracking-widest text-slate-400 pl-1">Name for Order</Label>
                                    <Input
                                        placeholder="Enter your name..."
                                        className="bg-white border-none h-14 rounded-2xl font-bold px-6 shadow-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-slate-900 transition-all"
                                        value={guestName}
                                        onChange={(e) => setGuestName(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase tracking-widest text-slate-400 pl-1">Order Notes (Optional)</Label>
                                    <Input
                                        placeholder="Table number, allergies..."
                                        className="bg-white border-none h-12 rounded-2xl font-medium px-6 shadow-sm ring-1 ring-slate-200"
                                        value={orderNotes}
                                        onChange={(e) => setOrderNotes(e.target.value)}
                                    />
                                </div>
                                <div className="flex justify-between items-center py-2">
                                    <span className="font-bold text-slate-400">Total</span>
                                    <span className="font-black text-3xl text-slate-900">{showPrices ? `${cartTotal.toFixed(2)}€` : "—"}</span>
                                </div>
                                <Button
                                    className="w-full h-16 rounded-[1.2rem] bg-slate-900 text-white font-black text-xl shadow-xl shadow-slate-200 active:scale-[0.98] transition-all"
                                    onClick={handleSubmitOrder}
                                    disabled={isSubmitting || cart.length === 0}
                                >
                                    {isSubmitting ? "Placing Order..." : "Confirm Item Order"}
                                </Button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}
