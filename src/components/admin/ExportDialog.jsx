import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileSpreadsheet, Loader2 } from "lucide-react";
import { format } from "date-fns";

export default function ExportDialog({ orders }) {
  const [site, setSite] = useState('all');
  const [isExporting, setIsExporting] = useState(false);

  const exportOrders = async () => {
    setIsExporting(true);
    
    try {
      let filteredOrders = orders;
      if (site !== 'all') {
        filteredOrders = orders.filter(order => order.site === site);
      }

      if (filteredOrders.length === 0) {
        alert("No orders to export for the selected site.");
        setIsExporting(false);
        return;
      }

      const csvData = filteredOrders.flatMap(order => 
        order.items.map(item => ({
          'מספר הזמנה': order.order_number,
          'אתר': order.site === 'us' ? 'ארה״ב' : order.site === 'eu' ? 'אירופה' : order.site === 'uk' ? 'בריטניה' : 'מלאי מקומי',
          'שם מוצר': item.product_name,
          'מק״ט': item.product_sku,
          'צבע': item.color,
          'מידה': item.size,
          'כמות': item.quantity,
          'מחיר מקורי': item.original_price,
          'מטבע': item.original_currency,
          'מחיר סופי בש״ח': order.total_price_ils,
          'שם לקוח': order.customer_name,
          'אימייל': order.customer_email,
          'טלפון': order.customer_phone,
          'כתובת': order.shipping_address,
          'עיר': order.city,
          'מיקוד': order.postal_code,
          'סטטוס': order.status,
          'תאריך הזמנה': format(new Date(order.created_date), 'dd/MM/yyyy HH:mm'),
          'קישור מוצר': item.product_url
        }))
      );

      const headers = Object.keys(csvData[0]);
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => headers.map(header => `"${(row[header] || '').toString().replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      
      const siteName = site === 'all' ? 'כל_האתרים' : 
                     site === 'us' ? 'ארהב' : 
                     site === 'eu' ? 'אירופה' : 'בריטניה';
      const fileName = `הזמנות_${siteName}_${format(new Date(), 'dd-MM-yyyy')}.csv`;
      
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting orders:', error);
      alert('An error occurred during export.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2 h-10 border-stone-300 rounded-none">
          <Download className="w-4 h-4" />
          Export Report
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-none">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Export Orders Report
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 pt-4">
          <div>
            <label className="block text-sm font-medium mb-2">Select site to export:</label>
            <Select value={site} onValueChange={setSite}>
              <SelectTrigger className="h-12 border-stone-300 rounded-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sites</SelectItem>
                <SelectItem value="us">🇺🇸 USA</SelectItem>
                <SelectItem value="eu">🇪🇺 Europe</SelectItem>
                <SelectItem value="uk">🇬🇧 UK</SelectItem>
                <SelectItem value="local">🇮🇱 מלאי מקומי</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-stone-100 p-4 border border-stone-200 rounded-none">
            <p className="text-sm text-stone-700">
              The report will include all order details: products, customers, prices, and statuses.
            </p>
          </div>

          <Button
            onClick={exportOrders}
            disabled={isExporting}
            className="w-full h-12 bg-black hover:bg-stone-800 text-white font-semibold rounded-none"
          >
            {isExporting ? <><Loader2 className="w-4 h-4 animate-spin mr-2"/> Exporting...</> : 'Export CSV File'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}