import webpush from "web-push";

export interface Env {
	LT_KV: KVNamespace;
	VAPID_PRIVATE_KEY: string;
	VAPID_PUBLIC_KEY: string;
	VAPID_SUBJECT: string;
}

type RegisterBody = {
	deviceId: string;
	subscription: any; // PushSubscription JSON
};

function json(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

export default {
	async fetch(req: Request, env: Env): Promise<Response> {
		const url = new URL(req.url);

		// CORS (so your Vercel frontend can call this directly)
		const corsHeaders = {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET,POST,OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type",
		};
		if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

		if (url.pathname === "/health") {
			return new Response(JSON.stringify({ ok: true, ts: Date.now() }), {
				headers: { "Content-Type": "application/json", ...corsHeaders },
			});
		}

		// POST /push/register
		// body: { deviceId, subscription }
		if (url.pathname === "/push/register" && req.method === "POST") {
			const body = (await req.json()) as RegisterBody;

			if (!body?.deviceId || !body?.subscription?.endpoint) {
				return new Response("Bad Request", { status: 400, headers: corsHeaders });
			}

			await env.LT_KV.put(`sub:${body.deviceId}`, JSON.stringify(body.subscription));
			return new Response(JSON.stringify({ ok: true }), {
				headers: { "Content-Type": "application/json", ...corsHeaders },
			});
		}

		// POST /push/test
		// body: { deviceId, title?, body? }
		if (url.pathname === "/push/test" && req.method === "POST") {
			const body = (await req.json()) as {
				deviceId: string;
				title?: string;
				body?: string;
			};

			if (!body?.deviceId) {
				return new Response("Bad Request: deviceId required", { status: 400, headers: corsHeaders });
			}

			const subRaw = await env.LT_KV.get(`sub:${body.deviceId}`);
			if (!subRaw) {
				return new Response("No subscription for deviceId", { status: 404, headers: corsHeaders });
			}

			const subscription = JSON.parse(subRaw);

			// Configure VAPID identity
			webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);

			// Payload your Service Worker will show
			const payload = JSON.stringify({
				title: body.title ?? "LensTracker",
				body: body.body ?? "Test push ✅ (from Cloudflare Worker)",
				ts: Date.now(),
			});

			try {
				const resp = await webpush.sendNotification(subscription, payload);

				// resp shape depends; keep response minimal and serializable
				return new Response(JSON.stringify({ ok: true, statusCode: (resp as any)?.statusCode ?? 201 }), {
					headers: { "Content-Type": "application/json", ...corsHeaders },
				});
			} catch (e: any) {
				return new Response(
					JSON.stringify({
						ok: false,
						error: e?.message ?? String(e),
						note:
							"If this mentions crypto/node incompatibility, tell me the exact error text and I’ll give you the Workers-native push sender version.",
					}),
					{ status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
				);
			}
		}

		return new Response("Not Found", { status: 404, headers: corsHeaders });
	},
};
