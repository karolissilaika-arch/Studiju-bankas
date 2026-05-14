// supabase/functions/stripe-webhook/index.ts
// Klauso Stripe įvykių ir atnaujina vartotojo premium statusą

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

serve(async (req) => {
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
    apiVersion: "2023-10-16",
  });

  // Supabase admin klientas (service role — gali rašyti į DB be RLS)
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  let event: Stripe.Event;

  try {
   event = await stripe.webhooks.constructEventAsync(body, signature!, Deno.env.get("STRIPE_WEBHOOK_SECRET")!);
  } catch (err) {
    console.error("Webhook signature klaida:", err.message);
    return new Response(`Webhook klaida: ${err.message}`, { status: 400 });
  }

  // Pagalbinė funkcija: atnaujinti premium statusą pagal customer ID
  async function setPremium(stripeCustomerId: string, isPremium: boolean) {
    const { error } = await supabase
      .from("profiles")
      .update({
        is_premium: isPremium,
        premium_since: isPremium ? new Date().toISOString() : null,
        premium_expires: isPremium
          ? new Date(Date.now() + 32 * 24 * 60 * 60 * 1000).toISOString() // +32 dienos (atsarga)
          : null,
      })
      .eq("stripe_customer_id", stripeCustomerId);

    if (error) console.error("DB atnaujinimo klaida:", error);
    else console.log(`Premium ${isPremium ? "įjungtas" : "išjungtas"} — customer: ${stripeCustomerId}`);
  }

  // Apdorojame Stripe įvykius
  switch (event.type) {

    // Mokėjimas sėkmingas → įjungiame premium
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.CheckoutSession;
      if (session.mode === "subscription" && session.customer) {
        await setPremium(session.customer as string, true);
      }
      break;
    }

    // Prenumerata atnaujinta (mėnesinis mokėjimas) → patvirtinamas premium
    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.customer) {
        await setPremium(invoice.customer as string, true);
      }
      break;
    }

    // Mokėjimas nepavyko → išjungiame premium
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.customer) {
        await setPremium(invoice.customer as string, false);
      }
      break;
    }

    // Prenumerata atšaukta arba pasibaigė
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      if (sub.customer) {
        await setPremium(sub.customer as string, false);
      }
      break;
    }

    // Prenumerata pristabdyta
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      if (sub.customer) {
        const isActive = sub.status === "active" || sub.status === "trialing";
        await setPremium(sub.customer as string, isActive);
      }
      break;
    }

    default:
      console.log(`Neapdorotas įvykis: ${event.type}`);
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" }
  });
});
