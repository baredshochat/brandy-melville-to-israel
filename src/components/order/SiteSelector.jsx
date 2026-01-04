import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Info, Clock, Shield, Truck, HelpCircle, Calculator, ArrowLeft, MessageSquare, CheckCircle, DollarSign, HeadphonesIcon, Globe, Plane, Package, Heart } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Link } from "react-router-dom";
import { createPageUrl } from '@/utils';

const sites = [
{
  id: 'eu',
  name: 'אירופה',
  flag: 'https://flagcdn.com/w160/eu.png',
  url: 'eu.brandymelville.com'
},
{
  id: 'uk',
  name: 'בריטניה',
  flag: 'https://flagcdn.com/w160/gb.png',
  url: 'uk.brandymelville.com'
},
{
  id: 'local',
  name: 'ישראל', // Changed from 'מלאי מקומי'
  flag: 'https://flagcdn.com/w160/il.png',
  url: 'זמין במלאי שלנו בארץ' // Changed from 'זמין מיידית במלאי שלנו בישראל'
}];

const mobileImageUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/dc0cf8cab_IMG_2909.jpg";
const desktopImageUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/cfba93764_581FEBA9-A4FB-4A37-8695-E29A2CEBF4F9.png";


const HowItWorksModal = () =>
<Dialog>
    <DialogTrigger asChild>
      <Button variant="outline" className="flex items-center gap-2 border-2 border-rose-200 hover:bg-rose-50 text-stone-700">
        <Info className="w-4 h-4" />
        איך זה עובד?
      </Button>
    </DialogTrigger>
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle className="tracking-tight text-xl font-bold">איך האתר עובד?</DialogTitle>
      </DialogHeader>
      <div className="space-y-6 py-4">
        {/* International Orders */}
        <div className="p-4 bg-stone-50 rounded-lg">
          <h3 className="font-semibold mb-3 text-stone-800">🌍 הזמנות מחו״ל</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-rose-100 flex items-center justify-center flex-shrink-0">
                <span className="text-stone-800 font-bold text-sm">1</span>
              </div>
              <div>
                <h4 className="font-semibold mb-1 text-sm">בחירת אתר</h4>
                <p className="text-sm text-stone-600">בחרי אירופה או בריטניה</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-rose-100 flex items-center justify-center flex-shrink-0">
                <span className="text-stone-800 font-bold text-sm">2</span>
              </div>
              <div>
                <h4 className="font-semibold mb-1 text-sm">הדבקת קישור</h4>
                <p className="text-sm text-stone-600">הדביקי קישור למוצר והמערכת תזהה אותו</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-rose-100 flex items-center justify-center flex-shrink-0">
                <span className="text-stone-800 font-bold text-sm">3</span>
              </div>
              <div>
                <h4 className="font-semibold mb-1 text-sm">חישוב מחיר</h4>
                <p className="text-sm text-stone-600">נחשב מחיר סופי כולל משלוח, מכס ומע״מ</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-rose-100 flex items-center justify-center flex-shrink-0">
                <span className="text-stone-800 font-bold text-sm">4</span>
              </div>
              <div>
                <h4 className="font-semibold mb-1 text-sm">משלוח עד הבית</h4>
                <p className="text-sm text-stone-600">3-4 שבועות עד שהחבילה מגיעה</p>
              </div>
            </div>
          </div>
        </div>

        {/* Local Stock Orders */}
        <div className="p-4 bg-rose-50 rounded-lg">
          <h3 className="font-semibold mb-3 text-stone-800">🇮🇱 מלאי מקומי בישראל</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-rose-200 flex items-center justify-center flex-shrink-0">
                <span className="text-stone-800 font-bold text-sm">1</span>
              </div>
              <div>
                <h4 className="font-semibold mb-1 text-sm">בחירת ״ישראל״</h4>
                <p className="text-sm text-stone-600">בחרי במלאי המקומי שלנו</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-rose-200 flex items-center justify-center flex-shrink-0">
                <span className="text-stone-800 font-bold text-sm">2</span>
              </div>
              <div>
                <h4 className="font-semibold mb-1 text-sm">דפדוף והוספה לסל</h4>
                <p className="text-sm text-stone-600">בחרי פריטים זמינים והוסיפי לסל</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-rose-200 flex items-center justify-center flex-shrink-0">
                <span className="text-stone-800 font-bold text-sm">3</span>
              </div>
              <div>
                <h4 className="font-semibold mb-1 text-sm">תשלום מהיר</h4>
                <p className="text-sm text-stone-600">מחיר הפריט + 30 ש״ח משלוח בלבד</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-rose-200 flex items-center justify-center flex-shrink-0">
                <span className="text-stone-800 font-bold text-sm">4</span>
              </div>
              <div>
                <h4 className="font-semibold mb-1 text-sm">אספקה מהירה</h4>
                <p className="text-sm text-stone-600">3-7 ימי עסקים עד הבית</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>;


const ShippingInfoModal = () =>
<Dialog>
    <DialogTrigger asChild>
      <Button variant="outline" className="flex items-center gap-2 border-2 border-rose-200 hover:bg-rose-50 text-stone-700">
        <Truck className="w-4 h-4" />
        זמני משלוח
      </Button>
    </DialogTrigger>
    <DialogContent className="max-w-xl">
      <DialogHeader>
        <DialogTitle className="tracking-tight text-xl font-bold">זמני משלוח ומעקב</DialogTitle>
      </DialogHeader>
      <div className="space-y-6 py-4">
        {/* International Shipping */}
        <div className="p-4 bg-stone-50 rounded-lg">
          <div className="flex items-center gap-3 mb-3">
            <Clock className="w-5 h-5 text-stone-500" />
            <div>
              <h3 className="font-semibold">משלוח בינלאומי (אירופה/בריטניה)</h3>
              <p className="text-sm text-stone-600">3-4 שבועות מרגע ביצוע ההזמנה</p>
            </div>
          </div>
          
          <div className="space-y-2 pt-3 border-t">
            <h4 className="font-semibold text-sm mb-2">שלבי המשלוח:</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>הזמנה מהאתר</span>
                <span className="text-stone-500">1-2 ימים</span>
              </div>
              <div className="flex justify-between">
                <span>איסוף ועיבוד</span>
                <span className="text-stone-500">3-5 ימים</span>
              </div>
              <div className="flex justify-between">
                <span>משלוח לישראל</span>
                <span className="text-stone-500">7-10 ימים</span>
              </div>
              <div className="flex justify-between">
                <span>שחרור ממכס</span>
                <span className="text-stone-500">2-3 ימים</span>
              </div>
              <div className="flex justify-between">
                <span>משלוח עד הבית</span>
                <span className="text-stone-500">3-7 ימים</span>
              </div>
            </div>
          </div>
        </div>

        {/* Local Stock Shipping */}
        <div className="p-4 bg-rose-50 rounded-lg">
          <div className="flex items-center gap-3 mb-3">
            <Clock className="w-5 h-5 text-rose-600" />
            <div>
              <h3 className="font-semibold">מלאי מקומי (ישראל) ⚡</h3>
              <p className="text-sm text-stone-600">3-7 ימי עסקים בלבד!</p>
            </div>
          </div>
          
          <div className="space-y-2 pt-3 border-t border-rose-200">
            <p className="text-sm text-stone-700">
              הפריטים זמינים במלאי שלנו בישראל ונשלחים ישירות אלייך.
            </p>
            <p className="text-sm text-stone-600">
              <strong>שימי לב:</strong> ימי עסקים לא כוללים שישי-שבת, חגים ומועדים.
            </p>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>;


const PricingInfoModal = () =>
<Dialog>
    <DialogTrigger asChild>
      <Button variant="outline" className="flex items-center gap-2 border-2 border-rose-200 hover:bg-rose-50 text-stone-700">
        <Calculator className="w-4 h-4" />
        איך מחושב המחיר?
      </Button>
    </DialogTrigger>
    <DialogContent className="max-w-xl">
      <DialogHeader>
        <DialogTitle className="text-xl font-bold">רכיבי המחיר</DialogTitle>
      </DialogHeader>
      <div className="space-y-6 py-4">
        {/* International Pricing */}
        <div className="p-4 bg-stone-50 rounded-lg">
          <h3 className="font-semibold mb-3 text-stone-800">🌍 הזמנות מחו״ל</h3>
          <p className="text-sm text-stone-600 mb-3">המחיר הסופי כולל:</p>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center p-2 bg-white rounded">
              <span className="font-medium text-sm">מחיר המוצרים</span>
              <span className="text-xs text-stone-600">לפי האתר המקורי</span>
            </div>
            
            <div className="flex justify-between items-center p-2 bg-white rounded">
              <span className="font-medium text-sm">משלוח בינלאומי</span>
              <span className="text-xs text-stone-600">לפי משקל</span>
            </div>
            
            <div className="flex justify-between items-center p-2 bg-white rounded">
              <span className="font-medium text-sm">מכס ומס קנייה</span>
              <span className="text-xs text-stone-600">12% (מעל 75$)</span>
            </div>
            
            <div className="flex justify-between items-center p-2 bg-white rounded">
              <span className="font-medium text-sm">עמלות טיפול</span>
              <span className="text-xs text-stone-600">שחרור מכס ועיבוד</span>
            </div>
            
            <div className="flex justify-between items-center p-2 bg-white rounded">
              <span className="font-medium text-sm">משלוח בישראל</span>
              <span className="text-xs text-stone-600">עד הבית</span>
            </div>
            
            <div className="flex justify-between items-center p-2 bg-white rounded">
              <span className="font-medium text-sm">מע״מ</span>
              <span className="text-xs text-stone-600">18%</span>
            </div>
          </div>
        </div>

        {/* Local Stock Pricing */}
        <div className="p-4 bg-rose-50 rounded-lg">
          <h3 className="font-semibold mb-3 text-stone-800">🇮🇱 מלאי מקומי</h3>
          <p className="text-sm text-stone-600 mb-3">תמחור פשוט וברור:</p>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center p-2 bg-white rounded">
              <span className="font-medium text-sm">מחיר הפריט</span>
              <span className="text-xs text-stone-600">כפי שמוצג</span>
            </div>
            
            <div className="flex justify-between items-center p-2 bg-white rounded">
              <span className="font-medium text-sm">משלוח עד הבית</span>
              <span className="text-xs text-stone-600 font-bold">₪35 בלבד</span>
            </div>
          </div>
          
          <div className="mt-3 p-3 bg-white rounded border border-rose-200">
            <p className="text-sm text-rose-800">
              <strong>זהו!</strong> אין מכס, אין עמלות נוספות, אין הפתעות.
            </p>
          </div>
        </div>
        
        <div className="p-4 bg-stone-100 rounded-lg">
          <p className="text-sm text-stone-700">
            <strong>הבטחה:</strong> המחיר שתראי בסיום התהליך הוא המחיר הסופי - אין עלויות נסתרות!
          </p>
        </div>
      </div>
    </DialogContent>
  </Dialog>;


const SupportModal = () =>
<Dialog>
    <DialogTrigger asChild>
      <Button variant="outline" className="flex items-center gap-2 border-2 border-rose-200 hover:bg-rose-50 text-stone-700">
        <HelpCircle className="w-4 h-4" />
        שאלות נפוצות
      </Button>
    </DialogTrigger>
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle className="text-xl font-bold">שאלות נפוצות</DialogTitle>
      </DialogHeader>
      <div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto">
        <div>
          <h3 className="font-semibold mb-2">האם המחיר שמוצג הוא סופי?</h3>
          <p className="text-sm text-stone-600">כן! המחיר שתראי בסוף התהליך כולל הכל - אין עלויות נוספות או הפתעות.</p>
        </div>
        
        <div>
          <h3 className="font-semibold mb-2">כמה זמן לוקח עד שההזמנה מגיעה?</h3>
          <p className="text-sm text-stone-600">בדרך כלל 3-4 שבועות מרגע ביצוע ההזמנה. את יכולה לעקוב אחר הסטטוס באתר.</p>
        </div>
        
        <div>
          <h3 className="font-semibold mb-2">מה קורה אם המוצר לא זמין?</h3>
          <p className="text-sm text-stone-600">נעדכן אותך מיד ונציע החזר מלא או החלפה במוצר דומה.</p>
        </div>
        
        <div>
          <h3 className="font-semibold mb-2">האם יש אפשרות החזרה?</h3>
          <p className="text-sm text-stone-600">בגלל המורכבות של משלוחים בינלאומיים, אנחנו לא יכולים לקבל החזרות. לכן חשוב לוודא מידות לפני ההזמנה.</p>
        </div>
        
        <div>
          <h3 className="font-semibold mb-2">איך אני יודעת את המידה הנכונה?</h3>
          <p className="text-sm text-stone-600">Brandy Melville בדרך כלל עובדים עם מידות "One Size" או מידות קטנות. מומלץ לבדוק בחנות פיזית או לפי המידות באתר המקורי.</p>
        </div>
        
        <div>
          <h3 className="font-semibold mb-2">איך אפשר ליצור איתכם קשר?</h3>
          <p className="text-sm text-stone-600">את יכולה לפנות אלינו דרך הווטסאפ במס׳ 055-7045322</p>
        </div>
      </div>
    </DialogContent>
  </Dialog>;


export default function SiteSelector({ onSiteSelect, onBack, userRole }) {
  // Filter out 'local' site if user is not admin
  const availableSites = userRole === 'admin' ? sites : sites.filter(site => site.id !== 'local');

  return (
    <motion.div
      key="step1"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="p-3 sm:p-8 relative bg-neutral-50">

      {/* Back button */}
      {onBack &&
      <Button
        variant="ghost"
        onClick={onBack}
        className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10 flex items-center gap-2 text-stone-600 hover:text-black">

          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">חזור</span>
        </Button>
      }
      
      {/* Updated Image Section */}
      <div className="mb-8 sm:mb-12 max-w-5xl mx-auto">
        <div
          style={{ '--mobile-image': `url(${mobileImageUrl})`, '--desktop-image': `url(${desktopImageUrl})` }}
          aria-label="Brandy Melville Store"
          role="img"
          className="w-full h-48 sm:h-80 lg:h-96 bg-cover bg-[image:var(--mobile-image)] bg-right shadow-lg md:bg-[image:var(--desktop-image)] md:bg-center">
        </div>
      </div>

      {/* Hero Section */}
      <div className="text-center mb-8 sm:mb-12">
        <div className="flex justify-center mb-3 sm:mb-4">
            <Heart className="w-8 h-8 sm:w-10 sm:h-10 text-rose-300 fill-rose-300/30" />
        </div>
        <h2 className="text-2xl sm:text-3xl mb-2 sm:mb-3 font-semibold tracking-normal">מאיפה קונות היום?</h2>
        <p className="text-sm sm:text-base text-stone-600 max-w-2xl mx-auto px-4">
          בחרי את אתר Brandy Melville ממנו את רוצה להזמין
        </p>
      </div>

      {/* Site Selection */}
      <div className={`grid grid-cols-1 ${availableSites.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-4 sm:gap-6 max-w-4xl mx-auto mb-8 sm:mb-12`}>
        {availableSites.map((site, index) =>
        <motion.div
          key={site.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1, duration: 0.5 }}>

            <Card
            className={`h-full transition-all duration-300 border-stone-200 overflow-hidden group bg-white cursor-pointer hover:border-stone-400`}
            onClick={() => onSiteSelect(site.id)}>

              <CardContent className="p-4 sm:p-5 flex flex-col justify-center items-center">
                <div className="mb-2 sm:mb-3 flex justify-center">
                  <img
                  src={site.flag}
                  alt={`דגל ${site.name}`}
                  loading="lazy"
                  decoding="async"
                  className="w-10 h-7 sm:w-12 sm:h-9 object-cover border border-stone-200" />

                </div>
                <h3 className="text-base sm:text-lg font-medium mb-1 text-center text-stone-800">
                  {site.name}
                </h3>
                <p className="text-xs sm:text-sm text-center text-stone-500">
                  {site.url}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Info buttons */}
      <div className="flex flex-wrap justify-center gap-2 sm:gap-4 max-w-4xl mx-auto mb-6 sm:mb-8 px-4">
        <HowItWorksModal />
        <ShippingInfoModal />
        <PricingInfoModal />
        <SupportModal />
      </div>

      {/* Chat Support Link */}
      <div className="text-center px-4">
        <p className="text-stone-500 font-light text-xs sm:text-sm mb-3 sm:mb-4">
          יש לך שאלות? אנחנו כאן לעזור.
        </p>
        <Link to={createPageUrl('Chat')}>
          <Button
            variant="outline"
            className="px-4 sm:px-6 py-2 sm:py-3 bg-white hover:bg-stone-50 text-stone-800 border-stone-300 hover:border-rose-300 transition-all duration-300 flex items-center gap-2 mx-auto text-sm sm:text-base">

            <MessageSquare className="w-4 h-4" />
            צ'אט עם נציגה
          </Button>
        </Link>
      </div>
    </motion.div>);

}