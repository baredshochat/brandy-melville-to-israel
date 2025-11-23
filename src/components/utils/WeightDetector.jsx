/**
 * Weight Detection Logic for Brandy Melville Products
 * Based on product name keywords - returns weight in KG
 */

export function detectItemWeight(productName) {
  if (!productName) return 0.11; // Default 110g
  
  const name = productName.toLowerCase();
  let weight = null;

  // === OVERWRITES (Highest Priority) ===
  if (name.includes('hoodie') || name.includes('crewneck') || name.includes('sweatshirt') || 
      name.includes('zip') || name.includes('fleece')) {
    weight = 1.0; // 1000g
  }
  // Cardigan first (more specific than sweater)
  else if (name.includes('cardigan') || name.includes('ribbed cardigan') || 
           name.includes('open knit') || name.includes('light knit')) {
    weight = 0.55; // 550g
  }
  // Sweaters (heavier)
  else if (name.includes('sweater') || name.includes('heavy knit') || name.includes('chunky') || 
           name.includes('thick knit') || name.includes('cable knit') || name.includes('cable')) {
    weight = 0.8; // 800g
  }
  // Regular knitted items
  else if (name.includes('knit') || name.includes('knitted')) {
    weight = 0.8; // 800g
  }
  
  // === TOPS ===
  else if (name.includes('tank') || name.includes('tube') || name.includes('halter') || 
           name.includes('spaghetti')) {
    weight = 0.09; // 90g
  }
  else if (name.includes('long sleeve') || name.includes('henley')) {
    weight = 0.16; // 160g
  }
  else if (name.includes('tee') || name.includes('t-shirt') || name.includes('t shirt') || 
           name.includes('baby tee') || name.includes('short sleeve')) {
    weight = 0.11; // 110g
  }
  
  // === PANTS & BOTTOMS ===
  else if (name.includes('denim') || name.includes('jean')) {
    weight = 0.65; // 650g
  }
  else if (name.includes('jogger') || name.includes('sweatpant') || name.includes('sweat pant')) {
    weight = 0.42; // 420g
  }
  else if (name.includes('pant') || name.includes('trouser') || name.includes('trousers') || 
           name.includes('woven pant') || name.includes('flowy pant')) {
    weight = 0.32; // 320g
  }
  else if (name.includes('short') || name.includes('shorts')) {
    weight = 0.14; // 140g
  }
  
  // === SKIRTS ===
  else if (name.includes('mini skirt')) {
    weight = 0.19; // 190g
  }
  else if (name.includes('midi skirt')) {
    weight = 0.23; // 230g
  }
  else if (name.includes('skirt')) {
    weight = 0.19; // 190g - default mini
  }
  
  // === DRESSES ===
  else if (name.includes('knit dress') || name.includes('sweater dress')) {
    weight = 0.35; // 350g
  }
  else if (name.includes('mini dress')) {
    weight = 0.20; // 200g
  }
  else if (name.includes('midi dress')) {
    weight = 0.24; // 240g
  }
  else if (name.includes('dress')) {
    weight = 0.20; // 200g - default mini
  }
  
  // === ACTIVE ===
  else if (name.includes('sports bra') || name.includes('active top')) {
    weight = 0.12; // 120g
  }
  else if (name.includes('legging') || name.includes('leggings') || name.includes('yoga') || 
           name.includes('active bottom')) {
    weight = 0.26; // 260g
  }
  
  // === JEWELRY ===
  else if (name.includes('necklace') || name.includes('pendant')) {
    weight = 0.02; // 20g
  }
  else if (name.includes('bracelet')) {
    weight = 0.015; // 15g
  }
  else if (name.includes('earring')) {
    weight = 0.015; // 15g
  }
  else if (name.includes('ring')) {
    weight = 0.01; // 10g
  }
  else if (name.includes('silver') || name.includes('925')) {
    weight = 0.015; // 15g
  }
  
  // === BAGS & ACCESSORIES ===
  else if (name.includes('duffel')) {
    weight = 0.52; // 520g
  }
  else if (name.includes('backpack')) {
    weight = 0.42; // 420g
  }
  else if (name.includes('bag') || name.includes('shoulder bag')) {
    weight = 0.26; // 260g
  }
  else if (name.includes('pouch') || name.includes('purse')) {
    weight = 0.12; // 120g
  }
  else if (name.includes('belt')) {
    weight = 0.14; // 140g
  }
  else if (name.includes('sock')) {
    weight = 0.05; // 50g
  }
  else if (name.includes('scarf')) {
    weight = 0.18; // 180g
  }
  else if (name.includes('beanie')) {
    weight = 0.12; // 120g
  }
  else if (name.includes('hat') || name.includes('cap')) {
    weight = 0.09; // 90g
  }
  
  // === DEFAULT ===
  else {
    weight = 0.11; // 110g default top
  }

  // === ADJUSTMENTS ===
  if (name.includes('oversized')) {
    weight = weight * 1.15;
  }
  if (name.includes('puffer')) {
    weight = weight * 1.20;
  }

  return weight;
}

/**
 * Get weight category name for display purposes
 */
export function getWeightCategory(productName) {
  if (!productName) return 'Default Top';
  
  const name = productName.toLowerCase();
  
  if (name.includes('hoodie') || name.includes('sweatshirt')) return 'Sweatshirt';
  if (name.includes('sweater') || name.includes('cardigan')) return 'Sweater';
  if (name.includes('tank') || name.includes('halter')) return 'Tank/Tube';
  if (name.includes('long sleeve')) return 'Long Sleeve Top';
  if (name.includes('tee') || name.includes('t-shirt')) return 'Short Sleeve Top';
  if (name.includes('denim') || name.includes('jean')) return 'Jeans';
  if (name.includes('sweatpant')) return 'Sweatpants';
  if (name.includes('pant')) return 'Pants';
  if (name.includes('short')) return 'Shorts';
  if (name.includes('skirt')) return 'Skirt';
  if (name.includes('dress')) return 'Dress';
  if (name.includes('legging')) return 'Active Bottom';
  if (name.includes('bracelet')) return 'Bracelet';
  if (name.includes('necklace')) return 'Necklace';
  if (name.includes('bag')) return 'Bag';
  
  return 'Default Top';
}