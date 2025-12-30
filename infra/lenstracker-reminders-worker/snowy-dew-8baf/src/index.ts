import webpush from "web-push";

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
	ADMIN_KEY: string;

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

type Eye = "LEFT" | "RIGHT";
type CycleState = {
	cycleId: string;
	eye: Eye;
	dueAt: string;
	createdAt: string;
	lastSentAt?: string;
	sentCount: number;
};


type SweepStats = {
	cycleKeys: number;
	dueOrOverdue: number;
	eligibleToSend: number;
	sent: number;
	missingSub: number;
	errors: number;
};

async function runNagSweep(env: Env): Promise<SweepStats> {
	const stats: SweepStats = {
		cycleKeys: 0,
		dueOrOverdue: 0,
		eligibleToSend: 0,
		sent: 0,
		missingSub: 0,
		errors: 0,
	};

	const list = await env.LT_KV.list({ prefix: "cycle:" });
	stats.cycleKeys = list.keys.length;

	const now = Date.now();

	for (const k of list.keys) {
		const raw = await env.LT_KV.get(k.name);
		if (!raw) continue;

		const state = JSON.parse(raw) as CycleState;

		const dueMs = new Date(state.dueAt).getTime();
		if (now < dueMs) continue;
		stats.dueOrOverdue++;

		const idx = Math.min(state.sentCount, NAG_OFFSETS_DAYS.length - 1);
		const nextOffsetDays = NAG_OFFSETS_DAYS[idx];
		const nextSendAt = dueMs + nextOffsetDays * 24 * 60 * 60 * 1000;

		if (now < nextSendAt) continue;
		stats.eligibleToSend++;

		const parts = k.name.split(":"); // cycle:<deviceId>:<eye>
		const deviceId = parts[1];
		const eye = parts[2] as Eye;

		const subRaw = await env.LT_KV.get(`sub:${deviceId}`);
		if (!subRaw) {
			stats.missingSub++;
			continue;
		}

		const subscription = JSON.parse(subRaw);

		const payload = JSON.stringify({
			title: "LensTracker",
			body: state.sentCount === 0
				? `${eye} lens due now. Please change it.`
				: `${eye} lens is overdue. Please change it.`,
			tag: `lenstracker-${eye.toLowerCase()}`,
			url: "/",
		});

		try {
			webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
			await webpush.sendNotification(subscription, payload);

			state.sentCount += 1;
			state.lastSentAt = new Date(now).toISOString();
			await env.LT_KV.put(k.name, JSON.stringify(state));
			stats.sent++;
		} catch {
			stats.errors++;
		}
	}

	return stats;
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
		if (url.pathname === "/cron/runOnce" && req.method === "POST") {
			const key = req.headers.get("x-admin-key");
			if (!key || key !== env.ADMIN_KEY) {
				return new Response("Unauthorized", { status: 401, headers: corsHeaders });
			}

			const stats = await runNagSweep(env);

			return new Response(JSON.stringify({ ok: true, stats }), {
				headers: { "Content-Type": "application/json", ...corsHeaders },
			});
		}

		if (url.pathname === "/cycle/get" && req.method === "GET") {
			const key = req.headers.get("x-admin-key");
			if (!key || key !== env.ADMIN_KEY) {
				return new Response("Unauthorized", { status: 401, headers: corsHeaders });
			}

			const deviceId = url.searchParams.get("deviceId");
			const eye = url.searchParams.get("eye") as Eye | null;

			if (!deviceId || (eye !== "LEFT" && eye !== "RIGHT")) {
				return new Response("Bad Request: deviceId & eye required", { status: 400, headers: corsHeaders });
			}

			const raw = await env.LT_KV.get(`cycle:${deviceId}:${eye}`);
			return new Response(JSON.stringify({ ok: true, raw: raw ? JSON.parse(raw) : null }), {
				headers: { "Content-Type": "application/json", ...corsHeaders },
			});
		}

		if (url.pathname === "/push/get" && req.method === "GET") {
			const key = req.headers.get("x-admin-key");
			if (!key || key !== env.ADMIN_KEY) {
				return new Response("Unauthorized", { status: 401, headers: corsHeaders });
			}

			const deviceId = url.searchParams.get("deviceId");
			if (!deviceId) return new Response("Bad Request: deviceId required", { status: 400, headers: corsHeaders });

			const raw = await env.LT_KV.get(`sub:${deviceId}`);
			return new Response(JSON.stringify({ ok: true, hasSub: !!raw, sub: raw ? JSON.parse(raw) : null }), {
				headers: { "Content-Type": "application/json", ...corsHeaders },
			});
		}


		return new Response("Not Found", { status: 404, headers: corsHeaders });
	},


	async scheduled(_event: ScheduledEvent, env: Env) {
		await runNagSweep(env);
	},
};
