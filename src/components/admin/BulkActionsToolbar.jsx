import React from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Eye, EyeOff, Check, X, Tag, Box, MoreVertical } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function BulkActionsToolbar({ selectedCount, onDelete, onHide, onUnhide, onMakeAvailable, onMakeUnavailable, onClear, onPriceUpdate, onQuantityUpdate }) {
  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -20, opacity: 0 }}
      className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-stone-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-4"
    >
      <span className="font-medium">{selectedCount} פריטים נבחרו</span>
      <div className="w-px h-6 bg-stone-600" />
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            className="text-white hover:bg-stone-700 h-8"
          >
            <MoreVertical className="w-4 h-4 ml-1" />
            פעולות
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={onMakeAvailable}>
            <Check className="w-4 h-4 ml-2" />
            סמן כזמין למכירה
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onMakeUnavailable}>
            <X className="w-4 h-4 ml-2" />
            סמן כלא זמין למכירה
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onHide}>
            <EyeOff className="w-4 h-4 ml-2" />
            הסתר מלקוחות
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onUnhide}>
            <Eye className="w-4 h-4 ml-2" />
            הצג ללקוחות
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onPriceUpdate}>
            <Tag className="w-4 h-4 ml-2" />
            עדכן מחיר
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onQuantityUpdate}>
            <Box className="w-4 h-4 ml-2" />
            עדכן כמות במלאי
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onDelete} className="text-red-600 focus:text-red-600">
            <Trash2 className="w-4 h-4 ml-2" />
            מחק פריטים
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      <div className="w-px h-6 bg-stone-600" />
      
      <Button
        size="sm"
        variant="ghost"
        onClick={onClear}
        className="text-stone-400 hover:text-white hover:bg-stone-700 h-8"
      >
        ביטול
      </Button>
    </motion.div>
  );
}