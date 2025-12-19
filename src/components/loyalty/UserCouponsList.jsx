import React, { useState, useEffect } from 'react';
import { UserCoupon } from '@/entities/UserCoupon';
import { User } from '@/entities/User';
import { Loader2, Tag, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';

export default function UserCouponsList() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadUserAndCoupons();
  }, []);

  const loadUserAndCoupons = async () => {
    try {
      setLoading(true);
      const currentUser = await User.me();
      if (!currentUser) {
        setLoading(false);
        return;
      }
      setUser(currentUser);

      const userCoupons = await UserCoupon.filter({ user_id: currentUser.id });
      
      // Sort by created_date descending (newest first)
      const sorted = (userCoupons || []).sort((a, b) => 
        new Date(b.created_date) - new Date(a.created_date)
      );
      
      setCoupons(sorted);
    } catch (error) {
      console.error('Error loading coupons:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (coupon) => {
    const now = new Date();
    const validUntil = new Date(coupon.valid_until);
    
    if (coupon.status === 'used') {
      return {
        label: 'מומש',
        color: 'text-stone-500',
        bgColor: 'bg-stone-100',
        icon: CheckCircle
      };
    }
    
    if (validUntil < now) {
      return {
        label: 'פג תוקף',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        icon: XCircle
      };
    }
    
    return {
      label: 'פעיל',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      icon: Clock
    };
  };

  const getDiscountDisplay = (coupon) => {
    if (coupon.discount_type === 'percentage') {
      return `${coupon.discount_value}% הנחה`;
    } else if (coupon.discount_type === 'fixed') {
      return `₪${coupon.discount_value} הנחה`;
    } else if (coupon.discount_type === 'buy_x_get_y') {
      return `קנה ${coupon.buy_quantity} קבל ${coupon.get_quantity}`;
    }
    return 'הנחה';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-rose-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-8 text-stone-600">
        יש להתחבר כדי לראות קופונים
      </div>
    );
  }

  if (coupons.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed border-stone-200 rounded-lg bg-stone-50">
        <Tag className="w-12 h-12 text-stone-300 mx-auto mb-3" />
        <p className="text-stone-600 mb-2">עדיין אין לך קופונים אישיים</p>
        <p className="text-sm text-stone-500">קופונים יופיעו כאן כשתקבלי אותם</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Tag className="w-5 h-5 text-rose-500" />
        <h3 className="text-lg font-semibold text-stone-900">הקופונים האישיים שלי</h3>
      </div>

      <div className="grid gap-3">
        {coupons.map((coupon) => {
          const statusInfo = getStatusInfo(coupon);
          const StatusIcon = statusInfo.icon;
          
          return (
            <div 
              key={coupon.id} 
              className="border border-stone-200 rounded-lg p-4 bg-white hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-lg font-bold text-stone-900">
                      {coupon.coupon_code}
                    </span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${statusInfo.bgColor} ${statusInfo.color} flex items-center gap-1`}>
                      <StatusIcon className="w-3 h-3" />
                      {statusInfo.label}
                    </span>
                  </div>
                  <p className="text-sm text-stone-600">
                    {getDiscountDisplay(coupon)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-stone-500 border-t border-stone-100 pt-3">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>תוקף עד: {new Date(coupon.valid_until).toLocaleDateString('he-IL')}</span>
                </div>
                {coupon.times_used > 0 && (
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    <span>נוצל {coupon.times_used} פעמים</span>
                  </div>
                )}
              </div>

              {coupon.template_name && (
                <div className="mt-2 text-xs text-stone-400">
                  {coupon.template_name}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}