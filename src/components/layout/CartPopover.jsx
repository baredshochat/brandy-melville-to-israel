import React, { useState, useEffect, useCallback } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Loader2, RotateCcw, Trash2, Edit } from "lucide-react";
import { CartItem } from "@/entities/CartItem";
import { User } from "@/entities/User";
import { createPageUrl } from "@/utils";
import ColorDisplay from '../order/ColorDisplay';

export default function CartPopover() {
  const [cartItems, setCartItems] = useState({});
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [deletingIds, setDeletingIds] = useState([]);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    User.me()
      .then(setUser)
      .catch(() => {
        setUser(null);
        setLoading(false);
      });
  }, []);

  const loadCartItems = useCallback(async () => {
    if (!user) {
      setCartItems({});
      setLoading(false);
      setHasError(false);
      return;
    }
    
    setLoading(true);
    setHasError(false);
    
    try {
      const items = await CartItem.filter({ created_by: user.email });
      const groupedItems = items.reduce((groups, item) => {
        const site = item.site || 'unknown';
        if (!groups[site]) groups[site] = [];
        groups[site].push(item);
        return groups;
      }, {});
      
      Object.keys(groupedItems).forEach(site => {
        groupedItems[site].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      });
      
      setCartItems(groupedItems);
    } catch (error) {
      console.error("Failed to load cart items:", error);
      setCartItems({});
      setHasError(true);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadCartItems();
    const handleCartRefresh = () => loadCartItems();
    window.addEventListener('refreshCart', handleCartRefresh);
    return () => window.removeEventListener('refreshCart', handleCartRefresh);
  }, [loadCartItems]);

  const getSiteName = (siteCode) => {
    const names = { 'us': 'ארה״ב', 'eu': 'אירופה', 'uk': 'בריטניה', 'local': 'מלאי מקומי' };
    return names[siteCode] || siteCode;
  };

  const getSiteFlag = (siteCode) => {
    const flags = {
      'us': 'https://flagcdn.com/w160/us.png',
      'eu': 'https://flagcdn.com/w160/eu.png',
      'uk': 'https://flagcdn.com/w160/gb.png',
      'local': 'https://flagcdn.com/w160/il.png'
    };
    return flags[siteCode];
  };

  const getSiteOrder = (siteCode) => {
    const order = { 'local': 0, 'eu': 1, 'uk': 2, 'us': 3 };
    return order[siteCode] || 999;
  };

  const getTotalItems = () => {
    return Object.values(cartItems).flat().reduce((sum, item) => sum + (item.quantity || 1), 0);
  };

  const handleGoToSiteCart = (site) => {
    window.location.href = `${createPageUrl("Home")}?site=${site}&step=4`;
  };

  const handleEditItem = (item) => {
    window.location.href = `${createPageUrl("Home")}?site=${item.site}&step=3&editItemId=${item.id}`;
  };
  
  const isNotFoundError = (err) => {
    const msg = String(err?.message || '').toLowerCase();
    return err?.response?.status === 404 || msg.includes('404') || msg.includes('not found');
  };

  const handleDeleteItem = async (itemId) => {
    if (deletingIds.includes(itemId)) return;
    setDeletingIds((prev) => [...prev, itemId]);

    try {
      try {
        await CartItem.get(itemId);
      } catch (e) {
        if (isNotFoundError(e)) {
          await loadCartItems();
          return;
        } else {
          throw e;
        }
      }

      await CartItem.delete(itemId);
      loadCartItems();
    } catch (error) {
      console.error("Failed to delete item:", error);
      if (isNotFoundError(error)) {
        loadCartItems();
      } else {
        alert('שגיאה במחיקת הפריט. אנא רענני את הדף ונסי שוב.');
      }
    } finally {
      setDeletingIds((prev) => prev.filter((id) => id !== itemId));
    }
  };

  const isEmpty = Object.keys(cartItems).length === 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-none hover:bg-stone-100 transition-colors" aria-label="סל קניות">
          <ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5 text-stone-800" strokeWidth={1.5} />
          {!isEmpty && (
            <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center cart-count-badge">
              {getTotalItems()}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0 rounded-none" align="end">
        <div className="bg-white border border-stone-200 shadow-lg">
          <div className="p-4 border-b border-stone-200">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-stone-800">סלי הקניות שלך</h3>
              <button onClick={() => loadCartItems()} className="text-stone-500 hover:text-stone-700">
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-stone-400" />
              </div>
            ) : hasError ? (
              <div className="p-6 text-center">
                <p className="text-stone-500 text-sm mb-3">שגיאה בטעינת הסל</p>
                <Button variant="outline" size="sm" onClick={() => loadCartItems()}>
                  נסי שוב
                </Button>
              </div>
            ) : isEmpty ? (
              <div className="p-6 text-center">
                <ShoppingBag className="h-12 w-12 mx-auto text-stone-300 mb-3" />
                <p className="text-stone-500 text-sm">הסלים שלך ריקים</p>
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {Object.entries(cartItems)
                  .sort(([siteA], [siteB]) => getSiteOrder(siteA) - getSiteOrder(siteB))
                  .map(([site, items]) => (
                  <div key={site} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <img 
                                src={getSiteFlag(site)} 
                                alt={`דגל ${getSiteName(site)}`}
                                className="w-6 h-4 object-cover border border-stone-200"
                            />
                            <h4 className="text-sm font-medium text-stone-700">
                                {getSiteName(site)}
                            </h4>
                            <span className="text-xs bg-rose-100 text-rose-800 px-2 py-1 rounded-full">
                                {items.length} פריטים
                            </span>
                        </div>
                        <Button variant="link" size="sm" onClick={() => handleGoToSiteCart(site)} className="text-xs h-auto p-0">
                          עבור לסל
                        </Button>
                    </div>
                    
                    <div className="space-y-3">
                      {items.map((item) => (
                        <div key={item.id} className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-stone-800 font-medium truncate">{item.product_name}</p>
                            <div className="flex items-center gap-2 text-xs text-stone-500 mt-1">
                                <ColorDisplay colorName={item.color} size="xs" />
                                <span>{item.size}</span>
                                <span>•</span>
                                <span>כמות: {item.quantity}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => handleEditItem(item)}>
                                <Edit className="w-3 h-3 text-stone-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-7 h-7 text-stone-400 hover:text-stone-600 disabled:opacity-50 disabled:cursor-not-allowed"
                              onClick={() => handleDeleteItem(item.id)}
                              disabled={deletingIds.includes(item.id)}
                            >
                                <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}