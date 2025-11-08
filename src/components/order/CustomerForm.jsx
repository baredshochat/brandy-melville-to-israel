import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowRight, ArrowLeft, User, Mail, Phone, Home, MapPin, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";
import { User as UserEntity } from "@/entities/User";

export default function CustomerForm({ onSubmit, onBack }) {
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    shipping_address: '',
    city: '',
    notes: ''
  });

  // Load user and auto-fill email
  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await UserEntity.me();
        setUser(userData);
        
        // Auto-fill email from logged-in user
        if (userData && userData.email) {
          setFormData(prev => ({
            ...prev,
            customer_email: userData.email
          }));
        }
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUser();
  }, []);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    onSubmit(formData);
  };

  // Add proper email validation
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customer_email);

  const isValid = formData.customer_name && formData.customer_email && 
                 formData.customer_phone && formData.shipping_address && 
                 formData.city && emailValid;

  const inputFields = [
      { id: 'customer_name', label: 'שם מלא', placeholder: 'הזיני את שמך המלא', width: 'full', icon: User, component: 'input', required: true },
      { id: 'customer_email', label: 'כתובת אימייל', placeholder: 'your.email@example.com', type: 'email', width: 'full', icon: Mail, component: 'input', required: true },
      { id: 'customer_phone', label: 'טלפון', placeholder: '05X-XXXXXXX', type: 'tel', width: 'full', icon: Phone, component: 'input', required: true },
      { id: 'shipping_address', label: 'כתובת', placeholder: 'רחוב, מספר בית, דירה', width: 'full', icon: Home, component: 'input', required: true },
      { id: 'city', label: 'עיר', placeholder: 'תל אביב', width: 'full', icon: MapPin, component: 'input', required: true },
      { id: 'notes', label: 'הערות (אופציונלי)', placeholder: 'בקשות מיוחדות, הנחיות לשליח...', width: 'full', icon: MessageSquare, component: 'textarea', required: false },
  ];

  return (
    <motion.div
      key="step6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="p-3 sm:p-8 relative"
    >
      {/* Background Image */}
      <div className="absolute inset-0 opacity-10 z-0">
        <img
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a39ad65_tempImage314gB8.jpg"
          alt="Brandy Melville aesthetic"
          className="w-full h-full object-cover"
        />
      </div>

      <div className="max-w-xl mx-auto relative z-10">
        <div className="text-center mb-6 sm:mb-10">
          <h2 className="text-2xl sm:text-4xl font-semibold text-stone-900 mb-2 sm:mb-3">
            פרטי משלוח
          </h2>
          <p className="text-sm sm:text-base text-stone-600">
            לאן לשלוח את ההזמנה?
          </p>
        </div>

        <div className="bg-white/95 backdrop-blur-sm p-4 sm:p-8 border border-stone-200 rounded-none">
          <form id="customer-form" onSubmit={handleSubmit} className="grid grid-cols-2 gap-x-3 gap-y-4 sm:gap-x-4 sm:gap-y-6">
            {inputFields.map(field => {
                const Icon = field.icon;
                return (
                    <div key={field.id} className={field.width === 'full' ? 'col-span-2' : 'col-span-2 sm:col-span-1'}>
                        <Label className="font-medium text-stone-700 mb-2 flex items-center gap-2 text-sm sm:text-base">
                            <Icon className="w-3 h-3 sm:w-4 sm:h-4 text-stone-500" />
                            {field.label}
                        </Label>
                        {field.component === 'textarea' ? (
                            <Textarea
                                id={field.id}
                                value={formData[field.id]}
                                onChange={(e) => handleChange(field.id, e.target.value)}
                                placeholder={field.placeholder}
                                className="h-20 sm:h-24 border-stone-300 focus:ring-black focus:border-black rounded-none text-sm sm:text-base"
                            />
                        ) : (
                            <Input
                                id={field.id}
                                type={field.type || 'text'}
                                value={formData[field.id]}
                                onChange={(e) => handleChange(field.id, e.target.value)}
                                placeholder={field.placeholder}
                                required={field.required}
                                className="h-10 sm:h-12 border-stone-300 focus:ring-black focus:border-black rounded-none text-sm sm:text-base"
                            />
                        )}
                    </div>
                )
            })}
          </form>
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0 mt-6 sm:mt-8">
          <Button
            type="submit"
            form="customer-form"
            disabled={!isValid}
            className="order-1 sm:order-none h-10 sm:h-12 px-6 sm:px-8 bg-black hover:bg-stone-800 active:bg-stone-700 text-white font-medium transition-all duration-300 flex items-center justify-center gap-2 rounded-none text-sm sm:text-base" 
            onClick={undefined}
          >
            המשך לתשלום
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            onClick={onBack}
            className="order-2 sm:order-none flex items-center justify-center gap-2 h-10 sm:h-12 px-4 sm:px-6 text-stone-600 hover:text-black hover:bg-stone-100 rounded-none text-sm sm:text-base" 
          >
            <ArrowRight className="w-4 h-4" />
            חזור
          </Button>
        </div>
      </div>
    </motion.div>
  );
}