import webpush from "web-push";

type Eye = "LEFT" | "RIGHT";

type CycleState = {
	cycleId: string;          // unique per reset
	eye: Eye;
	dueAt: string;            // ISO string
	createdAt: string;        // ISO
	lastSentAt?: string;      // ISO
	sentCount: number;        // how many nags already sent
};

function cycleKey(deviceId: string, eye: Eye) {
	return `cycle:${deviceId}:${eye}`;
}

function nowIso() {
	return new Date().toISOString();
}

const NAG_OFFSETS_DAYS = [0, 1, 2, 3, 5, 8, 13]; // progressive cadence


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

		if (url.pathname === "/cycle/upsert" && req.method === "POST") {
			const body = (await req.json()) as { deviceId: string; eye: Eye; dueAt: string };

			if (!body?.deviceId || !body?.eye || !body?.dueAt) {
				return new Response("Bad Request", { status: 400, headers: corsHeaders });
			}

			const state: CycleState = {
				cycleId: crypto.randomUUID(),
				eye: body.eye,
				dueAt: new Date(body.dueAt).toISOString(),
				createdAt: nowIso(),
				sentCount: 0,
			};

			await env.LT_KV.put(cycleKey(body.deviceId, body.eye), JSON.stringify(state));

			return new Response(JSON.stringify({ ok: true, cycleId: state.cycleId }), {
				headers: { "Content-Type": "application/json", ...corsHeaders },
			});
		}

		if (url.pathname === "/cycle/clear" && req.method === "POST") {
			const body = (await req.json()) as { deviceId: string; eye: Eye };
			if (!body?.deviceId || !body?.eye) {
				return new Response("Bad Request", { status: 400, headers: corsHeaders });
			}
			await env.LT_KV.delete(cycleKey(body.deviceId, body.eye));
			return new Response(JSON.stringify({ ok: true }), {
				headers: { "Content-Type": "application/json", ...corsHeaders },
			});
		}


		return new Response("Not Found", { status: 404, headers: corsHeaders });
	},

	async scheduled(_event: ScheduledEvent, env: Env) {
		// 1) list cycle keys (small scale: OK)
		const list = await env.LT_KV.list({ prefix: "cycle:" });

		const now = Date.now();

		for (const k of list.keys) {
			const raw = await env.LT_KV.get(k.name);
			if (!raw) continue;

			const state = JSON.parse(raw) as CycleState;

			const dueMs = new Date(state.dueAt).getTime();
			if (now < dueMs) continue; // not due yet

			const idx = Math.min(state.sentCount, NAG_OFFSETS_DAYS.length - 1);
			const nextOffsetDays = NAG_OFFSETS_DAYS[idx];
			const nextSendAt = dueMs + nextOffsetDays * 24 * 60 * 60 * 1000;

			// 2) only send if we passed the next scheduled nag moment
			if (now < nextSendAt) continue;

			// 3) extract deviceId from key: cycle:<deviceId>:<eye>
			const parts = k.name.split(":");
			const deviceId = parts[1];
			const eye = parts[2] as Eye;

			const subRaw = await env.LT_KV.get(`sub:${deviceId}`);
			if (!subRaw) continue;

			const subscription = JSON.parse(subRaw);

			// 4) send push
			const payload = JSON.stringify({
				title: "LensTracker",
				body:
					state.sentCount === 0
						? `${eye} lens due today. Change it when you can.`
						: `${eye} lens is overdue. Please change it.`,
				tag: `lenstracker-${eye.toLowerCase()}`, // groups per eye
				url: "/",
			});

			try {
				webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
				await webpush.sendNotification(subscription, payload);

				// 5) update state: increment count so next nag gets larger offset
				state.sentCount += 1;
				state.lastSentAt = new Date(now).toISOString();
				await env.LT_KV.put(k.name, JSON.stringify(state));
			} catch {
				// If subscription is dead (410/404), we’ll handle cleanup later.
				// For now: ignore and retry next cron.
			}
		}
	},
};
