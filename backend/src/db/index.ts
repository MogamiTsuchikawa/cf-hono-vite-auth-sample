import { drizzle } from "drizzle-orm/d1"
import type { Env } from "../types"
import * as schema from "./schema"

export const getDb = (env: Env) => {
  return drizzle(env.DB, { schema })
}
