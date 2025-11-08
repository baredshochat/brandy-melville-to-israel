import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function MyOrders() {
  return (
    <div className="p-4 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle>ההזמנות שלי</CardTitle>
        </CardHeader>
        <CardContent>
          <p>כאן יוצגו כל ההזמנות שלך.</p>
        </CardContent>
      </Card>
    </div>
  );
}