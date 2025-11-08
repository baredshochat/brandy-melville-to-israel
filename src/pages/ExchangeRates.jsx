import React, { useState, useEffect } from "react";
import { Rates } from "@/entities/Rates";
import { User } from "@/entities/User";
import { InvokeLLM } from "@/integrations/Core";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, RefreshCw, DollarSign, Euro, PoundSterling, TrendingUp, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { createPageUrl } from "@/utils";

export default function ExchangeRates() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentRates, setCurrentRates] = useState(null);
  const [manualRates, setManualRates] = useState({ usd: '', eur: '', gbp: '' });
  const [lastUpdate, setLastUpdate] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const init = async () => {
      try {
        const userData = await User.me();
        if (userData.role !== 'admin') {
          window.location.href = createPageUrl('Home');
          return;
        }
        setUser(userData);
        await loadCurrentRates();
      } catch (error) {
        console.error("Error loading user:", error);
        window.location.href = createPageUrl('Home');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const loadCurrentRates = async () => {
    try {
      const ratesList = await Rates.list();
      if (ratesList && ratesList.length > 0) {
        const latest = ratesList[0];
        setCurrentRates(latest);
        setManualRates({
          usd: latest.usd?.toString() || '',
          eur: latest.eur?.toString() || '',
          gbp: latest.gbp?.toString() || ''
        });
        setLastUpdate(latest.updated_date || latest.created_date);
      }
    } catch (error) {
      console.error("Error loading rates:", error);
    }
  };

  const fetchLiveRates = async () => {
    setFetching(true);
    setError('');
    setSuccess('');

    try {
      // Use LLM with internet context to fetch real-time exchange rates
      const response = await InvokeLLM({
        prompt: `What are the current exchange rates for converting to Israeli Shekel (ILS)?
        
Please provide the latest exchange rates from Bank of Israel or reliable financial sources for:
- USD to ILS (US Dollar to Israeli Shekel)
- EUR to ILS (Euro to Israeli Shekel)  
- GBP to ILS (British Pound to Israeli Shekel)

Return ONLY the numeric rates, formatted as JSON with 4 decimal places.
Example format: {"usd": 3.6500, "eur": 3.9800, "gbp": 4.6200}

Make sure the rates are current (today's rates) and from a reliable source like Bank of Israel, xe.com, or similar financial data provider.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            usd: { type: "number" },
            eur: { type: "number" },
            gbp: { type: "number" }
          },
          required: ["usd", "eur", "gbp"]
        }
      });

      // Normalize response
      let rates = response;
      if (typeof Response !== 'undefined' && response instanceof Response) {
        rates = await response.json();
      } else if (response && response.data) {
        rates = response.data;
      }

      // Validate rates
      if (!rates || typeof rates.usd !== 'number' || typeof rates.eur !== 'number' || typeof rates.gbp !== 'number') {
        throw new Error('Invalid rates format received');
      }

      // Save to database
      await Rates.create({
        usd: rates.usd,
        eur: rates.eur,
        gbp: rates.gbp
      });

      // Update UI
      setManualRates({
        usd: rates.usd.toString(),
        eur: rates.eur.toString(),
        gbp: rates.gbp.toString()
      });
      
      await loadCurrentRates();
      setSuccess('שערי החליפין עודכנו בהצלחה מהאינטרנט! ✅');

    } catch (error) {
      console.error("Error fetching live rates:", error);
      setError('שגיאה בשליפת שערים מהאינטרנט. נסה שוב או הזן ידנית.');
    } finally {
      setFetching(false);
    }
  };

  const saveManualRates = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const usd = parseFloat(manualRates.usd);
      const eur = parseFloat(manualRates.eur);
      const gbp = parseFloat(manualRates.gbp);

      if (isNaN(usd) || isNaN(eur) || isNaN(gbp) || usd <= 0 || eur <= 0 || gbp <= 0) {
        throw new Error('יש להזין שערים חוקיים (מספרים חיוביים)');
      }

      await Rates.create({ usd, eur, gbp });
      await loadCurrentRates();
      setSuccess('שערי החליפין נשמרו בהצלחה! ✅');

    } catch (error) {
      console.error("Error saving manual rates:", error);
      setError(error.message || 'שגיאה בשמירת השערים');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-stone-900 mb-2">ניהול שערי חליפין</h1>
          <p className="text-stone-600">עדכון שערי מטבע בזמן אמת לחישוב מחירים מדויק</p>
        </div>

        {/* Current Rates Display */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              שערי חליפין נוכחיים
            </CardTitle>
            {lastUpdate && (
              <CardDescription className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                עדכון אחרון: {format(new Date(lastUpdate), "d בMMMM yyyy, HH:mm", { locale: he })}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold text-stone-700">USD → ILS</span>
                </div>
                <p className="text-2xl font-bold text-blue-600">
                  ₪{currentRates?.usd?.toFixed(4) || '---'}
                </p>
              </div>

              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Euro className="w-5 h-5 text-purple-600" />
                  <span className="font-semibold text-stone-700">EUR → ILS</span>
                </div>
                <p className="text-2xl font-bold text-purple-600">
                  ₪{currentRates?.eur?.toFixed(4) || '---'}
                </p>
              </div>

              <div className="p-4 bg-pink-50 border border-pink-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <PoundSterling className="w-5 h-5 text-pink-600" />
                  <span className="font-semibold text-stone-700">GBP → ILS</span>
                </div>
                <p className="text-2xl font-bold text-pink-600">
                  ₪{currentRates?.gbp?.toFixed(4) || '---'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Auto Update Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-rose-600" />
              עדכון אוטומטי מהאינטרנט
            </CardTitle>
            <CardDescription>
              שליפת שערי חליפין עדכניים מבנק ישראל ומקורות פיננסיים מהימנים
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={fetchLiveRates}
              disabled={fetching}
              className="w-full h-12 bg-rose-500 hover:bg-rose-600 text-white font-medium"
            >
              {fetching ? (
                <>
                  <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                  מושך שערים מהאינטרנט...
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5 ml-2" />
                  עדכן שערים אוטומטית
                </>
              )}
            </Button>
            <p className="text-xs text-stone-500 text-center mt-3">
              השערים יישלפו מבנק ישראל או מקורות פיננסיים מהימנים בזמן אמת
            </p>
          </CardContent>
        </Card>

        {/* Manual Update Section */}
        <Card>
          <CardHeader>
            <CardTitle>עדכון ידני</CardTitle>
            <CardDescription>הזן שערי חליפין באופן ידני במידת הצורך</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-blue-600" />
                  USD → ILS (דולר לשקל)
                </Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={manualRates.usd}
                  onChange={(e) => setManualRates(prev => ({ ...prev, usd: e.target.value }))}
                  placeholder="3.6500"
                  className="font-mono"
                />
              </div>

              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <Euro className="w-4 h-4 text-purple-600" />
                  EUR → ILS (יורו לשקל)
                </Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={manualRates.eur}
                  onChange={(e) => setManualRates(prev => ({ ...prev, eur: e.target.value }))}
                  placeholder="3.9800"
                  className="font-mono"
                />
              </div>

              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <PoundSterling className="w-4 h-4 text-pink-600" />
                  GBP → ILS (לירה לשקל)
                </Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={manualRates.gbp}
                  onChange={(e) => setManualRates(prev => ({ ...prev, gbp: e.target.value }))}
                  placeholder="4.6200"
                  className="font-mono"
                />
              </div>

              <Button
                onClick={saveManualRates}
                disabled={saving}
                className="w-full h-12 bg-stone-800 hover:bg-stone-900 text-white"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                    שומר...
                  </>
                ) : (
                  'שמור שערים ידניים'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Success/Error Messages */}
        {success && (
          <Alert className="mt-6 bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert className="mt-6 bg-red-50 border-red-200">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {/* Info Section */}
        <Card className="mt-6 bg-stone-50">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-3">💡 טיפים לשימוש:</h3>
            <ul className="space-y-2 text-sm text-stone-600">
              <li>• <strong>עדכון אוטומטי:</strong> מומלץ לעדכן את השערים פעם ביום או לפני חישוב מחירים חשוב</li>
              <li>• <strong>מקורות:</strong> השערים נשלפים מבנק ישראל או מקורות פיננסיים מהימנים</li>
              <li>• <strong>עדכון ידני:</strong> במקרה שהעדכון האוטומטי נכשל, ניתן להזין שערים ידנית מאתר בנק ישראל</li>
              <li>• <strong>דיוק:</strong> השערים מדויקים עד 4 ספרות אחרי הנקודה העשרונית</li>
              <li>• <strong>שימוש:</strong> השערים משמשים לחישוב מחירים אוטומטי בכל ההזמנות החדשות</li>
            </ul>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}