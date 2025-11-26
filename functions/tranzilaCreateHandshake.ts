import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Authentication
        const user = await base44.auth.me();
        if (!user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Extract sum from request body
        const { sum } = await req.json();
        
        if (!sum || sum <= 0) {
            return new Response(JSON.stringify({ error: 'Invalid sum' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Get Tranzila credentials from environment
        const supplier = Deno.env.get('supplier');
        const TranzilaPW = Deno.env.get('TranzilaPW');
        
        if (!supplier || !TranzilaPW) {
            console.error("Missing Tranzila credentials in environment variables.");
            return new Response(JSON.stringify({ error: 'Server configuration error: Missing Tranzila credentials' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Create handshake with Tranzila
        const handshakeUrl = `https://api.tranzila.com/v1/handshake/create?supplier=${supplier}&sum=${sum}&TranzilaPW=${TranzilaPW}`;
        
        const response = await fetch(handshakeUrl);
        const data = await response.text();
        
        // Extract thtk token
        const thtkPrefix = "thtk=";
        let thtk = data.trim();
        if (thtk.startsWith(thtkPrefix)) {
            thtk = thtk.substring(thtkPrefix.length);
        }
        
        return new Response(JSON.stringify({
            thtk,
            supplier,
            sum
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        console.error('Tranzila handshake error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});