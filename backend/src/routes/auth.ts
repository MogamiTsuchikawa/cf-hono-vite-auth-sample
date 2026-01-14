import { Hono } from "hono"
import { eq } from "drizzle-orm"
import type { Env } from "../types"
import { getDb } from "../db"
import { users } from "../db/schema"
import { hashPassword } from "../services/password"

export const authRoute = new Hono<{ Bindings: Env }>()

authRoute.post("/api/auth/register", async (c) => {
  const payload = (await c.req.json().catch(() => null)) as
    | { email?: string; password?: string; name?: string }
    | null

  if (!payload?.email || !payload.password) {
    return c.json({ detail: "Invalid payload" }, 400)
  }

  const db = getDb(c.env)
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, payload.email))
    .limit(1)
    .execute()

  if (existing.length > 0) {
    return c.json({ detail: "Email already registered" }, 400)
  }

  const userId = crypto.randomUUID()
  const hashedPassword = await hashPassword(payload.password)

  await db
    .insert(users)
    .values({
      id: userId,
      email: payload.email,
      name: payload.name || payload.email.split("@")[0],
      hashedPassword,
    })
    .execute()

  return c.json({
    id: userId,
    email: payload.email,
    name: payload.name || null,
  })
})
