import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // This function should be called periodically (e.g., via cron job)
    // It updates items whose scheduled availability date has passed
    
    const now = new Date().toISOString();
    
    // Get all items with available_from set
    const allItems = await base44.asServiceRole.entities.LocalStockItem.list();
    
    let updatedCount = 0;
    
    for (const item of allItems) {
      if (item.available_from) {
        const availableFrom = new Date(item.available_from);
        const nowDate = new Date(now);
        
        // If the scheduled date has passed and item is not yet available
        if (availableFrom <= nowDate && !item.is_available) {
          await base44.asServiceRole.entities.LocalStockItem.update(item.id, {
            is_available: true
          });
          updatedCount++;
        }
      }
    }
    
    return Response.json({ 
      success: true,
      updated: updatedCount,
      message: `${updatedCount} items were made available`
    });
    
  } catch (error) {
    console.error('Error updating scheduled items:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});