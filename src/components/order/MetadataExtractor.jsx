/**
 * MetadataExtractor - חילוץ מטא-דאטה מובנה מקישורי מוצרים
 * משתמש ב-cheerio לניתוח HTML וחילוץ Schema.org, Open Graph ומטא-טאגים אחרים
 */

import * as cheerio from 'cheerio';

/**
 * מחלץ מטא-דאטה מובנה מ-URL של מוצר
 * @param {string} url - קישור למוצר
 * @returns {Promise<Object>} אובייקט עם פרטי המוצר שנמצאו
 */
export async function extractProductMetadata(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    const metadata = {
      product_name: null,
      product_sku: null,
      product_description: null,
      price: null,
      currency: null,
      image_url: null,
      available_colors: [],
      available_sizes: [],
      source: []
    };
    
    // 1. חיפוש Schema.org JSON-LD
    const jsonLdScripts = $('script[type="application/ld+json"]');
    jsonLdScripts.each((i, elem) => {
      try {
        const data = JSON.parse($(elem).html());
        
        // טיפול במערכים של JSON-LD
        const items = Array.isArray(data) ? data : [data];
        
        items.forEach(item => {
          if (item['@type'] === 'Product' || item['@type']?.includes?.('Product')) {
            if (item.name && !metadata.product_name) {
              metadata.product_name = item.name;
              metadata.source.push('schema.org JSON-LD');
            }
            
            if (item.sku && !metadata.product_sku) {
              metadata.product_sku = item.sku;
              metadata.source.push('schema.org sku');
            }
            
            if (item.description && !metadata.product_description) {
              metadata.product_description = item.description;
            }
            
            if (item.offers) {
              const offer = Array.isArray(item.offers) ? item.offers[0] : item.offers;
              if (offer.price && !metadata.price) {
                metadata.price = parseFloat(offer.price);
                metadata.source.push('schema.org price');
              }
              if (offer.priceCurrency && !metadata.currency) {
                metadata.currency = offer.priceCurrency;
              }
            }
            
            if (item.image && !metadata.image_url) {
              metadata.image_url = Array.isArray(item.image) ? item.image[0] : item.image;
            }
          }
        });
      } catch (e) {
        console.log('Failed to parse JSON-LD:', e);
      }
    });
    
    // 2. חיפוש Open Graph tags
    if (!metadata.product_name) {
      const ogTitle = $('meta[property="og:title"]').attr('content');
      if (ogTitle) {
        metadata.product_name = ogTitle.replace(/\s*\|\s*Brandy Melville.*$/i, '').trim();
        metadata.source.push('Open Graph title');
      }
    }
    
    if (!metadata.product_description) {
      const ogDescription = $('meta[property="og:description"]').attr('content');
      if (ogDescription) {
        metadata.product_description = ogDescription;
      }
    }
    
    if (!metadata.image_url) {
      const ogImage = $('meta[property="og:image"]').attr('content');
      if (ogImage) {
        metadata.image_url = ogImage;
      }
    }
    
    if (!metadata.price) {
      const ogPrice = $('meta[property="product:price:amount"]').attr('content');
      if (ogPrice) {
        metadata.price = parseFloat(ogPrice);
        metadata.source.push('Open Graph price');
      }
    }
    
    if (!metadata.currency) {
      const ogCurrency = $('meta[property="product:price:currency"]').attr('content');
      if (ogCurrency) {
        metadata.currency = ogCurrency;
      }
    }
    
    // 3. חיפוש מטא-טאגים רגילים
    if (!metadata.product_name) {
      const metaTitle = $('meta[name="title"]').attr('content') || $('title').text();
      if (metaTitle) {
        metadata.product_name = metaTitle.replace(/\s*\|\s*Brandy Melville.*$/i, '').trim();
        metadata.source.push('meta title');
      }
    }
    
    if (!metadata.product_description) {
      const metaDescription = $('meta[name="description"]').attr('content');
      if (metaDescription) {
        metadata.product_description = metaDescription;
      }
    }
    
    // 4. חיפוש SKU במקומות נפוצים
    if (!metadata.product_sku) {
      // חיפוש בתגי מטא
      const skuMeta = $('meta[name="sku"], meta[property="sku"]').attr('content');
      if (skuMeta) {
        metadata.product_sku = skuMeta;
        metadata.source.push('meta sku tag');
      }
      
      // חיפוש ב-data attributes
      if (!metadata.product_sku) {
        const skuData = $('[data-sku], [data-product-sku]').first().attr('data-sku') || 
                        $('[data-sku], [data-product-sku]').first().attr('data-product-sku');
        if (skuData) {
          metadata.product_sku = skuData;
          metadata.source.push('data-sku attribute');
        }
      }
      
      // חיפוש בטקסט (SKU: XXX)
      if (!metadata.product_sku) {
        const bodyText = $('body').text();
        const skuMatch = bodyText.match(/SKU:\s*([A-Z0-9\-_]+)/i) || 
                        bodyText.match(/Product Code:\s*([A-Z0-9\-_]+)/i);
        if (skuMatch) {
          metadata.product_sku = skuMatch[1];
          metadata.source.push('text pattern');
        }
      }
    }
    
    // 5. חיפוש מחיר בסלקטורים נפוצים אם עדיין לא נמצא
    if (!metadata.price) {
      const priceSelectors = [
        '.price', '.product-price', '[data-price]', '.current-price',
        'span[itemprop="price"]', '.money', '.product__price'
      ];
      
      for (const selector of priceSelectors) {
        const priceEl = $(selector).first();
        if (priceEl.length) {
          const priceText = priceEl.attr('data-price') || priceEl.text();
          const priceMatch = priceText.match(/[\d,]+\.?\d*/);
          if (priceMatch) {
            metadata.price = parseFloat(priceMatch[0].replace(',', ''));
            metadata.source.push(`price selector: ${selector}`);
            break;
          }
        }
      }
    }
    
    // 6. זיהוי מטבע מה-URL או מהדף
    if (!metadata.currency) {
      if (url.includes('.com') || url.includes('/us/')) {
        metadata.currency = 'USD';
      } else if (url.includes('.eu') || url.includes('/eu/')) {
        metadata.currency = 'EUR';
      } else if (url.includes('.uk') || url.includes('.co.uk') || url.includes('/uk/')) {
        metadata.currency = 'GBP';
      }
    }
    
    console.log('🔍 Metadata extracted:', metadata);
    return metadata;
    
  } catch (error) {
    console.error('Error extracting metadata:', error);
    return null;
  }
}

/**
 * משלב מטא-דאטה שחולצה עם תוצאות LLM
 * @param {Object} metadata - מטא-דאטה שחולצה
 * @param {Object} llmResult - תוצאות מה-LLM
 * @returns {Object} תוצאה משולבת
 */
export function mergeMetadataWithLLM(metadata, llmResult) {
  if (!metadata) return llmResult;
  
  return {
    // נעדיף מטא-דאטה מובנה על פני LLM כאשר זמין
    product_name: metadata.product_name || llmResult.product_name,
    product_sku: metadata.product_sku || llmResult.product_sku,
    product_description: metadata.product_description || llmResult.product_description,
    price: metadata.price || llmResult.price,
    currency_found: metadata.currency || llmResult.currency_found,
    image_url: metadata.image_url || llmResult.image_url,
    
    // נשתמש ב-LLM לפרטים שדורשים ניתוח מורכב יותר
    available_colors: llmResult.available_colors || metadata.available_colors || [],
    available_sizes: llmResult.available_sizes || metadata.available_sizes || [],
    
    // מידע דיבוג
    _metadata_sources: metadata.source,
    _used_metadata: !!(metadata.product_name || metadata.product_sku || metadata.price)
  };
}