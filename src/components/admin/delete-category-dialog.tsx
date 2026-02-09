"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Trash2, Package, Layers, AlertTriangle } from "lucide-react"

interface DeleteCategoryDialogProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    categoryName: string
    isSubcategory: boolean
    parentName?: string
    onConfirm: (deleteAllItems: boolean) => void
}

export function DeleteCategoryDialog({
    isOpen,
    onOpenChange,
    categoryName,
    isSubcategory,
    parentName,
    onConfirm
}: DeleteCategoryDialogProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-white rounded-[2.5rem] p-0 overflow-hidden shadow-2xl border-none">
                <DialogHeader className="p-10 pb-4">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 rounded-2xl bg-red-50 flex items-center justify-center">
                            <Trash2 className="h-5 w-5 text-red-500" />
                        </div>
                        <DialogTitle className="text-2xl font-black text-slate-900">Delete Category</DialogTitle>
                    </div>
                    <DialogDescription className="font-bold text-slate-500 text-base leading-relaxed">
                        How would you like to delete <span className="text-slate-900">"{categoryName}"</span>?
                    </DialogDescription>
                </DialogHeader>

                <div className="px-10 py-4 space-y-4">
                    {/* Option 1: Delete Category Only */}
                    <button
                        onClick={() => onConfirm(false)}
                        className="w-full p-5 rounded-3xl border-2 border-slate-100 bg-slate-50/50 hover:bg-indigo-50 hover:border-indigo-100 transition-all text-left flex gap-4 group active:scale-[0.98]"
                    >
                        <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shadow-sm group-hover:text-indigo-600 transition-colors">
                            <Layers className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                            <p className="font-black text-slate-800 text-sm">Delete Category Only</p>
                            <p className="text-[10px] font-bold text-slate-400 leading-normal mt-0.5">
                                {isSubcategory
                                    ? `Items move to "${parentName || "Main"}" category.`
                                    : 'Items move to "General" category.'} Preserves your data!
                            </p>
                        </div>
                    </button>

                    {/* Option 2: Delete Category & Items */}
                    <button
                        onClick={() => onConfirm(true)}
                        className="w-full p-5 rounded-3xl border-2 border-slate-100 bg-slate-50/50 hover:bg-red-50 hover:border-red-100 transition-all text-left flex gap-4 group active:scale-[0.98]"
                    >
                        <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shadow-sm group-hover:text-red-600 transition-colors">
                            <Package className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                            <p className="font-black text-slate-800 text-sm italic">Delete Category & Items</p>
                            <p className="text-[10px] font-bold text-slate-400 leading-normal mt-0.5">
                                Permanently removes the category and <span className="text-red-400">all its items</span>. This cannot be undone!
                            </p>
                        </div>
                    </button>
                </div>

                <DialogFooter className="bg-slate-50 p-8 mt-4 border-t rounded-b-[2.5rem] flex flex-col sm:flex-row gap-3">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="font-bold text-slate-400 hover:text-slate-600 h-12 px-6"
                    >
                        Cancel
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
