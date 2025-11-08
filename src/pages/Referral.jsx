import React, { useState, useEffect } from "react";
import { Referral } from "@/entities/Referral";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createPageUrl } from "@/utils";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Gift, Users, Copy, Share2, Heart, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

const REWARD_POINTS_EACH = 50;

export default function ReferralPage() {
    const [user, setUser] = useState(null);
    const [referralLink, setReferralLink] = useState('');
    const [referrals, setReferrals] = useState([]);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            try {
                const currentUser = await User.me();
                setUser(currentUser);
                if (currentUser.referral_code) {
                    const baseUrl = window.location.origin;
                    setReferralLink(`${baseUrl}${createPageUrl('Home')}?ref=${currentUser.referral_code}`);
                    
                    // Fetch completed referrals
                    const completedReferrals = await Referral.filter({ referrer_email: currentUser.email, status: 'completed' });
                    setReferrals(completedReferrals);
                }
            } catch (error) {
                console.error("Error loading referral data:", error);
            }
        };
        loadData();
    }, []);

    const handleCopy = () => {
        navigator.clipboard.writeText(referralLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!user) {
        return (
            <div className="text-center py-12">
                <Gift className="w-16 h-16 mx-auto text-rose-300 mb-4" />
                <h2 className="text-2xl font-semibold text-stone-800 mb-4">חברה מביאה חברה</h2>
                <p className="text-stone-600 mb-6">התחברי כדי לשתף ולהרוויח נקודות.</p>
                <Button onClick={() => User.login()} className="bg-rose-500 hover:bg-rose-600 text-white">
                  התחברי
                </Button>
            </div>
        );
    }
    
    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="mx-auto w-16 h-16 bg-rose-100 flex items-center justify-center mb-4">
                        <Gift className="w-10 h-10 text-rose-500" />
                    </div>
                    <h1 className="text-4xl font-light text-stone-800 mb-2">חברה מביאה חברה</h1>
                    <p className="text-lg text-stone-600 max-w-2xl mx-auto">
                        הזמיני חברות, ועל כל חברה שתבצע הזמנה ראשונה - שתיכן תקבלו {REWARD_POINTS_EACH} נקודות מתנה!
                    </p>
                </div>

                {/* Referral Link Card */}
                <Card className="mb-8 bg-white/80 backdrop-blur-sm border-rose-200/50 shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <Share2 className="w-5 h-5 text-stone-600" />
                            הלינק האישי שלך
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <Input value={referralLink} readOnly className="flex-grow bg-stone-50 ltr text-left" />
                            <Button onClick={handleCopy} className="bg-stone-800 hover:bg-stone-900 text-white">
                                {copied ? <CheckCircle className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                                {copied ? "הועתק!" : "העתיקי לינק"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Referrals History */}
                <Card className="bg-white/80 backdrop-blur-sm border-stone-200/50 shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <Users className="w-5 h-5 text-stone-600" />
                            ההפניות המוצלחות שלך
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {referrals.length > 0 ? (
                            <div className="space-y-3">
                                {referrals.map(ref => (
                                    <div key={ref.id} className="flex justify-between items-center p-3 bg-stone-50 border border-stone-200">
                                        <div>
                                            <p className="font-medium text-stone-800">חברה הצטרפה!</p>
                                            <p className="text-sm text-stone-500">
                                                בזכותך, חברה חדשה הצטרפה ב-{format(new Date(ref.updated_date), "d MMM, yyyy")}
                                            </p>
                                        </div>
                                        <Badge className="bg-green-100 text-green-800">
                                            +{REWARD_POINTS_EACH} נקודות
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <Heart className="w-12 h-12 mx-auto text-stone-300 mb-3" />
                                <p className="text-stone-500">עדיין אין לך הפניות מוצלחות.</p>
                                <p className="text-sm text-stone-400 mt-1">התחילי לשתף את הלינק שלך!</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

            </motion.div>
        </div>
    );
}