// Supabase Edge Function — DeepSeek proxy
// Failas: supabase/functions/chat/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Tikriname vartotoją per Supabase JWT
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Neprisijungęs" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Tikriname premium arba žinučių limitą
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_premium, total_xp, chat_messages_today, chat_last_reset")
      .eq("id", user.id)
      .single();

    const isPremium = profile?.is_premium === true;

    // Tik premium vartotojai gali naudotis chatu
    if (!isPremium) {
      return new Response(JSON.stringify({ error: "PREMIUM_REQUIRED" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Premium vartotojams — 200 žinučių per dieną
    const today = new Date().toDateString();
    const lastReset = profile?.chat_last_reset
      ? new Date(profile.chat_last_reset).toDateString()
      : null;

    let msgCount = lastReset === today ? (profile?.chat_messages_today || 0) : 0;

    if (msgCount >= 200) {
      return new Response(JSON.stringify({ error: "LIMIT_REACHED" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Atnaujiname skaitiklį
    await supabase.from("profiles").update({
      chat_messages_today: msgCount + 1,
      chat_last_reset: new Date().toISOString(),
    }).eq("id", user.id);

    // 3. Gauname žinutę iš request
    const { messages } = await req.json();

    // 4. Kviečiame DeepSeek API — raktas saugomas Supabase Secrets
    const deepseekRes = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("DEEPSEEK_API_KEY")}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: `Tu esi StudijųBankas AI mokytojas, padedantis lietuvių moksleiviams ruoštis egzaminams.
Atsakyk visada lietuvių kalba. Būk draugiškas, aiškus ir skatinantis.
Specializuojiesi matematikoje, istorijoje, fizikoje ir lietuvių kalboje.
Paaiškink temas paprastai, naudok pavyzdžius, padėk spręsti uždavinius žingsnis po žingsnio.`,
          },
          ...messages,
        ],
        max_tokens: 800,
        temperature: 0.7,
      }),
    });

    const data = await deepseekRes.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});