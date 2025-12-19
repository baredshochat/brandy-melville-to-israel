import React, { useState, useEffect } from 'react';
import { User } from '@/entities/User';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Users, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function UserSelector({ onSelectionChange, initialSelection = [] }) {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState(initialSelection);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredUsers(users);
    } else {
      const term = searchTerm.toLowerCase();
      setFilteredUsers(
        users.filter(
          (u) =>
            u.full_name?.toLowerCase().includes(term) ||
            u.email?.toLowerCase().includes(term)
        )
      );
    }
  }, [searchTerm, users]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-rose-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
          <span>נבחרו {selectedUserIds.length} משתמשים</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleSelectAll}>
            בחר הכל
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
                  <div className="font-medium text-stone-900">{user.full_name || 'ללא שם'}</div>
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