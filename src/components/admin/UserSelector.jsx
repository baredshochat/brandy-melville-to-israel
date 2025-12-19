import React, { useState, useEffect } from 'react';
import { User } from '@/entities/User';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Users, Loader2, Filter } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

export default function UserSelector({ onSelectionChange, initialSelection = [] }) {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState(initialSelection);
  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [optInFilter, setOptInFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    let filtered = users;

    // Filter by tier
    if (tierFilter !== 'all') {
      filtered = filtered.filter(u => u.user_tier === tierFilter);
    }

    // Filter by opt-in status
    if (optInFilter === 'opted_in') {
      filtered = filtered.filter(u => u.marketing_opt_in === true);
    } else if (optInFilter === 'not_opted_in') {
      filtered = filtered.filter(u => !u.marketing_opt_in);
    }

    // Filter by search term
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.full_name?.toLowerCase().includes(term) ||
          u.email?.toLowerCase().includes(term)
      );
    }

    setFilteredUsers(filtered);
  }, [searchTerm, users, tierFilter, optInFilter]);

  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(selectedUserIds);
    }
  }, [selectedUserIds]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const allUsers = await User.list();
      setUsers(allUsers || []);
      setFilteredUsers(allUsers || []);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUser = (userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    setSelectedUserIds(filteredUsers.map((u) => u.id));
  };

  const handleDeselectAll = () => {
    setSelectedUserIds([]);
  };

  const handleSelectAllFiltered = () => {
    setSelectedUserIds(filteredUsers.map((u) => u.id));
  };

  const getTierLabel = (tier) => {
    const labels = {
      member: 'Member',
      silver: 'Silver',
      gold: 'Gold'
    };
    return labels[tier] || tier;
  };

  const getTierColor = (tier) => {
    const colors = {
      member: 'bg-stone-200 text-stone-800',
      silver: 'bg-slate-200 text-slate-800',
      gold: 'bg-amber-200 text-amber-800'
    };
    return colors[tier] || 'bg-stone-200 text-stone-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-rose-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters Row */}
      <div className="flex items-center gap-2 p-3 bg-stone-50 border rounded-md">
        <Filter className="w-4 h-4 text-stone-500" />
        <div className="flex-1 grid grid-cols-2 gap-2">
          <div>
            <Select value={tierFilter} onValueChange={setTierFilter}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="כל הסטטוסים" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הסטטוסים</SelectItem>
                <SelectItem value="member">Member בלבד</SelectItem>
                <SelectItem value="silver">Silver בלבד</SelectItem>
                <SelectItem value="gold">Gold בלבד</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Select value={optInFilter} onValueChange={setOptInFilter}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="כל המשתמשים" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל המשתמשים</SelectItem>
                <SelectItem value="opted_in">רק מנויים לדיוור</SelectItem>
                <SelectItem value="not_opted_in">לא מנויים</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <Input
            type="text"
            placeholder="חיפוש לפי שם או אימייל..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 text-sm">
        <div className="flex items-center gap-2 text-stone-600">
          <Users className="w-4 h-4" />
          <span>נבחרו {selectedUserIds.length} מתוך {filteredUsers.length} משתמשים</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleSelectAllFiltered}>
            בחר כל המסוננים ({filteredUsers.length})
          </Button>
          <Button variant="outline" size="sm" onClick={handleDeselectAll}>
            בטל בחירה
          </Button>
        </div>
      </div>

      <ScrollArea className="h-[400px] border rounded-md">
        <div className="p-4 space-y-2">
          {filteredUsers.length === 0 ? (
            <div className="text-center text-stone-500 py-8">
              לא נמצאו משתמשים
            </div>
          ) : (
            filteredUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-3 p-3 border rounded hover:bg-stone-50 cursor-pointer"
                onClick={() => handleToggleUser(user.id)}
              >
                <Checkbox
                  checked={selectedUserIds.includes(user.id)}
                  onCheckedChange={() => handleToggleUser(user.id)}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="font-medium text-stone-900">{user.full_name || 'ללא שם'}</div>
                    {user.user_tier && (
                      <Badge className={getTierColor(user.user_tier)}>
                        {getTierLabel(user.user_tier)}
                      </Badge>
                    )}
                    {user.marketing_opt_in && (
                      <Badge variant="outline" className="text-xs">
                        ✉️ מנוי
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-stone-500">{user.email}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}