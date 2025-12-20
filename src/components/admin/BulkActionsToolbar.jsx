import React from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Eye, EyeOff, Check, X } from 'lucide-react';
import { motion } from 'framer-motion';

export default function BulkActionsToolbar({ selectedCount, onDelete, onHide, onUnhide, onMakeAvailable, onMakeUnavailable, onClear }) {
  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -20, opacity: 0 }}
      className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-stone-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-4"
    >
      <span className="font-medium">{selectedCount} פריטים נבחרו</span>
      <div className="w-px h-6 bg-stone-600" />
      
      <Button
        size="sm"
        variant="ghost"
        onClick={onMakeAvailable}
        className="text-white hover:bg-stone-700 h-8"
      >
        <Check className="w-4 h-4 ml-1" />
        סמן כזמין
      </Button>
      
      <Button
        size="sm"
        variant="ghost"
        onClick={onMakeUnavailable}
        className="text-white hover:bg-stone-700 h-8"
      >
        <X className="w-4 h-4 ml-1" />
        סמן כלא זמין
      </Button>
      
      <Button
        size="sm"
        variant="ghost"
        onClick={onHide}
        className="text-white hover:bg-stone-700 h-8"
      >
        <EyeOff className="w-4 h-4 ml-1" />
        הסתר
      </Button>
      
      <Button
        size="sm"
        variant="ghost"
        onClick={onUnhide}
        className="text-white hover:bg-stone-700 h-8"
      >
        <Eye className="w-4 h-4 ml-1" />
        הצג
      </Button>
      
      <Button
        size="sm"
        variant="ghost"
        onClick={onDelete}
        className="text-red-400 hover:bg-red-900/30 h-8"
      >
        <Trash2 className="w-4 h-4 ml-1" />
        מחק
      </Button>
      
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