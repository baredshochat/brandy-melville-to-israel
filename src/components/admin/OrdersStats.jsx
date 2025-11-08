
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Package, DollarSign, Clock, CheckCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function OrdersStats({ orders, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array(4).fill(0).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-none" />
        ))}
      </div>
    );
  }

  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, order) => sum + (order.total_price_ils || 0), 0);
  const pendingOrders = orders.filter(order => order.status === 'pending').length;
  const completedOrders = orders.filter(order => order.status === 'delivered').length;

  const stats = [
    { title: "Total Orders", value: totalOrders, icon: Package },
    { title: "Total Revenue", value: `₪${totalRevenue.toLocaleString()}`, icon: DollarSign },
    { title: "Pending Orders", value: pendingOrders, icon: Clock },
    { title: "Completed", value: completedOrders, icon: CheckCircle }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <Card key={index} className="border-stone-200/80 shadow-lg bg-white rounded-none">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-stone-600 mb-1">{stat.title}</p>
                <p className="text-3xl font-bold text-stone-900">{stat.value}</p>
              </div>
              <div className="p-4 bg-stone-100">
                <stat.icon className="w-6 h-6 text-stone-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
