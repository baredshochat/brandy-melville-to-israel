import React, { useState, useEffect } from 'react';
import { User } from '@/entities/User';
import { Order } from '@/entities/Order';
import { PointsLedger } from '@/entities/PointsLedger';
import { Code } from '@/entities/Code';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { 
  Heart, 
  ShoppingBag, 
  Gift, 
  Package, 
  Truck, 
  MessageSquare,
  Settings,
  LogOut,
  Plus,
  Eye,
  AlertTriangle,
  Users,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Award,
  Star,
  TrendingUp
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { base44 } from '@/api/base44Client';

const statusLabels = {
  pending: 'ממתין',
  ordered: 'הוזמן', 
  warehouse: 'במחסן',
  shipping_to_israel: 'בדרך לישראל',
  in_israel: 'בארץ',
  shipping_to_customer: 'בדרך ללקוחה',
  delivered: 'נמסר'
};

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [recentLedger, setRecentLedger] = useState([]);
  const [activeCodes, setActiveCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingMarketing, setUpdatingMarketing] = useState(false);

  useEffect(() => {
    const loadUserData = async () => {
      setLoading(true);
      try {
        const currentUser = await User.me();
        setUser(currentUser);

        const orders = await Order.filter({ customer_email: currentUser.email }, '-created_date', 3);
        setRecentOrders(orders);
        
        if (currentUser.club_member) {
          try {
            const ledger = await PointsLedger.filter({ user_email: currentUser.email }, '-created_date', 3);
            setRecentLedger(ledger || []);

            const codes = await Code.filter({
              allowed_emails: { $in: [currentUser.email] },
              is_active: true
            });
            setActiveCodes(codes || []);
          } catch (error) {
            console.log('No loyalty data yet');
          }
        }
        
      } catch (error) {
        console.error('Error loading user data:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    loadUserData();
  }, []);

  const getLedgerIcon = (type) => {
    switch (type) {
      case 'earn': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'bonus': return <Gift className="w-4 h-4 text-rose-500" />;
      case 'use': return <Star className="w-4 h-4 text-blue-600" />;
      default: return <Award className="w-4 h-4 text-stone-500" />;
    }
  };

  const handleMarketingOptIn = async (checked) => {
    setUpdatingMarketing(true);
    try {
      const updateData = {
        marketing_opt_in: checked,
        marketing_source: 'profile'
      };
      
      if (checked) {
        updateData.marketing_opt_in_at = new Date().toISOString();
        updateData.unsubscribed_at = null;
      } else {
        updateData.unsubscribed_at = new Date().toISOString();
      }

      await base44.auth.updateMe(updateData);
      setUser({ ...user, ...updateData });
    } catch (error) {
      console.error('Error updating marketing preferences:', error);
      alert('שגיאה בעדכון העדפות דיוור');
    } finally {
      setUpdatingMarketing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Heart className="w-10 h-10 text-rose-400 fill-rose-400/20" />
          </div>
          <h2 className="text-2xl font-semibold mb-3 text-stone-900">איזור אישי</h2>
          <p className="text-stone-600 mb-6 max-w-md mx-auto">
            התחברי כדי לצפות בהזמנות שלך, לעקוב אחרי הנקודות שלך ולקבל הטבות מיוחדות
          </p>
          <Button 
            onClick={() => base44.auth.redirectToLogin(createPageUrl('Profile'))}
            className="bg-stone-900 hover:bg-stone-800 h-11 px-8"
          >
            התחברי
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-rose-50/30 to-stone-100">
      {/* Hero Section */}
      <div className="relative bg-white overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/b7a7981b1_IMG_9486.jpg"
            alt="Brandy Melville aesthetic"
            className="w-full h-full object-cover opacity-25"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-50 via-rose-50/20 to-transparent" />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 py-16 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Heart className="w-12 h-12 text-rose-400 fill-rose-400/20 mx-auto mb-4" />
            <h1 className="text-4xl font-light text-stone-800 mb-2">
              היי {user.first_name || user.full_name?.split(' ')[0] || 'יקרה'}
            </h1>
            <p className="text-lg text-stone-600 font-light">ברוכה הבאה לאיזור האישי שלך</p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-10 relative z-10 grid lg:grid-cols-3 gap-6 pb-12">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Loyalty Club Section */}
          {user.club_member ? (
            <>
              {/* Tier Status */}
              <Card className="bg-gradient-to-br from-rose-100 via-pink-50 to-white border-2 border-rose-200 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-rose-500" />
                    דרגת המועדון שלך
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center mb-4">
                    <div className="text-4xl font-bold mb-2">
                      {user.tier === 'gold' ? '⭐ Gold' : user.tier === 'silver' ? '✨ Silver' : '💖 Member'}
                    </div>
                    <p className="text-sm text-stone-600">
                      {user.tier === 'gold' ? 'צבירת 10% נקודות • משלוח חינם חודשי' : 
                       user.tier === 'silver' ? 'צבירת 7% נקודות • משלוח חינם חד-פעמי' : 
                       'צבירת 5% נקודות'}
                    </p>
                  </div>

                  {/* Progress Bar */}
                  {user.tier !== 'gold' && (
                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-stone-600 mb-2">
                        <span>{user.orders_last_6_months || 0} הזמנות</span>
                        <span>{user.tier === 'silver' ? '10 לדרגת Gold' : '5 לדרגת Silver'}</span>
                      </div>
                      <div className="w-full bg-stone-200 rounded-full h-2">
                        <div 
                          className="bg-rose-500 h-2 rounded-full transition-all"
                          style={{ 
                            width: `${Math.min(100, ((user.orders_last_6_months || 0) / (user.tier === 'silver' ? 10 : 5)) * 100)}%` 
                          }}
                        />
                      </div>
                      <p className="text-xs text-stone-500 mt-2 text-center">
                                                    עוד {(user.tier === 'silver' ? 10 : 5) - (user.orders_last_6_months || 0)} הזמנות לדרגה הבאה — {user.tier === 'silver' ? 'משלוח חינם כל חודש' : 'משלוח חינם חד-פעמי והטבות נוספות'}
                                                  </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Points Balance */}
              <Card className="bg-white/95 backdrop-blur-sm border border-white/50 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-rose-500" />
                    הנקודות שלך
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <p className="text-4xl font-bold text-stone-900">{user.points_balance || 0}</p>
                                              <p className="text-stone-600 mt-1 font-medium">נקודות זמינות</p>
                                              <p className="text-sm text-stone-600 mt-1">
                                                שווה ל-₪{(((user.points_balance || 0) * 0.5) || 0).toFixed(0)}
                                              </p>

                    {user.points_balance >= 100 ? (
                      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-800 font-medium">
                          🎉 יש לך מספיק נקודות להטבה!
                        </p>
                        <p className="text-xs text-green-600 mt-1">
                          100 נקודות = הנחה של 50₪
                        </p>
                      </div>
                    ) : (
                      <div className="mt-4">
                        <p className="text-sm text-stone-500">
                          עוד {100 - (user.points_balance || 0)} נקודות להטבה הבאה
                        </p>
                        <div className="w-full bg-stone-200 rounded-full h-2 mt-2">
                          <div 
                            className="bg-rose-400 h-2 rounded-full transition-all"
                            style={{ width: `${Math.min(100, (user.points_balance || 0))}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex justify-center gap-2 mt-4">
                                                <Link to={createPageUrl('Home?redeem=1')}>
                                                  <Button size="sm" className="bg-rose-500 hover:bg-rose-600 text-white">
                                                    ממשי נקודות עכשיו
                                                  </Button>
                                                </Link>
                                                <Link to={createPageUrl('LoyaltyClub')}>
                                                  <Button variant="outline" size="sm">
                                                    לדף המועדון
                                                  </Button>
                                                </Link>
                                              </div>
                  </div>
                </CardContent>
              </Card>

              {/* Active Benefits */}
              {activeCodes.length > 0 && (
                <Card className="bg-white/95 backdrop-blur-sm border border-white/50 shadow-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Gift className="w-5 h-5 text-rose-500" />
                      הטבות פעילות
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {activeCodes.map((code) => (
                      <div
                        key={code.id}
                        className="bg-stone-50 p-3 rounded-lg border border-stone-200"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">{code.code}</p>
                            <p className="text-xs text-stone-600 mt-0.5">{code.notes || 'הטבה מיוחדת'}</p>
                          </div>
                          <div className="text-left">
                            <p className="text-rose-600 font-bold text-sm">
                              {code.reward_type === 'percent' ? `${code.value}%` : `₪${code.value}`}
                            </p>
                            <p className="text-xs text-stone-500">
                              עד {new Date(code.expires_at).toLocaleDateString('he-IL')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Recent Points Activity */}
              {recentLedger.length > 0 && (
                <Card className="bg-white/95 backdrop-blur-sm border border-white/50 shadow-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-rose-500" />
                      פעילות נקודות
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {recentLedger.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between p-2 bg-stone-50 rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            {getLedgerIcon(entry.type)}
                            <div>
                              <p className="font-medium text-xs">{entry.description}</p>
                              <p className="text-xs text-stone-500">
                                {new Date(entry.created_date).toLocaleDateString('he-IL')}
                              </p>
                            </div>
                          </div>
                          <p className={`font-bold text-sm ${entry.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {entry.amount > 0 ? '+' : ''}{entry.amount}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card className="bg-gradient-to-br from-rose-100 via-pink-50 to-white border-2 border-rose-200 shadow-xl">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <Gift className="w-8 h-8 text-rose-500" />
                </div>
                <h3 className="font-semibold text-xl mb-2">הצטרפי למועדון!</h3>
                <p className="text-sm text-stone-600 mb-4 max-w-sm mx-auto">
                  צברי נקודות בכל הזמנה, קבלי הטבות מיוחדות ביום ההולדת והטבות שמתקדמות איתך
                </p>
                <Link to={createPageUrl('LoyaltyClub')}>
                  <Button className="bg-stone-900 hover:bg-stone-800">
                    הצטרפי עכשיו וקבלי 50 נקודות! 🎁
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
          
          {/* Recent Orders */}
          <Card className="bg-white/95 backdrop-blur-sm border border-white/50 shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-stone-600" />
                ההזמנות האחרונות שלי
              </CardTitle>
              <Link to={createPageUrl('MyOrders')}>
                <Button variant="ghost" size="sm" className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  כל ההזמנות
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {recentOrders.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 mx-auto text-stone-300 mb-3" />
                  <p className="text-stone-500 mb-3">עדיין לא ביצעת הזמנות</p>
                  <Link to={createPageUrl('Home')}>
                    <Button className="bg-rose-500 hover:bg-rose-600 text-white">
                      בואי נתחיל לקנות! 💫
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-4 bg-stone-50 border border-stone-200 rounded-lg">
                      <div>
                        <p className="font-medium text-stone-800">#{order.order_number}</p>
                        <p className="text-sm text-stone-500">
                          {order.created_date && format(new Date(order.created_date), 'd בMMMM', { locale: he })}
                        </p>
                        <Badge variant="outline" className={`mt-2 ${
                          order.status === 'delivered' ? 'border-green-500 text-green-700' :
                          order.status === 'shipping_to_customer' ? 'border-blue-500 text-blue-700' :
                          'border-stone-500 text-stone-700'
                        }`}>
                          {statusLabels[order.status] || order.status}
                        </Badge>
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-lg">₪{order.total_price_ils}</p>
                        <p className="text-sm text-stone-500">{order.items?.length || 0} פריטים</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Quick Links */}
          <Card className="bg-white/95 backdrop-blur-sm border border-white/50 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-rose-500" />
                ניווט מהיר
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <Link to={createPageUrl('Home')}>
                  <Button className="w-full h-12 bg-rose-500 hover:bg-rose-600 text-white flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    הזמנה חדשה
                  </Button>
                </Link>
                <Link to={createPageUrl('TrackOrder')}>
                  <Button variant="outline" className="w-full h-12 flex items-center gap-2">
                    <Truck className="w-4 h-4" />
                    מעקב משלוח
                  </Button>
                </Link>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <Link to={createPageUrl('Chat')}>
                  <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                    <MessageSquare className="w-4 h-4" />
                    שירות לקוחות
                  </Button>
                </Link>
                <Link to={createPageUrl('DefectClaim')}>
                  <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    דיווח בעיה
                  </Button>
                </Link>
                <Link to={createPageUrl('Referral')}>
                  <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                    <Users className="w-4 h-4" />
                    הפני חברה
                  </Button>
                </Link>
                <Link to={createPageUrl('Terms')}>
                  <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                    <Calendar className="w-4 h-4" />
                    תקנון
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Profile Info */}
          <Card className="bg-white/95 backdrop-blur-sm border border-white/50 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-stone-600" />
                פרטי חשבון
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-stone-500" />
                <div>
                  <p className="text-sm text-stone-500">אימייל</p>
                  <p className="font-medium">{user.email}</p>
                </div>
              </div>
              
              {user.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-stone-500" />
                  <div>
                    <p className="text-sm text-stone-500">טלפון</p>
                    <p className="font-medium">{user.phone}</p>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-stone-200">
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="marketing-profile"
                    checked={user.marketing_opt_in || false}
                    onCheckedChange={handleMarketingOptIn}
                    disabled={updatingMarketing}
                  />
                  <Label htmlFor="marketing-profile" className="text-xs text-stone-600 leading-relaxed cursor-pointer">
                    קבלת עדכונים והטבות למייל
                  </Label>
                </div>
              </div>

              <Button 
                variant="outline" 
                size="sm" 
                onClick={async () => {
                  if (confirm('האם את בטוחה שאת רוצה להתנתק?')) {
                    await base44.auth.logout();
                  }
                }}
                className="w-full flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                התנתקות
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}