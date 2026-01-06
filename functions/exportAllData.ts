import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Helper function to escape CSV values
function escapeCSV(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Helper function to format date
function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toISOString().replace('T', ' ').substring(0, 19);
  } catch {
    return '';
  }
}

// Helper function to format date only (YYYY-MM-DD)
function formatDateOnly(dateStr) {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toISOString().substring(0, 10);
  } catch {
    return '';
  }
}

// Generate orders.csv
function generateOrdersCSV(orders) {
  const headers = [
    'order_id',
    'customer_email',
    'status',
    'total_amount',
    'shipping_address',
    'shipping_city',
    'shipping_phone',
    'notes',
    'coupon_code',
    'discount_amount',
    'tracking_number',
    'created_at'
  ];
  
  let csv = headers.join(',') + '\n';
  
  orders.forEach(order => {
    // Extract coupon code from items if exists
    const couponCode = order.items?.[0]?.coupon_code || '';
    
    // Extract discount from price_breakdown
    const discountAmount = order.price_breakdown?.discount || 0;
    
    // Extract tracking number from first item (if exists)
    const trackingNumber = order.items?.[0]?.tracking_number || '';
    
    const row = [
      escapeCSV(order.order_number || order.id),
      escapeCSV(order.customer_email),
      escapeCSV(order.status),
      escapeCSV(order.total_price_ils || 0),
      escapeCSV(order.shipping_address),
      escapeCSV(order.city),
      escapeCSV(order.customer_phone),
      escapeCSV(order.notes || order.internal_notes),
      escapeCSV(couponCode),
      escapeCSV(discountAmount),
      escapeCSV(trackingNumber),
      escapeCSV(formatDate(order.created_date))
    ];
    
    csv += row.join(',') + '\n';
  });
  
  return csv;
}

// Generate order_items.csv
function generateOrderItemsCSV(orders) {
  const headers = [
    'order_id',
    'product_name',
    'product_image',
    'quantity',
    'size',
    'color',
    'price'
  ];
  
  let csv = headers.join(',') + '\n';
  
  orders.forEach(order => {
    const orderId = order.order_number || order.id;
    const items = order.items || [];
    
    items.forEach(item => {
      const row = [
        escapeCSV(orderId),
        escapeCSV(item.product_name),
        escapeCSV(item.item_image_url || item.product_url),
        escapeCSV(item.quantity || 1),
        escapeCSV(item.size),
        escapeCSV(item.color),
        escapeCSV(item.customer_price_ils || item.original_price || 0)
      ];
      
      csv += row.join(',') + '\n';
    });
  });
  
  return csv;
}

// Generate customers.csv
function generateCustomersCSV(users, orders) {
  const headers = [
    'email',
    'full_name',
    'phone',
    'address',
    'city',
    'created_at'
  ];
  
  let csv = headers.join(',') + '\n';
  
  // Create a map of customer data from orders
  const customerMap = new Map();
  
  orders.forEach(order => {
    if (order.customer_email && !customerMap.has(order.customer_email)) {
      customerMap.set(order.customer_email, {
        email: order.customer_email,
        name: order.customer_name,
        phone: order.customer_phone,
        address: order.shipping_address,
        city: order.city,
        created_at: order.created_date
      });
    }
  });
  
  // Add registered users
  users.forEach(user => {
    const existing = customerMap.get(user.email);
    if (!existing) {
      customerMap.set(user.email, {
        email: user.email,
        name: user.full_name,
        phone: '',
        address: '',
        city: '',
        created_at: user.created_date
      });
    } else {
      // Update name from user record
      existing.name = user.full_name || existing.name;
    }
  });
  
  // Convert to CSV
  customerMap.forEach(customer => {
    const row = [
      escapeCSV(customer.email),
      escapeCSV(customer.name),
      escapeCSV(customer.phone),
      escapeCSV(customer.address),
      escapeCSV(customer.city),
      escapeCSV(formatDate(customer.created_at))
    ];
    
    csv += row.join(',') + '\n';
  });
  
  return csv;
}

// Generate products.csv
function generateProductsCSV(products) {
  const headers = [
    'name',
    'name_he',
    'description',
    'description_he',
    'price',
    'original_price',
    'category',
    'image_url',
    'images',
    'sizes',
    'colors',
    'is_local_stock',
    'stock_quantity',
    'is_active'
  ];
  
  let csv = headers.join(',') + '\n';
  
  products.forEach(product => {
    const additionalImages = (product.additional_images || []).join(';');
    
    const row = [
      escapeCSV(product.product_name),
      escapeCSV(product.product_name), // Same as English for now
      escapeCSV(product.product_description),
      escapeCSV(product.product_description), // Same as English for now
      escapeCSV(product.price_ils),
      escapeCSV(''), // No original_price field
      escapeCSV(product.category),
      escapeCSV(product.image_url),
      escapeCSV(additionalImages),
      escapeCSV(product.size),
      escapeCSV(product.color),
      escapeCSV('true'), // All LocalStockItem are local
      escapeCSV(product.quantity_available || 0),
      escapeCSV(product.is_available ? 'true' : 'false')
    ];
    
    csv += row.join(',') + '\n';
  });
  
  return csv;
}

// Generate income.csv
function generateIncomeCSV(orders) {
  const headers = [
    'order_id',
    'amount',
    'description',
    'date'
  ];
  
  let csv = headers.join(',') + '\n';
  
  orders.forEach(order => {
    // Only include completed/paid orders
    if (order.payment_status === 'completed') {
      const row = [
        escapeCSV(order.order_number || order.id),
        escapeCSV(order.total_price_ils || 0),
        escapeCSV(`הזמנה #${order.order_number || order.id}`),
        escapeCSV(formatDateOnly(order.created_date))
      ];
      
      csv += row.join(',') + '\n';
    }
  });
  
  return csv;
}

// Generate expenses.csv
function generateExpensesCSV(expenses) {
  const headers = [
    'category',
    'amount',
    'description',
    'date',
    'receipt_url'
  ];
  
  let csv = headers.join(',') + '\n';
  
  expenses.forEach(expense => {
    const row = [
      escapeCSV(expense.category || 'other'),
      escapeCSV(expense.amount || 0),
      escapeCSV(expense.description),
      escapeCSV(formatDateOnly(expense.date || expense.created_date)),
      escapeCSV(expense.receipt_url || '')
    ];
    
    csv += row.join(',') + '\n';
  });
  
  return csv;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Check if user is admin
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }
    
    // Fetch all data
    console.log('Fetching orders...');
    const orders = await base44.asServiceRole.entities.Order.list();
    
    console.log('Fetching users...');
    const users = await base44.asServiceRole.entities.User.list();
    
    console.log('Fetching products...');
    const products = await base44.asServiceRole.entities.LocalStockItem.list();
    
    console.log('Fetching expenses...');
    let expenses = [];
    try {
      expenses = await base44.asServiceRole.entities.MonthlyExpense.list();
    } catch (e) {
      console.log('MonthlyExpense entity not found or empty:', e.message);
    }
    
    // Generate CSV files
    console.log('Generating CSV files...');
    const csvFiles = {
      'orders.csv': generateOrdersCSV(orders),
      'order_items.csv': generateOrderItemsCSV(orders),
      'customers.csv': generateCustomersCSV(users, orders),
      'products.csv': generateProductsCSV(products),
      'income.csv': generateIncomeCSV(orders),
      'expenses.csv': generateExpensesCSV(expenses)
    };
    
    // Return as JSON with all CSV files
    return Response.json({
      success: true,
      message: 'Export completed successfully',
      files: csvFiles,
      stats: {
        orders: orders.length,
        users: users.length,
        products: products.length,
        expenses: expenses.length
      }
    }, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      }
    });
    
  } catch (error) {
    console.error('Export error:', error);
    return Response.json({ 
      error: 'Export failed', 
      details: error.message 
    }, { status: 500 });
  }
});