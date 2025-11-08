import React from 'react';

// מפה של שמות צבעים נפוצים לקודי צבע
const colorMap = {
  // צבעים בסיסיים
  'black': '#000000',
  'white': '#FFFFFF',
  'red': '#DC2626',
  'blue': '#2563EB',
  'navy': '#1E3A8A',
  'green': '#16A34A',
  'yellow': '#EAB308',
  'pink': '#EC4899',
  'purple': '#9333EA',
  'orange': '#EA580C',
  'brown': '#A16207',
  'gray': '#6B7280',
  'grey': '#6B7280',
  
  // צבעים ספציפיים של Brandy Melville
  'navy blue': '#1E3A8A',
  'dusty rose': '#D4A5A5',
  'sage green': '#9CAF88',
  'cream': '#F5F5DC',
  'beige': '#F5F5DC',
  'ivory': '#FFFFF0',
  'off white': '#FAF0E6',
  'light blue': '#87CEEB',
  'baby blue': '#87CEEB',
  'powder blue': '#B0E0E6',
  'sky blue': '#87CEEB',
  'dark blue': '#00008B',
  'royal blue': '#4169E1',
  'light pink': '#FFB6C1',
  'baby pink': '#F8BBD9',
  'hot pink': '#FF69B4',
  'dusty pink': '#D4A5A5',
  'blush': '#DE5D83',
  'coral': '#FF7F50',
  'peach': '#FFCBA4',
  'lavender': '#E6E6FA',
  'lilac': '#C8A2C8',
  'mint': '#98FB98',
  'mint green': '#98FB98',
  'forest green': '#228B22',
  'olive': '#808000',
  'khaki': '#F0E68C',
  'tan': '#D2B48C',
  'camel': '#C19A6B',
  'burgundy': '#800020',
  'maroon': '#800000',
  'wine': '#722F37',
  'charcoal': '#36454F',
  'light gray': '#D3D3D3',
  'dark gray': '#A9A9A9',
  'silver': '#C0C0C0',
  'gold': '#FFD700',
  'bronze': '#CD7F32',
  'rust': '#B7410E',
  'terracotta': '#E2725B',
  'mauve': '#E0B0FF',
  'teal': '#008080',
  'turquoise': '#40E0D0',
  'aqua': '#00FFFF',
  'denim': '#1560BD',
  'indigo': '#4B0082'
};

// פונקציה לנרמול שם הצבע
const normalizeColorName = (colorName) => {
  return colorName.toLowerCase().trim();
};

// פונקציה לחיפוש צבע במפה
const getColorCode = (colorName) => {
  const normalized = normalizeColorName(colorName);
  
  // חיפוש ישיר
  if (colorMap[normalized]) {
    return colorMap[normalized];
  }
  
  // חיפוש חלקי - אם שם הצבע מכיל אחד מהצבעים במפה
  for (const [key, value] of Object.entries(colorMap)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }
  
  return null;
};

export default function ColorDisplay({ colorName, size = 'md' }) {
  if (!colorName) return null;
  
  const colorCode = getColorCode(colorName);
  
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };
  
  if (!colorCode) {
    // אם לא מצאנו קוד צבע, נציג רק את הטקסט
    return (
      <span className="text-stone-600 text-sm">{colorName}</span>
    );
  }
  
  return (
    <div className="flex items-center gap-2">
      <div 
        className={`${sizeClasses[size]} border border-stone-300 flex-shrink-0`}
        style={{ backgroundColor: colorCode }}
        title={colorName}
      />
      <span className="text-stone-600 text-sm ltr text-left">{colorName}</span>
    </div>
  );
}