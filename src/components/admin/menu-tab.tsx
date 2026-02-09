"use client"

import { useState, useRef, useEffect, Fragment } from "react"
import { MenuItem } from "@prisma/client"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, Edit2, Search, Utensils, Coffee, FileUp, Leaf, ShieldAlert, CheckCircle, Save, Download, XCircle, AlertCircle, RotateCcw, Eye, EyeOff } from "lucide-react"
import { deleteMenuItem, deleteAllMenuItems, addMenuItem, updateMenuItem, importMenuFromJson, getMenuJson, deleteCategory as deleteCategoryFromMenu } from "@/app/actions/menu"
import { getCategories, updateCategory, createCategory, deleteCategory } from "@/app/actions/category"
import { extractTextFromPDF } from "@/app/actions/pdf"
import { menuJsonSchema } from "@/lib/validations"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { CategoryManager } from "./category-manager"

interface MenuTabProps {
    eventId: string
    initialItems: MenuItem[]
    initialMenuJson: any
}

export function MenuTab({ eventId, initialItems, initialMenuJson }: MenuTabProps) {
    const [items, setItems] = useState<MenuItem[]>(initialItems)
    const [importText, setImportText] = useState("")
    const [isImporting, setIsImporting] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    const [deletePass, setDeletePass] = useState("")
    const [isBulkImportOpen, setIsBulkImportOpen] = useState(false)
    const [isManageCatsOpen, setIsManageCatsOpen] = useState(false)
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>()
    const [isAddOpen, setIsAddOpen] = useState(false)
    const [isDeletingAll, setIsDeletingAll] = useState(false)
    const [bulkMode, setBulkMode] = useState<"text" | "json">("text")
    const [validationErrors, setValidationErrors] = useState<any[]>([])
    const fileInputRef = useRef<HTMLInputElement>(null)
    const jsonInputRef = useRef<HTMLInputElement>(null)
    const router = useRouter()

    useEffect(() => {
        setItems(initialItems)
    }, [initialItems])

    const [allCategories, setAllCategories] = useState<any[]>([])

    const fetchCats = async () => {
        const cats = await getCategories(eventId)
        setAllCategories(cats)
    }

    useEffect(() => {
        fetchCats()
    }, [])

    useEffect(() => {
        if (isManageCatsOpen || isAddOpen) fetchCats()
    }, [isManageCatsOpen, isAddOpen])

    // Manual item form state
    const [editingItem, setEditingItem] = useState<Partial<MenuItem> | null>(null)
    const [formData, setFormData] = useState({
        code: "",
        name: "",
        category: "General",
        categoryId: "",
        subCategory: "",
        price: "",
        description: "",
        isVeg: false,
        isVegan: false,
        isDrink: false
    })

    const handleAddOrUpdate = async () => {
        try {
            if (editingItem?.id) {
                await updateMenuItem(editingItem.id, formData)
                toast.success("Item updated")
            } else {
                await addMenuItem(eventId, formData)
                toast.success("Item added")
            }
            setIsAddOpen(false)
            setEditingItem(null)
            router.refresh()
        } catch (error) {
            toast.error("Failed to save item")
        }
    }

    const startEdit = async (item: any) => {
        setEditingItem(item)

        // Fetch categories first if they aren't loaded yet
        let currentCats = allCategories
        if (currentCats.length === 0) {
            currentCats = await getCategories(eventId)
            setAllCategories(currentCats)
        }

        const cat = currentCats.find(c => c.id === item.categoryId)
        let categoryId = item.categoryId
        let subCategory = item.subCategory

        if (cat && cat.parentId) {
            // This is a subcategory, so Category selector should show parent, 
            // and Subcategory selector should show this category's name.
            categoryId = cat.parentId
            subCategory = cat.name
        }

        setFormData({
            code: item.code,
            name: item.name,
            category: item.category,
            categoryId: categoryId || "",
            subCategory: subCategory || "",
            price: item.price?.toString() || "",
            description: item.description || "",
            isVeg: item.isVeg,
            isVegan: item.isVegan,
            isDrink: item.isDrink
        })
        setIsAddOpen(true)
    }

    const handleDeleteAll = async () => {
        if (deletePass !== "DELETE") {
            toast.error("Invalid confirmation text")
            return
        }
        setIsDeletingAll(true)
        try {
            await deleteAllMenuItems(eventId)
            setItems([])
            toast.success("All items, categories and bundles deleted")
            setDeletePass("")
        } catch (error) {
            toast.error("Failed to delete everything")
        } finally {
            setIsDeletingAll(false)
        }
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsImporting(true)
        const formData = new FormData()
        formData.append("file", file)

        try {
            const text = await extractTextFromPDF(formData)
            setImportText(text)
            setBulkMode("text")
            toast.success("Text extracted from PDF! Review and click Import.")
        } catch (error) {
            toast.error("Failed to extract text from PDF")
        } finally {
            setIsImporting(false)
        }
    }

    const handleJsonUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (event) => {
            if (event.target?.result) {
                setImportText(event.target.result as string)
                setBulkMode("json")
                toast.success("JSON loaded from file!")
            }
        }
        reader.readAsText(file)
    }

    const validateJson = () => {
        setValidationErrors([])
        try {
            const parsed = JSON.parse(importText)
            const result = menuJsonSchema.safeParse(parsed)
            if (!result.success) {
                setValidationErrors(result.error.issues)
                toast.error("Schema validation failed")
                return false
            }
            toast.success("JSON is valid!")
            return parsed
        } catch (e: any) {
            setValidationErrors([{ path: ["json"], message: e.message }])
            toast.error("JSON parse failed")
            return false
        }
    }

    const handleCopyJson = () => {
        navigator.clipboard.writeText(importText)
        toast.success("JSON copied to clipboard")
    }

    const handleImport = async () => {
        if (!importText.trim()) return
        setIsImporting(true)
        setValidationErrors([])

        try {
            if (bulkMode === "json") {
                const parsed = JSON.parse(importText)
                const res = await importMenuFromJson(eventId, parsed)

                if (res.errorType === "SCHEMA") {
                    setValidationErrors(res.issues)
                    toast.error("Validation failed during import")
                } else if (res.errorType) {
                    toast.error(res.message || "Import failed")
                } else {
                    toast.success("Menu imported and normalized successfully!")
                    setIsBulkImportOpen(false)
                    router.refresh()
                }
            } else {
                // Convert text to JSON format
                const items = importText.split('\n')
                    .map(line => line.trim())
                    .filter(line => line.length > 0)
                    .map(line => {
                        const parts = line.split('\t');
                        if (parts.length < 2) return null;
                        return {
                            code: parts[0].trim(),
                            name: parts[1].trim(),
                            price: parts[2] ? parseFloat(parts[2].replace(/[^\d.]/g, '')) : 0,
                            category: parts[3] || "General"
                        };
                    })
                    .filter(Boolean);

                if (items.length === 0) {
                    toast.error("No valid items found in text (Expected: Code [Tab] Name [Tab] Price)");
                    return;
                }

                // Group by category to create categories list
                const categoryNames = Array.from(new Set(items.map(i => i!.category)));
                const categories = categoryNames.map((name, i) => ({
                    id: name.toLowerCase().replace(/\s+/g, '-'),
                    name,
                    sort: i,
                    type: "FOOD"
                }));

                const formattedJson = {
                    restaurant: "Imported Menu",
                    categories,
                    items: items.map(item => ({
                        code: item!.code,
                        name: item!.name,
                        price: item!.price,
                        categoryId: item!.category.toLowerCase().replace(/\s+/g, '-'),
                        description: "",
                        diet: { veg: false, vegan: false },
                        options: [],
                        images: []
                    })),
                    bundles: []
                };

                const res = await importMenuFromJson(eventId, formattedJson);
                if (res.errorType) {
                    toast.error(res.message || "Import failed");
                } else {
                    toast.success(`Successfully imported ${items.length} items via JSON conversion`);
                    setIsBulkImportOpen(false);
                    router.refresh();
                }
            }
        } catch (error: any) {
            toast.error(error.message || "Import failed")
        } finally {
            setIsImporting(false)
        }
    }

    const loadSavedJson = async () => {
        setIsImporting(true)
        try {
            const json = await getMenuJson(eventId)
            if (json) {
                setImportText(JSON.stringify(json, null, 2))
                setBulkMode("json")
                toast.success("Loaded saved JSON")
            } else {
                toast.info("No saved JSON found")
            }
        } catch (error) {
            toast.error("Failed to load saved JSON")
        } finally {
            setIsImporting(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (confirm("Delete this item?")) {
            await deleteMenuItem(id)
            setItems(items.filter(i => i.id !== id))
            toast.success("Item deleted")
        }
    }

    const handleDeleteCategory = async (categoryName: string) => {
        if (confirm(`Are you sure you want to delete the whole category "${categoryName}" and all its dishes?`)) {
            try {
                await deleteCategoryFromMenu(eventId, categoryName)
                toast.success(`Category "${categoryName}" deleted`)
                router.refresh()
            } catch (error) {
                toast.error("Failed to delete category")
            }
        }
    }

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Group items by category and then by subcategory
    const groupedItems = filteredItems.reduce((acc: Record<string, Record<string, MenuItem[]>>, item: any) => {
        const cat = item.category || "All"
        const sub = item.subCategory || "None"
        if (!acc[cat]) acc[cat] = {}
        if (!acc[cat][sub]) acc[cat][sub] = []
        acc[cat][sub].push(item)
        return acc
    }, {})

    const categories = Object.keys(groupedItems).sort((a, b) => {
        if (a === "All") return 1
        if (b === "All") return -1
        return a.localeCompare(b)
    })

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 font-sans">
            <div className="flex flex-col md:flex-row justify-between gap-4 items-center bg-white p-6 rounded-3xl shadow-sm ring-1 ring-slate-200">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                    <Input
                        placeholder="Search by name, code or category..."
                        className="pl-12 h-12 bg-slate-50 border-none rounded-2xl focus:bg-white transition-all shadow-inner font-bold"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50 font-bold gap-2 h-12 px-6 rounded-2xl active:scale-95 transition-all">
                                <Trash2 className="h-4 w-4" />
                                Wipe Data
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md bg-white border-none shadow-2xl rounded-[2.5rem]">
                            <DialogHeader className="p-10 pb-4">
                                <DialogTitle className="text-2xl font-black flex items-center gap-2 text-red-600">
                                    <ShieldAlert className="h-6 w-6" />
                                    Danger Zone
                                </DialogTitle>
                                <DialogDescription className="font-bold text-slate-500 pt-2">
                                    This will permanently remove ALL categories, items, options, and bundles for this event.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="px-10 py-6 space-y-4">
                                <div className="space-y-2">
                                    <Label className="font-black text-[10px] uppercase tracking-[0.1em] text-slate-400 px-1">
                                        Type <span className="text-red-600">DELETE</span> to confirm
                                    </Label>
                                    <Input
                                        value={deletePass}
                                        onChange={(e) => setDeletePass(e.target.value)}
                                        placeholder="DELETE"
                                        className="h-14 bg-slate-100 border-none rounded-2xl font-black text-red-600 focus:bg-white transition-all shadow-inner px-5"
                                    />
                                </div>
                            </div>
                            <DialogFooter className="bg-slate-50 p-10 flex flex-col sm:flex-row gap-4 border-t rounded-b-[2.5rem]">
                                <Button variant="ghost" className="font-bold text-slate-400 h-14" onClick={() => setDeletePass("")}>Cancel</Button>
                                <Button
                                    onClick={handleDeleteAll}
                                    disabled={isDeletingAll || deletePass !== "DELETE"}
                                    className="bg-red-600 hover:bg-red-700 text-white font-black flex-1 rounded-2xl h-14 shadow-lg shadow-red-100"
                                >
                                    {isDeletingAll ? "Wiping..." : "Confirm Wipe Strategy"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            onClick={() => {
                                setSelectedCategoryId(undefined)
                                setIsManageCatsOpen(true)
                            }}
                            className="h-11 px-6 rounded-2xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 gap-2 transition-all active:scale-95"
                        >
                            <Utensils className="h-4 w-4" />
                            Manage Categories
                        </Button>
                        <div className="h-8 w-[1px] bg-slate-200 mx-1" />

                        <Dialog open={isBulkImportOpen} onOpenChange={setIsBulkImportOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="h-12 border-slate-200 font-bold gap-2 rounded-2xl px-6 hover:bg-slate-50 active:scale-95 transition-all shadow-sm">
                                    <FileUp className="h-4 w-4" />
                                    Bulk Import
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-4xl bg-white border-none shadow-2xl overflow-hidden flex flex-col h-[90vh] rounded-[2.5rem] p-0">
                                <DialogHeader className="p-10 pb-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <DialogTitle className="text-3xl font-black text-slate-900 leading-tight">Advanced Menu Editor</DialogTitle>
                                            <DialogDescription className="font-bold text-slate-400 text-lg pt-2">
                                                Import normalized menu structure.
                                            </DialogDescription>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <div className="bg-slate-50 p-1 rounded-2xl flex gap-1 shadow-inner">
                                                <Button
                                                    variant={bulkMode === "text" ? "default" : "ghost"}
                                                    size="sm"
                                                    onClick={() => setBulkMode("text")}
                                                    className={cn("rounded-xl font-black text-[10px] h-9 px-4", bulkMode === "text" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400")}
                                                >
                                                    TEXT MODE
                                                </Button>
                                                <Button
                                                    variant={bulkMode === "json" ? "default" : "ghost"}
                                                    size="sm"
                                                    onClick={() => setBulkMode("json")}
                                                    className={cn("rounded-xl font-black text-[10px] h-9 px-4", bulkMode === "json" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400")}
                                                >
                                                    JSON MODE
                                                </Button>
                                            </div>
                                            {importText && (
                                                <div className="flex gap-2 justify-end">
                                                    <Button onClick={handleCopyJson} variant="outline" size="sm" className="rounded-xl font-black text-[10px] h-9 gap-2">
                                                        <Save className="h-3 w-3" /> COPY
                                                    </Button>
                                                    <Button onClick={() => setImportText("")} variant="outline" size="sm" className="rounded-xl font-black text-[10px] h-9 gap-2 border-red-100 text-red-500 hover:bg-red-50">
                                                        <Trash2 className="h-3 w-3" /> CLEAR
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </DialogHeader>

                                <div className="px-10 flex-1 overflow-y-auto space-y-8 py-6 no-scrollbar">
                                    {bulkMode === "text" && (
                                        <div className="flex flex-col sm:flex-row justify-between items-center bg-indigo-50/50 p-8 rounded-3xl border-2 border-dashed border-indigo-100 gap-6">
                                            <div className="flex items-center gap-6">
                                                <div className="bg-white p-4 rounded-2xl shadow-sm ring-1 ring-indigo-50">
                                                    <FileUp className="h-8 w-8 text-indigo-600" />
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-900 text-xl">Upload PDF Menu</p>
                                                    <p className="text-[10px] text-indigo-500 uppercase font-black tracking-widest">Auto-extract items from PDF</p>
                                                </div>
                                            </div>
                                            <Button
                                                className="bg-white hover:bg-white/80 text-indigo-600 font-black h-14 border-indigo-100 rounded-2xl px-8 ring-1 ring-indigo-100 shadow-sm"
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={isImporting}
                                            >
                                                {isImporting ? "Processing..." : "Select PDF File"}
                                            </Button>
                                            <input
                                                type="file" ref={fileInputRef} className="hidden" accept=".pdf"
                                                onChange={handleFileUpload}
                                            />
                                        </div>
                                    )}

                                    <div className="space-y-4 flex-1 flex flex-col min-h-0">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">
                                            {bulkMode === "text" ? "Paste Menu Text" : "Paste Menu JSON Source"}
                                        </Label>
                                        <Textarea
                                            placeholder={bulkMode === "text" ? "Example:&#10;101. Butter Chicken 14.50&#10;102. Naan 2,50" : "Paste full menu JSON here..."}
                                            className="flex-1 min-h-[400px] font-mono text-[11px] border-none bg-slate-100 rounded-[2rem] p-8 focus:bg-white transition-all shadow-inner outline-none resize-none no-scrollbar"
                                            value={importText}
                                            onChange={(e) => setImportText(e.target.value)}
                                        />
                                    </div>

                                    {validationErrors.length > 0 && (
                                        <div className="bg-red-50 border border-red-100 rounded-2xl p-6 space-y-3">
                                            <h4 className="flex items-center gap-2 text-red-600 font-black text-xs uppercase tracking-widest">
                                                <AlertCircle className="h-4 w-4" />
                                                Validation Errors
                                            </h4>
                                            <div className="max-h-40 overflow-y-auto space-y-2 no-scrollbar">
                                                {validationErrors.map((err, idx) => (
                                                    <div key={idx} className="text-[10px] font-bold text-red-500 flex gap-2">
                                                        <span className="bg-red-100 px-1.5 py-0.5 rounded text-red-700 font-mono">
                                                            {err.path.join(".")}
                                                        </span>
                                                        {err.message}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <DialogFooter className="bg-slate-50 p-10 flex flex-col sm:flex-row gap-4 border-t rounded-b-[2.5rem]">
                                    <Button
                                        variant="ghost"
                                        className="font-black text-slate-400 h-14 px-8 hover:text-slate-600"
                                        onClick={() => setIsBulkImportOpen(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleImport}
                                        disabled={isImporting || !importText}
                                        className="bg-indigo-600 hover:bg-indigo-700 font-black px-12 rounded-2xl h-14 shadow-2xl shadow-indigo-100 transition-all active:scale-95 flex-1"
                                    >
                                        {isImporting ? "Importing..." : bulkMode === "json" ? "Validate & Import (Wipe Strategy)" : "Import Text"}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        <Button
                            onClick={() => {
                                setEditingItem(null)
                                setFormData({
                                    code: "", name: "", category: "General", categoryId: "", subCategory: "", price: "", description: "",
                                    isVeg: false, isVegan: false, isDrink: false
                                })
                                setIsAddOpen(true)
                            }}
                            className="h-12 bg-indigo-600 hover:bg-indigo-700 font-black gap-2 px-6 shadow-xl shadow-indigo-100 rounded-2xl transition-all active:scale-95"
                        >
                            <Plus className="h-5 w-5" />
                            Add Item
                        </Button>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-sm ring-1 ring-slate-200 overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50/50">
                        <TableRow className="border-slate-100 hover:bg-transparent">
                            <TableHead className="w-[80px] font-black text-slate-400 uppercase tracking-widest text-[10px] h-16 pl-8">Code</TableHead>
                            <TableHead className="w-[200px] font-black text-slate-400 uppercase tracking-widest text-[10px] h-16">Name</TableHead>
                            <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[10px] h-16">Item Details</TableHead>
                            <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[10px] h-16">Category</TableHead>
                            <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[10px] h-16 text-right">Price</TableHead>
                            <TableHead className="w-[100px] font-black text-slate-400 uppercase tracking-widest text-[10px] h-16 text-center pr-8">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {categories.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-80 text-center">
                                    <div className="flex flex-col items-center justify-center space-y-4 opacity-40">
                                        <div className="bg-slate-100 p-8 rounded-full">
                                            <Utensils className="h-12 w-12 text-slate-300" />
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-900 text-xl">No menu items yet</p>
                                            <p className="text-[10px] font-black uppercase text-indigo-500 tracking-widest mt-1">Import a menu or add items manually</p>
                                        </div>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            categories.map((category) => (
                                <Fragment key={category}>
                                    <TableRow className="bg-slate-50/30 hover:bg-slate-50/50 border-y border-slate-100/80">
                                        <TableCell colSpan={6} className="py-2.5 px-8">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-2 w-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                                                    <span className="font-black text-slate-800 text-xs uppercase tracking-widest">
                                                        {category}
                                                    </span>
                                                    <Badge variant="outline" className="text-[9px] font-black text-slate-400 border-slate-200 bg-white">
                                                        {Object.values(groupedItems[category]).flat().length} ITEMS
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={async () => {
                                                            const cat = allCategories.find(c => c.name === category)
                                                            if (cat) {
                                                                await updateCategory(cat.id, { isHidden: !cat.isHidden })
                                                                fetchCats()
                                                                toast.success(`Category "${category}" ${!cat.isHidden ? "hidden" : "visible"}`)
                                                            }
                                                        }}
                                                        className={cn("h-8 w-8 p-0 rounded-xl transition-all active:scale-95",
                                                            allCategories.find(c => c.name === category)?.isHidden ? "text-amber-500 hover:bg-amber-50" : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                                                        )}
                                                    >
                                                        {allCategories.find(c => c.name === category)?.isHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            const cat = allCategories.find(c => c.name === category)
                                                            setSelectedCategoryId(cat?.id)
                                                            setIsManageCatsOpen(true)
                                                        }}
                                                        className="h-8 pr-2 pl-3 text-[10px] font-black text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl gap-2 transition-all active:scale-95"
                                                    >
                                                        <Edit2 className="h-3 w-3" />
                                                        EDIT
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDeleteCategory(category)}
                                                        className="h-8 pr-2 pl-3 text-[10px] font-black text-red-400 hover:text-red-500 hover:bg-red-50 rounded-xl gap-2 transition-all active:scale-95"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                        DELETE
                                                    </Button>
                                                </div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                    {Object.keys(groupedItems[category]).sort((a, b) => {
                                        if (a === "None") return 1
                                        if (b === "None") return -1
                                        return a.localeCompare(b)
                                    }).map((subCategory) => (
                                        <Fragment key={subCategory}>
                                            {subCategory !== "None" && (
                                                <TableRow className="bg-slate-50/50 border-slate-100/50">
                                                    <TableCell colSpan={6} className="py-3 px-12 group/sub">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                                                                <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">
                                                                    {subCategory}
                                                                </span>
                                                                <Badge variant="outline" className="text-[9px] font-black text-slate-300 border-slate-100 bg-white/50 py-0 h-4.5 px-2 rounded-lg">
                                                                    {groupedItems[category][subCategory].length} ITEMS
                                                                </Badge>
                                                            </div>
                                                            <div className="flex items-center gap-2 opacity-30 group-hover/sub:opacity-100 transition-opacity pr-4">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={async () => {
                                                                        const cat = allCategories.find(c =>
                                                                            c.name.toLowerCase() === subCategory.toLowerCase() && c.parentId
                                                                        )
                                                                        if (cat) {
                                                                            await updateCategory(cat.id, { isHidden: !cat.isHidden })
                                                                            fetchCats()
                                                                            toast.success(`Subcategory "${subCategory}" ${!cat.isHidden ? "hidden" : "visible"}`)
                                                                        }
                                                                    }}
                                                                    className={cn("h-8 w-8 p-0 rounded-xl transition-all active:scale-95",
                                                                        allCategories.find(c => c.name.toLowerCase() === subCategory.toLowerCase() && c.parentId)?.isHidden ? "text-amber-500 hover:bg-amber-50" : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                                                                    )}
                                                                >
                                                                    {allCategories.find(c => c.name.toLowerCase() === subCategory.toLowerCase() && c.parentId)?.isHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        const cat = allCategories.find(c =>
                                                                            c.name.toLowerCase() === subCategory.toLowerCase() && c.parentId
                                                                        )
                                                                        setSelectedCategoryId(cat?.id)
                                                                        setIsManageCatsOpen(true)
                                                                    }}
                                                                    className="h-8 pr-2 pl-3 text-[10px] font-black text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl gap-2 transition-all active:scale-95"
                                                                >
                                                                    <Edit2 className="h-3 w-3" />
                                                                    EDIT
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleDeleteCategory(subCategory)}
                                                                    className="h-8 pr-2 pl-3 text-[10px] font-black text-red-400 hover:text-red-500 hover:bg-red-50 rounded-xl gap-2 transition-all active:scale-95"
                                                                >
                                                                    <Trash2 className="h-3 w-3" />
                                                                    DELETE
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                            {groupedItems[category][subCategory].map((item) => (
                                                <TableRow key={item.id} className="group border-slate-50 hover:bg-slate-50/80 transition-all duration-200">
                                                    <TableCell className="font-black text-slate-900 pl-8 align-top py-4">
                                                        <span className="bg-slate-50 px-2 py-1 rounded-lg text-[11px] ring-1 ring-slate-200 shadow-sm whitespace-nowrap">{item.code}</span>
                                                    </TableCell>
                                                    <TableCell className="align-top py-4">
                                                        <div className="flex flex-col gap-1">
                                                            <span className="font-black text-slate-800 text-sm leading-snug whitespace-normal">{item.name}</span>
                                                            <div className="flex gap-1 shrink-0 mt-1">
                                                                {item.isDrink && <Coffee className="h-3 w-3 text-amber-500" strokeWidth={3} />}
                                                                {item.isVeg && !item.isVegan && <Leaf className="h-3 w-3 text-emerald-500" strokeWidth={3} />}
                                                                {item.isVegan && (
                                                                    <div className="flex items-center bg-emerald-50 px-1.5 py-0.5 rounded-md ring-1 ring-emerald-100">
                                                                        <Leaf className="h-2.5 w-2.5 text-emerald-600 mr-1" strokeWidth={3} />
                                                                        <span className="text-[7px] font-black text-emerald-600">VEGAN</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="align-top py-4 max-w-xs">
                                                        {item.description ? (
                                                            <span className="text-[11px] text-slate-500 font-medium whitespace-normal leading-relaxed block">{item.description}</span>
                                                        ) : (
                                                            <span className="text-[10px] text-slate-300 italic">No details</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="align-top py-4">
                                                        <Badge className="bg-slate-50 text-slate-400 font-bold text-[9px] uppercase tracking-widest px-2 h-6 rounded-lg border-none whitespace-nowrap">
                                                            {(item as any).category}{(item as any).subCategory ? ` / ${(item as any).subCategory}` : ""}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right font-black text-slate-900 text-sm align-top py-4">
                                                        {item.price ? `${item.price.toFixed(2)}€` : "—"}
                                                    </TableCell>
                                                    <TableCell className="align-top py-4 text-center">
                                                        <div className="flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                                            <Button
                                                                variant="outline" size="icon"
                                                                className={cn("h-8 w-8 border-slate-200 bg-white rounded-lg transition-all shadow-sm active:scale-95",
                                                                    item.isHidden ? "text-amber-500 hover:bg-amber-50 ring-2 ring-amber-100 border-amber-200" : "text-slate-400 hover:text-indigo-600 hover:ring-2 hover:ring-indigo-100"
                                                                )}
                                                                onClick={async () => {
                                                                    await updateMenuItem(item.id, { isHidden: !item.isHidden })
                                                                    router.refresh()
                                                                    toast.success(`Dish "${item.name}" ${!item.isHidden ? "hidden" : "visible"}`)
                                                                }}
                                                            >
                                                                {item.isHidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                                            </Button>
                                                            <Button
                                                                variant="outline" size="icon" className="h-8 w-8 border-slate-200 bg-white rounded-lg hover:text-indigo-600 hover:ring-2 hover:ring-indigo-100 active:scale-95 transition-all shadow-sm"
                                                                onClick={() => startEdit(item)}
                                                            >
                                                                <Edit2 className="h-3.5 w-3.5 text-slate-400 hover:text-indigo-600" />
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="icon"
                                                                className="h-8 w-8 border-slate-200 bg-white rounded-lg hover:text-red-500 hover:ring-2 hover:ring-red-100 active:scale-95 transition-all shadow-sm"
                                                                onClick={() => handleDelete(item.id)}
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5 text-slate-400 hover:text-red-500" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </Fragment>
                                    ))}
                                </Fragment>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent className="max-w-2xl bg-white border-none shadow-3xl rounded-[2.5rem] p-0 overflow-hidden">
                    <DialogHeader className="p-10 pb-4">
                        <DialogTitle className="text-3xl font-black text-slate-900">
                            {editingItem ? "Edit Menu Item" : "Add Menu Item"}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="px-10 py-6 space-y-6 overflow-y-auto max-h-[65vh] no-scrollbar">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Item Code</Label>
                                <Input
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                    placeholder="Ex: 101" className="h-14 bg-slate-100 border-none rounded-2xl font-black text-slate-800 focus:bg-white transition-all shadow-inner px-5"
                                />
                            </div>
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Item Name</Label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Butter Chicken" className="h-14 bg-slate-100 border-none rounded-2xl font-black text-slate-800 focus:bg-white transition-all shadow-inner px-5"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Category</Label>
                                <Select
                                    value={formData.categoryId || "none"}
                                    onValueChange={(val) => {
                                        const cat = allCategories.find(c => c.id === val)
                                        setFormData({
                                            ...formData,
                                            categoryId: val === "none" ? "" : val,
                                            category: cat?.name || "General",
                                            subCategory: "" // Reset subcategory when main category changes
                                        })
                                    }}
                                >
                                    <SelectTrigger className="h-14 bg-slate-100 border-none rounded-2xl font-black text-slate-800 focus:bg-white transition-all shadow-inner px-5 shrink-0">
                                        <SelectValue placeholder="Select Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Select Category</SelectItem>
                                        {allCategories.filter(c => !c.parentId).map(cat => (
                                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Subcategory</Label>
                                <Select
                                    value={allCategories.find(c => c.name === formData.subCategory && c.parentId === formData.categoryId)?.id || "none"}
                                    onValueChange={(val) => {
                                        if (val === "none") {
                                            setFormData({
                                                ...formData,
                                                subCategory: ""
                                                // Note: categoryId stays as the main category ID
                                            })
                                        } else {
                                            const sub = allCategories.find(c => c.id === val)
                                            setFormData({
                                                ...formData,
                                                categoryId: val,
                                                subCategory: sub?.name || ""
                                            })
                                        }
                                    }}
                                    disabled={!formData.categoryId}
                                >
                                    <SelectTrigger className="h-14 bg-slate-100 border-none rounded-2xl font-black text-slate-800 focus:bg-white transition-all shadow-inner px-5 shrink-0">
                                        <SelectValue placeholder="Select Subcategory" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">None</SelectItem>
                                        {allCategories.filter(c => c.parentId === formData.categoryId || (allCategories.find(pc => pc.id === formData.categoryId)?.parentId === null && c.parentId === formData.categoryId)).map(cat => (
                                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Description (Optional)</Label>
                            <Textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Tender chicken in creamy tomato sauce..." className="min-h-[120px] bg-slate-100 border-none rounded-2xl font-bold text-slate-700 focus:bg-white transition-all shadow-inner px-5 py-4 resize-none no-scrollbar"
                            />
                        </div>
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Price (€)</Label>
                            <Input
                                type="number" step="0.01"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                placeholder="14.50" className="h-14 bg-slate-100 border-none rounded-2xl font-black text-slate-800 focus:bg-white transition-all shadow-inner px-5"
                            />
                        </div>
                        <div className="flex bg-slate-50 p-6 rounded-3xl border border-slate-100 justify-between gap-4">
                            <div className="flex items-center space-x-3">
                                <Checkbox
                                    id="isVeg" checked={formData.isVeg}
                                    onCheckedChange={(c) => setFormData({ ...formData, isVeg: !!c })}
                                    className="h-6 w-6 rounded-lg border-slate-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                                />
                                <Label htmlFor="isVeg" className="font-black text-slate-700 text-sm">Vegetarian</Label>
                            </div>
                            <div className="flex items-center space-x-3">
                                <Checkbox
                                    id="isVegan" checked={formData.isVegan}
                                    onCheckedChange={(c) => setFormData({ ...formData, isVegan: !!c })}
                                    className="h-6 w-6 rounded-lg border-slate-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                                />
                                <Label htmlFor="isVegan" className="font-black text-slate-700 text-sm">Vegan</Label>
                            </div>
                            <div className="flex items-center space-x-3">
                                <Checkbox
                                    id="isDrink" checked={formData.isDrink}
                                    onCheckedChange={(c) => setFormData({ ...formData, isDrink: !!c })}
                                    className="h-6 w-6 rounded-lg border-slate-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                                />
                                <Label htmlFor="isDrink" className="font-black text-slate-700 text-sm">Drink</Label>
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="bg-slate-50 p-10 flex flex-col sm:flex-row gap-4 border-t rounded-b-[2.5rem]">
                        <Button variant="ghost" onClick={() => setIsAddOpen(false)} className="font-black text-slate-400 h-14 px-8">Cancel</Button>
                        <Button
                            onClick={handleAddOrUpdate}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-black flex-1 rounded-2xl h-14 shadow-2xl shadow-indigo-100 text-lg transition-all active:scale-95"
                        >
                            {editingItem ? "Update Item" : "Save Menu Item"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <CategoryManager
                eventId={eventId}
                categories={allCategories}
                isOpen={isManageCatsOpen}
                onOpenChange={setIsManageCatsOpen}
                initialCategoryId={selectedCategoryId}
            />
        </div >
    );
}
