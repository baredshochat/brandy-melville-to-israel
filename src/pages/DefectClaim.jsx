import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Upload, X, CheckCircle, Camera, Package } from "lucide-react";
import { motion } from 'framer-motion';
import { Order } from "@/entities/Order";
import { Ticket } from "@/entities/Ticket";
import { User } from "@/entities/User";
import { UploadFile } from "@/integrations/Core";

const DEFECT_REPORT_WINDOW_DAYS = 7;

export default function DefectClaim() {
    const [orderNumber, setOrderNumber] = useState('');
    const [description, setDescription] = useState('');
    const [photos, setPhotos] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [user, setUser] = useState(null);

    useEffect(() => {
        User.me().then(setUser).catch(() => setError("יש להתחבר כדי לדווח על פגם."));
    }, []);

    const handlePhotoUpload = async (e) => {
        if (photos.length >= 3) {
            setError("ניתן להעלות עד 3 תמונות.");
            return;
        }
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            const { file_url } = await UploadFile({ file });
            setPhotos(prev => [...prev, file_url]);
        } catch (err) {
            setError("שגיאה בהעלאת התמונה.");
        } finally {
            setUploading(false);
        }
    };

    const removePhoto = (index) => {
        setPhotos(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!user) {
            setError("יש להתחבר למערכת.");
            return;
        }

        try {
            const orders = await Order.filter({ order_number: orderNumber, customer_email: user.email });
            if (orders.length === 0) {
                setError("מספר הזמנה לא נמצא או לא שייך לך.");
                return;
            }
            const order = orders[0];

            await Ticket.create({
                customer_email: user.email,
                order_id: order.id,
                order_number: order.order_number,
                type: 'defect',
                description: description,
                photos: photos,
            });

            setSuccess(true);
        } catch (err) {
            setError("אירעה שגיאה בשליחת הדיווח.");
        }
    };
    
    if (success) {
        return (
            <div className="text-center p-8 max-w-lg mx-auto">
                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                    <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-semibold text-stone-800 mb-2">הדיווח התקבל! ✨</h2>
                    <p className="text-stone-600">קיבלנו את פנייתך ונבדוק אותה. במידה והכל תקין, יוענק לך זיכוי אוטומטי להזמנה הבאה.</p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto py-8 px-4">
            <Card className="bg-white/95 backdrop-blur-sm border-rose-200/50 shadow-lg">
                <CardHeader className="text-center">
                    <div className="mx-auto w-12 h-12 bg-rose-100 flex items-center justify-center mb-3">
                        <Package className="w-7 h-7 text-rose-500" />
                    </div>
                    <CardTitle className="text-2xl font-semibold">דיווח על פגם או פריט שגוי</CardTitle>
                    <p className="text-stone-600 text-sm">ניתן לדווח עד {DEFECT_REPORT_WINDOW_DAYS} ימים מקבלת המשלוח.</p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <Label htmlFor="orderNumber">מספר הזמנה</Label>
                            <Input id="orderNumber" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} required />
                        </div>
                        <div>
                            <Label htmlFor="description">תיאור הבעיה</Label>
                            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} required />
                        </div>
                        <div>
                            <Label>תמונות (עד 3)</Label>
                            <div className="grid grid-cols-3 gap-2 mt-2">
                                {photos.map((photo, index) => (
                                    <div key={index} className="relative">
                                        <img src={photo} alt={`Photo ${index + 1}`} className="w-full h-24 object-cover" />
                                        <Button size="icon" variant="destructive" className="absolute top-1 right-1 h-6 w-6" onClick={() => removePhoto(index)}>
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                                {photos.length < 3 && (
                                    <Label htmlFor="photo-upload" className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-stone-300 cursor-pointer hover:bg-stone-50">
                                        {uploading ? <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-rose-500"></div> : <Camera className="w-6 h-6 text-stone-400" />}
                                    </Label>
                                )}
                            </div>
                            <input id="photo-upload" type="file" className="hidden" onChange={handlePhotoUpload} accept="image/*" />
                        </div>
                        {error && <p className="text-red-500 text-sm">{error}</p>}
                        <Button type="submit" className="w-full bg-rose-500 hover:bg-rose-600 text-white" disabled={uploading}>
                            {uploading ? "מעלה תמונה..." : "שליחת דיווח"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}