import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bookmark } from 'lucide-react';

const PRESET_VIEWS = [
  {
    id: 'today',
    name: 'להיום',
    filters: { dateRange: '1', status: 'all', site: 'all' }
  },
  {
    id: 'pending',
    name: 'ממתינות לטיפול',
    filters: { status: 'pending', site: 'all', dateRange: 'all' }
  },
  {
    id: 'low_margin',
    name: 'שוליים נמוכים',
    filters: { minMargin: '', maxMargin: '10', site: 'all', status: 'all' }
  },
  {
    id: 'uk_only',
    name: 'בריטניה בלבד',
    filters: { site: 'uk', status: 'all', dateRange: 'all' }
  }
];

export default function SavedViewsDropdown({ onLoadView }) {
  return (
    <Select onValueChange={(viewId) => {
      const view = PRESET_VIEWS.find(v => v.id === viewId);
      if (view) onLoadView(view);
    }}>
      <SelectTrigger className="w-48">
        <Bookmark className="w-4 h-4 mr-2" />
        <SelectValue placeholder="תצוגות שמורות" />
      </SelectTrigger>
      <SelectContent>
        {PRESET_VIEWS.map(view => (
          <SelectItem key={view.id} value={view.id}>
            {view.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}