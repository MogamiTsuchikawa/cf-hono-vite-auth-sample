import { Auth } from "@auth/core"
import type { Provider } from "@auth/core/providers"
import Credentials from "@auth/core/providers/credentials"
import Google from "@auth/core/providers/google"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { eq } from "drizzle-orm"
import type { Env } from "./types"
import { getDb } from "./db"
import { accounts, sessions, users, verificationTokens } from "./db/schema"
import { verifyPassword } from "./services/password"

export const handleAuth = (request: Request, env: Env) => {
  const isSecure = env.AUTH_URL.startsWith("https://")
  const parseOrigin = (value: string) => {
    try {
      return new URL(value).origin
    } catch {
      return null
    }
  }
  const authOrigin = parseOrigin(env.AUTH_URL)
  const corsOrigin = parseOrigin(env.CORS_ORIGIN)
  const isCrossSite = authOrigin && corsOrigin ? authOrigin !== corsOrigin : false
  const cookieSameSite: "none" | "lax" =
    isSecure && isCrossSite ? "none" : "lax"
  const cookiePrefix = isSecure ? "__Secure-" : ""
  const useHostPrefix = isSecure && !env.AUTH_COOKIE_DOMAIN
  const sessionCookieName = `${cookiePrefix}authjs.session-token`
  const callbackCookieName = `${cookiePrefix}authjs.callback-url`
  const csrfCookieName = `${useHostPrefix ? "__Host-" : cookiePrefix}authjs.csrf-token`
  const baseCookieOptions = {
    httpOnly: true,
    sameSite: cookieSameSite,
    path: "/",
    secure: isSecure,
  }
  const cookieDomainOptions = env.AUTH_COOKIE_DOMAIN
    ? { domain: env.AUTH_COOKIE_DOMAIN }
    : {}
  const sessionCookieOptions = {
    ...baseCookieOptions,
    ...cookieDomainOptions,
  }
  const callbackCookieOptions = {
    ...baseCookieOptions,
    ...cookieDomainOptions,
  }
  const csrfCookieOptions = {
    ...baseCookieOptions,
    ...(useHostPrefix ? {} : cookieDomainOptions),
  }

  const providers: Provider[] = [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) return null
        const db = getDb(env)
        const rows = await db
          .select()
          .from(users)
          .where(eq(users.email, String(credentials.email)))
          .limit(1)
          .execute()
        const user = rows[0]
        if (!user?.hashedPassword) return null
        const valid = await verifyPassword(
          String(credentials.password),
          user.hashedPassword
        )
        if (!valid) return null
        return {
          id: user.id,
          name: user.name,
          email: user.email,
        }
      },
    }),
  ]

  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    providers.push(
      Google({
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      })
    )
  }

  return Auth(request, {
    basePath: "/auth",
    trustHost: true,
    useSecureCookies: isSecure,
    secret: env.AUTH_SECRET,
    session: { strategy: "jwt" },
    providers,
    adapter: DrizzleAdapter(getDb(env), {
      usersTable: users,
      accountsTable: accounts,
      sessionsTable: sessions,
      verificationTokensTable: verificationTokens,
    }),
    cookies: {
      sessionToken: {
        name: sessionCookieName,
        options: sessionCookieOptions,
      },
      callbackUrl: {
        name: callbackCookieName,
        options: callbackCookieOptions,
      },
      csrfToken: {
        name: csrfCookieName,
        options: csrfCookieOptions,
      },
    },
    callbacks: {
      async jwt({ token, user, account }) {
        if (user?.id) {
          token.userId = user.id
        }
        if (account?.provider) {
          token.provider = account.provider
        } else if (user && !token.provider) {
          token.provider = "credentials"
        }
        return token
      },
      async session({ session, token }) {
        if (session.user) {
          const sessionUser = session.user as typeof session.user & {
            id?: string
            provider?: string
          }
          if (token.userId) {
            sessionUser.id = token.userId as string
          }
          if (token.provider) {
            sessionUser.provider = token.provider as string
          }
        }
        return session
      },
      async redirect({ url, baseUrl }) {
        if (url.startsWith("/")) return `${baseUrl}${url}`

        const allowedOrigins = [env.CORS_ORIGIN, baseUrl]
        return allowedOrigins.some((origin) => url.startsWith(origin))
          ? url
          : baseUrl
      },
    },
    pages: {
      error: "/auth/error",
    },
  })
}
