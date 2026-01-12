import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Home, Package, Truck, Settings, Heart, FileText, MessageSquare, BarChart3, User as UserIcon, TrendingUp } from "lucide-react";
import { User } from "@/entities/User";
import SheetNav from './components/layout/SheetNav';
import CartPopover from './components/layout/CartPopover';
import LoyaltySignupPopup from './components/loyalty/LoyaltySignupPopup';

const MAINTENANCE_MODE = false; // שנה ל-true כדי לסגור את האתר

export default function Layout({ children }) {
  const location = useLocation();
  const [userRole, setUserRole] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // FIX: Set a clear, branded document title
    document.title = "Brandy Melville to Israel";

    // Google Analytics
    if (!window.gtag) {
      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://www.googletagmanager.com/gtag/js?id=G-VCRC7EKKQH';
      document.head.appendChild(script);

      window.dataLayer = window.dataLayer || [];
      window.gtag = function () {window.dataLayer.push(arguments);};
      window.gtag('js', new Date());
      window.gtag('config', 'G-VCRC7EKKQH');
    }

    const checkUser = async () => {
      try {
        const user = await User.me();
        if (user) {
          setUserRole(user.role);
          setIsLoggedIn(true);
        } else {
          setUserRole('user'); // Guest
          setIsLoggedIn(false);
        }
      } catch (error) {
        setUserRole('user'); // Guest
        setIsLoggedIn(false);
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, [location.pathname]); // Re-check on route change

  const allNavLinks = [
  { name: "Home", label: "הזמנה חדשה", icon: Home, roles: ['admin', 'user'] },
  { name: "TrackOrder", label: "מעקב משלוח", icon: Truck, roles: ['admin', 'user'] },
  { name: "LoyaltyClub", label: "מועדון לקוחות", icon: Heart, roles: ['admin', 'user'] },
  { name: "Chat", label: "שירות לקוחות", icon: MessageSquare, roles: ['admin', 'user'] },
  { name: "Terms", label: "תקנון", icon: FileText, roles: ['admin', 'user'] },
  { name: "Orders", label: "ניהול הזמנות", icon: Package, roles: ['admin'] },
  { name: "ManageLocalStock", label: "ניהול מלאי מקומי", icon: Package, roles: ['admin'] },
  { name: "Reports", label: "דוחות ואנליטיקה", icon: BarChart3, roles: ['admin'] },
  { name: "ProfitReports", label: "דוחות רווח נקי", icon: TrendingUp, roles: ['admin'] },
  { name: "ManageCoupons", label: "ניהול קופונים והטבות", icon: FileText, roles: ['admin'] },

  { name: "LoyaltyAdmin", label: "ניהול מועדון לקוחות", icon: Heart, roles: ['admin'] },
  { name: "ChatLogs", label: "לוג שיחות צ'אט", icon: MessageSquare, roles: ['admin'] }];


  const navLinks = allNavLinks.filter((link) => link.roles.includes(userRole));

  return (
    <>
      <LoyaltySignupPopup />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Assistant:wght@400;500;600;700&display=swap');
        body { font-family: 'Assistant', sans-serif; background-color: #fcfbf9; color: #333; direction: rtl; }
        h1, h2, h3, h4, h5, h6 { font-family: 'Assistant', sans-serif; }
        .ltr { direction: ltr; text-align: left; }
        * { border-radius: 0 !important; }
        .cart-count-badge { border-radius: 50% !important; }
      `}</style>
      <div className="min-h-screen bg-[#fcfbf9]" dir="rtl">
        <header className="bg-white/95 backdrop-blur-sm sticky top-0 z-50 border-b border-stone-200/50 shadow-sm">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-14 sm:h-16">
              <div className="flex items-center gap-1 sm:gap-2">
                <SheetNav navLinks={navLinks} location={location} />

                <Link to={createPageUrl("Profile")} aria-label="איזור אישי">
                  <button className="flex items-center justify-center p-0 relative rounded-none w-9 h-9 sm:w-10 sm:h-10 bg-transparent hover:bg-stone-100 transition-colors">
                    <UserIcon className="h-4 w-4 sm:h-5 sm:w-5 text-stone-800" strokeWidth={1.5} />
                    <span className="sr-only">איזור אישי</span>
                  </button>
                </Link>

                <CartPopover />
              </div>
              
              <Link to={createPageUrl("Home")} className="flex items-center gap-2">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-rose-200 flex items-center justify-center">
                  <Heart className="w-3 h-3 sm:w-5 sm:h-5 text-white fill-white" />
                </div>
                <div className="text-right">
                  <h1 className="text-sm sm:text-lg font-semibold tracking-wide text-stone-800">ברנדי ישראל</h1>
                  <p className="text-xs text-stone-500 hidden sm:block">הדרך הקלה להזמין ברנדי מחו״ל</p>
                </div>
              </Link>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-10">
          {MAINTENANCE_MODE && userRole !== 'admin' ?
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
              <Heart className="w-16 h-16 text-rose-300 mb-6" />
              <h1 className="text-3xl font-semibold text-stone-800 mb-4">האתר בבנייה 🚧</h1>
              <p className="text-lg text-stone-600 mb-2">אנחנו עובדים על משהו מדהים!</p>
              <p className="text-stone-500">נחזור בקרוב עם חוויה מושלמת 💖</p>
            </div> :

          children
          }
        </main>
      </div>
    </>);

}