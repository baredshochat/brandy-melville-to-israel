Deno.serve(async (req) => {
  try {
    // Get client IP from headers
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('x-real-ip') || 
                     'unknown';

    // For testing purposes, you can uncomment this to always allow access
    // return Response.json({ allowed: true, country: 'IL', ip: clientIp });

    // Skip check for localhost/development
    if (clientIp === 'unknown' || clientIp === '127.0.0.1' || clientIp.startsWith('192.168.')) {
      return Response.json({ allowed: true, country: 'IL', ip: clientIp, dev: true });
    }

    // Check IP geolocation using ipapi.co (free tier: 1000 requests/day)
    const geoResponse = await fetch(`https://ipapi.co/${clientIp}/json/`);
    
    if (!geoResponse.ok) {
      // If API fails, allow access (don't block on error)
      return Response.json({ allowed: true, country: 'UNKNOWN', ip: clientIp, error: 'API failed' });
    }

    const geoData = await geoResponse.json();
    const countryCode = geoData.country_code;

    // Allow only Israel (IL)
    const allowed = countryCode === 'IL';

    return Response.json({
      allowed,
      country: countryCode,
      ip: clientIp,
      city: geoData.city,
      region: geoData.region
    });

  } catch (error) {
    console.error('Error checking country:', error);
    // On error, allow access (fail open)
    return Response.json({ 
      allowed: true, 
      country: 'ERROR', 
      error: error.message 
    });
  }
});