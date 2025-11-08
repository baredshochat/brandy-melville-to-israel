import React, { useState, useEffect, useMemo } from "react";
import { Order } from "@/entities/Order";
import { User } from "@/entities/User";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { 
  TrendingUp, DollarSign, Package, Users, Calendar as CalendarIcon, 
  Download, Filter, BarChart3 
} from "lucide-react";
import { format, subDays, subMonths, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { he } from 'date-fns/locale';
import { motion } from "framer-motion";

// Color palette for charts
const COLORS = ['#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6', '#7c3aed'];

export default function ReportsPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [dateRange, setDateRange] = useState('last30');
  const [customDateFrom, setCustomDateFrom] = useState(null);
  const [customDateTo, setCustomDateTo] = useState(null);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const user = await User.me();
        if (user.role !== 'admin') {
          window.location.href = createPageUrl('Home');
          return;
        }
        setUserRole(user.role);
        loadOrders();
      } catch (error) {
        window.location.href = createPageUrl('Home');
      }
    };
    checkAccess();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await Order.list('-created_date');
      setOrders(data);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter orders by date range
  const filteredOrders = useMemo(() => {
    if (!orders.length) return [];

    let startDate, endDate;
    const now = new Date();

    switch (dateRange) {
      case 'today':
        startDate = startOfDay(now);
        endDate = endOfDay(now);
        break;
      case 'last7':
        startDate = subDays(now, 7);
        endDate = now;
        break;
      case 'last30':
        startDate = subDays(now, 30);
        endDate = now;
        break;
      case 'last3months':
        startDate = subMonths(now, 3);
        endDate = now;
        break;
      case 'custom':
        if (!customDateFrom || !customDateTo) return orders;
        startDate = startOfDay(customDateFrom);
        endDate = endOfDay(customDateTo);
        break;
      default:
        return orders;
    }

    return orders.filter(order => {
      const orderDate = new Date(order.created_date);
      return isWithinInterval(orderDate, { start: startDate, end: endDate });
    });
  }, [orders, dateRange, customDateFrom, customDateTo]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const totalOrders = filteredOrders.length;
    const totalRevenue = filteredOrders.reduce((sum, order) => sum + (order.total_price_ils || 0), 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const uniqueCustomers = new Set(filteredOrders.map(order => order.customer_email)).size;

    return {
      totalOrders,
      totalRevenue,
      averageOrderValue,
      uniqueCustomers
    };
  }, [filteredOrders]);

  // Orders by site data
  const ordersBySite = useMemo(() => {
    const siteMap = {
      'us': 'ארצות הברית',
      'eu': 'אירופה', 
      'uk': 'בריטניה'
    };
    
    const siteCounts = filteredOrders.reduce((acc, order) => {
      const site = order.site || 'unknown';
      acc[site] = (acc[site] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(siteCounts).map(([site, count]) => ({
      name: siteMap[site] || site,
      value: count,
      revenue: filteredOrders
        .filter(order => order.site === site)
        .reduce((sum, order) => sum + (order.total_price_ils || 0), 0)
    }));
  }, [filteredOrders]);

  // Orders by status data
  const ordersByStatus = useMemo(() => {
    const statusMap = {
      'pending': 'ממתין',
      'ordered': 'הוזמן',
      'warehouse': 'במחסן',
      'shipping_to_israel': 'בדרך לישראל',
      'in_israel': 'בארץ',
      'shipping_to_customer': 'בדרך ללקוחה',
      'delivered': 'נמסר'
    };

    const statusCounts = filteredOrders.reduce((acc, order) => {
      const status = order.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(statusCounts).map(([status, count]) => ({
      name: statusMap[status] || status,
      value: count
    }));
  }, [filteredOrders]);

  // Daily orders trend
  const dailyOrdersTrend = useMemo(() => {
    if (!filteredOrders.length) return [];

    const dailyData = {};
    filteredOrders.forEach(order => {
      const date = format(new Date(order.created_date), 'yyyy-MM-dd');
      if (!dailyData[date]) {
        dailyData[date] = { date, orders: 0, revenue: 0 };
      }
      dailyData[date].orders += 1;
      dailyData[date].revenue += order.total_price_ils || 0;
    });

    return Object.values(dailyData)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(item => ({
        ...item,
        dateFormatted: format(new Date(item.date), 'dd/MM', { locale: he })
      }));
  }, [filteredOrders]);

  // Top products
  const topProducts = useMemo(() => {
    const productMap = {};
    
    filteredOrders.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          const key = item.product_name || 'Unknown Product';
          if (!productMap[key]) {
            productMap[key] = { name: key, quantity: 0, revenue: 0 };
          }
          productMap[key].quantity += item.quantity || 0;
          productMap[key].revenue += (item.original_price || 0) * (item.quantity || 0);
        });
      }
    });

    return Object.values(productMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  }, [filteredOrders]);

  // Export to CSV function
  const exportToCSV = () => {
    const headers = [
      'מספר הזמנה', 'תאריך', 'שם לקוח', 'אימייל', 'אתר מקור', 
      'סטטוס', 'סכום (₪)', 'כמות פריטים'
    ];
    
    const csvData = filteredOrders.map(order => [
      order.order_number,
      format(new Date(order.created_date), 'dd/MM/yyyy'),
      order.customer_name,
      order.customer_email,
      order.site,
      order.status,
      order.total_price_ils,
      order.items ? order.items.reduce((sum, item) => sum + (item.quantity || 0), 0) : 0
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `orders_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.click();
  };

  if (userRole !== 'admin') {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-900 mx-auto mb-4"></div>
          <p className="text-stone-600">בודק הרשאות...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold text-stone-900 mb-2 tracking-tight">דוחות ואנליטיקה</h1>
          <p className="text-lg text-stone-600">תובנות עמוקות על ביצועי האפליקציה והלקוחות</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="בחר טווח תאריכים" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">היום</SelectItem>
              <SelectItem value="last7">7 ימים אחרונים</SelectItem>
              <SelectItem value="last30">30 ימים אחרונים</SelectItem>
              <SelectItem value="last3months">3 חודשים אחרונים</SelectItem>
              <SelectItem value="custom">טווח מותאם אישית</SelectItem>
            </SelectContent>
          </Select>

          {dateRange === 'custom' && (
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customDateFrom ? format(customDateFrom, 'dd/MM/yyyy') : 'מתאריך'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={customDateFrom}
                    onSelect={setCustomDateFrom}
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customDateTo ? format(customDateTo, 'dd/MM/yyyy') : 'עד תאריך'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={customDateTo}
                    onSelect={setCustomDateTo}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          <Button onClick={exportToCSV} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            ייצא ל-CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">סך הזמנות</p>
                <p className="text-3xl font-bold">{kpis.totalOrders}</p>
              </div>
              <Package className="w-8 h-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">סך הכנסות</p>
                <p className="text-3xl font-bold">₪{kpis.totalRevenue.toLocaleString()}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">ממוצע הזמנה</p>
                <p className="text-3xl font-bold">₪{Math.round(kpis.averageOrderValue)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-rose-500 to-rose-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-rose-100 text-sm">לקוחות ייחודיים</p>
                <p className="text-3xl font-bold">{kpis.uniqueCustomers}</p>
              </div>
              <Users className="w-8 h-8 text-rose-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Daily Orders Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              מגמת הזמנות יומית
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyOrdersTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dateFormatted" />
                <YAxis />
                <Tooltip 
                  labelFormatter={(label) => `תאריך: ${label}`}
                  formatter={(value, name) => [
                    value, 
                    name === 'orders' ? 'הזמנות' : 'הכנסות (₪)'
                  ]}
                />
                <Legend />
                <Line type="monotone" dataKey="orders" stroke="#f43f5e" name="הזמנות" />
                <Line type="monotone" dataKey="revenue" stroke="#8b5cf6" name="הכנסות" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Orders by Site */}
        <Card>
          <CardHeader>
            <CardTitle>חלוקה לפי אתר מקור</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={ordersBySite}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {ordersBySite.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Orders by Status */}
        <Card>
          <CardHeader>
            <CardTitle>התפלגות סטטוס הזמנות</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ordersByStatus}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#f43f5e" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>המוצרים הנמכרים ביותר</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-72 overflow-y-auto">
              {topProducts.map((product, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-stone-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-900 truncate">{product.name}</p>
                    <p className="text-xs text-stone-500">כמות: {product.quantity}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-stone-900">₪{Math.round(product.revenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue by Site Table */}
      <Card>
        <CardHeader>
          <CardTitle>פירוט הכנסות לפי אתר</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-right p-2">אתר</th>
                  <th className="text-right p-2">מספר הזמנות</th>
                  <th className="text-right p-2">סך הכנסות (₪)</th>
                  <th className="text-right p-2">ממוצע הזמנה (₪)</th>
                </tr>
              </thead>
              <tbody>
                {ordersBySite.map((site, index) => (
                  <tr key={index} className="border-b hover:bg-stone-50">
                    <td className="p-2 font-medium">{site.name}</td>
                    <td className="p-2">{site.value}</td>
                    <td className="p-2">₪{site.revenue.toLocaleString()}</td>
                    <td className="p-2">₪{Math.round(site.revenue / site.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}