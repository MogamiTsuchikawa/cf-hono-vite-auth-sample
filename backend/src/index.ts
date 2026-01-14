import { Hono } from "hono"
import { cors } from "hono/cors"
import type { Env } from "./types"
import { handleAuth } from "./auth"
import { authRoute } from "./routes/auth"

const app = new Hono<{ Bindings: Env }>()

app.use(
  "*",
  cors({
    origin: (origin, c) => {
      if (!origin) return c.env.CORS_ORIGIN
      return origin === c.env.CORS_ORIGIN ? origin : undefined
    },
    credentials: true,
  })
)

app.all("/auth", (c) => handleAuth(c.req.raw, c.env))
app.all("/auth/*", (c) => handleAuth(c.req.raw, c.env))

app.get("/health", (c) => c.json({ ok: true }))

app.route("/", authRoute)

export default app
