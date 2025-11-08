
import React, { useState, useEffect, useMemo } from "react";
import { User } from "@/entities/User";
import { Order } from "@/entities/Order";
import { LoyaltyTransaction } from "@/entities/LoyaltyTransaction";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Mail
} from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { he } from 'date-fns/locale';

const statusLabels = {
  pending: "ממתין",
  ordered: "הוזמן", 
  warehouse: "במחסן",
  shipping_to_israel: "בדרך לישראל",
  in_israel: "בארץ",
  shipping_to_customer: "בדרך ללקוחה",
  delivered: "נמסר"
};

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loyaltyTransactions, setLoyaltyTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserData = async () => {
      setLoading(true);
      try {
        const currentUser = await User.me();
        setUser(currentUser);

        const orders = await Order.filter({ customer_email: currentUser.email }, '-created_date', 3);
        setRecentOrders(orders);
        
        try {
          const transactions = await LoyaltyTransaction.filter({ customer_email: currentUser.email }, '-created_date', 5);
          setLoyaltyTransactions(transactions);
        } catch (error) {
          console.log("No loyalty transactions yet");
        }
        
      } catch (error) {
        console.error("Error loading user data:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    loadUserData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <Heart className="w-16 h-16 mx-auto text-rose-300 mb-4" />
        <h2 className="text-2xl font-semibold text-stone-800 mb-4">ברוכה הבאה!</h2>
        <p className="text-stone-600 mb-6">התחברי כדי לגשת לאיזור האישי שלך</p>
        <Button onClick={() => User.login()} className="bg-rose-500 hover:bg-rose-600 text-white">
          התחברי
        </Button>
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

      <div className="max-w-6xl mx-auto px-4 -mt-10 relative z-10 grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Recent Orders */}
          <Card className="bg-white/95 backdrop-blur-sm border border-white/50 shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-stone-600" />
                ההזמנות האחרונות שלי
              </CardTitle>
              <Link to={createPageUrl("MyOrders")}>
                <Button variant="ghost" size="sm" className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  צפייה בהכל
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {recentOrders.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 mx-auto text-stone-300 mb-3" />
                  <p className="text-stone-500">עדיין לא ביצעת הזמנות</p>
                  <Link to={createPageUrl("Home")}>
                    <Button className="mt-3 bg-rose-500 hover:bg-rose-600 text-white">
                      בואי נתחיל לקנות! 💫
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-4 bg-stone-50 border border-stone-200">
                      <div>
                        <p className="font-medium text-stone-800">הזמנה #{order.order_number}</p>
                        <p className="text-sm text-stone-500">
                          {order.created_date && format(new Date(order.created_date), "d בMMMM", { locale: he })}
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
          
          {/* Quick Links & Actions */}
          <Card className="bg-white/95 backdrop-blur-sm border border-white/50 shadow-xl">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-rose-500" />
                    ניווט מהיר
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <Link to={createPageUrl("Home")}>
                        <Button className="w-full h-12 bg-rose-500 hover:bg-rose-600 text-white flex items-center gap-2">
                            <Plus className="w-4 h-4" />
                            הזמנה חדשה
                        </Button>
                    </Link>
                    <Link to={createPageUrl("TrackOrder")}>
                        <Button variant="outline" className="w-full h-12 flex items-center gap-2">
                            <Truck className="w-4 h-4" />
                            מעקב הזמנה
                        </Button>
                    </Link>
                </div>
                
                <div className="border-t border-stone-200 my-4"></div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <Link to={createPageUrl("Chat")}>
                        <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                        <MessageSquare className="w-4 h-4" />
                        שירות לקוחות
                        </Button>
                    </Link>
                    <Link to={createPageUrl("DefectClaim")}>
                        <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        דיווח על בעיה
                        </Button>
                    </Link>
                    <Link to={createPageUrl("Referral")}>
                        <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                        <Users className="w-4 h-4" />
                        הפניית חברות
                        </Button>
                    </Link>
                    <Link to={createPageUrl("Terms")}>
                        <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                        <Calendar className="w-4 h-4" />
                        תקנון האתר
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

              {(user.default_address || user.default_city) && (
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-stone-500" />
                  <div>
                    <p className="text-sm text-stone-500">כתובת</p>
                    <p className="font-medium">
                      {user.default_address && `${user.default_address}, `}
                      {user.default_city}
                    </p>
                  </div>
                </div>
              )}

              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => User.logout()}
                className="w-full flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                התנתקות
              </Button>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          {loyaltyTransactions.length > 0 && (
            <Card className="bg-white/95 backdrop-blur-sm border border-white/50 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="w-5 h-5 text-green-500" />
                  פעילות אחרונה
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {loyaltyTransactions.slice(0, 3).map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium">{transaction.description}</p>
                        <p className="text-stone-500">
                          {transaction.created_date && format(new Date(transaction.created_date), "d בMMMM", { locale: he })}
                        </p>
                      </div>
                      <Badge variant={transaction.points > 0 ? "default" : "destructive"}>
                        {transaction.points > 0 ? '+' : ''}{transaction.points}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
