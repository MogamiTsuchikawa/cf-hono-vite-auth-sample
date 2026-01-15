import { useEffect, useMemo, useState } from "react"

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8787"
const AUTH_BASE_URL = import.meta.env.VITE_AUTH_BASE_URL || API_BASE_URL

type AuthSession = {
  user?: {
    id?: string
    name?: string | null
    email?: string | null
    provider?: string | null
    image?: string | null
  }
  expires?: string
} | null

type AuthProviders = Record<string, { id: string; name: string }>

export default function App() {
  const [session, setSession] = useState<AuthSession>(null)
  const [providers, setProviders] = useState<AuthProviders | null>(null)
  const [authEmail, setAuthEmail] = useState("")
  const [authPassword, setAuthPassword] = useState("")
  const [authError, setAuthError] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authSubmitting, setAuthSubmitting] = useState(false)

  const apiBase = useMemo(() => API_BASE_URL, [])
  const authBase = useMemo(() => AUTH_BASE_URL, [])

  useEffect(() => {
    void loadSession()
    void loadProviders()
  }, [])

  const loadSession = async () => {
    setAuthLoading(true)
    try {
      const res = await fetch(`${authBase}/auth/session`, {
        credentials: "include",
      })
      if (!res.ok) {
        setSession(null)
        return null
      }
      const data = (await res.json()) as AuthSession
      const nextSession = data && data.user ? data : null
      setSession(nextSession)
      return nextSession
    } catch (err) {
      console.error(err)
      setSession(null)
      setAuthError("認証サーバーに接続できません。")
      return null
    } finally {
      setAuthLoading(false)
    }
  }

  const loadProviders = async () => {
    try {
      const res = await fetch(`${authBase}/auth/providers`, {
        credentials: "include",
      })
      if (!res.ok) return
      const data = (await res.json()) as AuthProviders
      setProviders(data)
    } catch (err) {
      console.error(err)
      setProviders(null)
    }
  }

  const fetchCsrfToken = async () => {
    const res = await fetch(`${authBase}/auth/csrf`, {
      credentials: "include",
    })
    if (!res.ok) {
      throw new Error("CSRF token fetch failed")
    }
    const data = (await res.json()) as { csrfToken?: string }
    if (!data.csrfToken) {
      throw new Error("CSRF token missing")
    }
    return data.csrfToken
  }

  const handleCredentialsSignIn = async () => {
    setAuthError(null)
    setAuthSubmitting(true)
    try {
      if (!authEmail || !authPassword) {
        setAuthError("メールとパスワードを入力してください。")
        return
      }
      const csrfToken = await fetchCsrfToken()
      const payload = new URLSearchParams()
      payload.set("csrfToken", csrfToken)
      payload.set("email", authEmail)
      payload.set("password", authPassword)
      payload.set("callbackUrl", window.location.origin)
      await fetch(`${authBase}/auth/callback/credentials`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: payload,
        credentials: "include",
        redirect: "manual",
      })
      const nextSession = await loadSession()
      if (!nextSession?.user) {
        setAuthError("ログインに失敗しました。")
      }
    } catch (err) {
      console.error(err)
      setAuthError("ログインに失敗しました。")
    } finally {
      setAuthSubmitting(false)
    }
  }

  const handleRegister = async () => {
    setAuthError(null)
    setAuthSubmitting(true)
    try {
      if (!authEmail || !authPassword) {
        setAuthError("メールとパスワードを入力してください。")
        return
      }
      const res = await fetch(`${apiBase}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: authEmail,
          password: authPassword,
          name: authEmail.split("@")[0],
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setAuthError(data?.detail || "登録に失敗しました。")
        return
      }
      await handleCredentialsSignIn()
    } catch (err) {
      console.error(err)
      setAuthError("登録に失敗しました。")
    } finally {
      setAuthSubmitting(false)
    }
  }

  const handleSignOut = async () => {
    setAuthSubmitting(true)
    try {
      const csrfToken = await fetchCsrfToken()
      const payload = new URLSearchParams()
      payload.set("csrfToken", csrfToken)
      payload.set("callbackUrl", window.location.origin)
      await fetch(`${authBase}/auth/signout`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: payload,
        credentials: "include",
        redirect: "manual",
      })
      setSession(null)
    } finally {
      setAuthSubmitting(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setAuthError(null)
    setAuthSubmitting(true)
    try {
      const csrfToken = await fetchCsrfToken()
      const form = document.createElement("form")
      form.method = "POST"
      form.action = `${authBase}/auth/signin/google`
      const csrfInput = document.createElement("input")
      csrfInput.type = "hidden"
      csrfInput.name = "csrfToken"
      csrfInput.value = csrfToken
      const callbackInput = document.createElement("input")
      callbackInput.type = "hidden"
      callbackInput.name = "callbackUrl"
      callbackInput.value = window.location.origin
      form.append(csrfInput, callbackInput)
      document.body.appendChild(form)
      form.submit()
    } catch (err) {
      console.error(err)
      setAuthError("Googleログインに失敗しました。")
      setAuthSubmitting(false)
    }
  }

  if (authLoading) {
    return (
      <div className="app-shell">
        <div className="card">読み込み中...</div>
      </div>
    )
  }

  if (!session?.user) {
    const googleAvailable = Boolean(providers?.google)
    return (
      <div className="app-shell">
        <div className="card">
          <h1 className="card-title">ログイン</h1>
          <label className="field">
            <span>メールアドレス</span>
            <input
              type="email"
              placeholder="you@example.com"
              value={authEmail}
              onChange={(event) => setAuthEmail(event.target.value)}
            />
          </label>
          <label className="field">
            <span>パスワード</span>
            <input
              type="password"
              placeholder="********"
              value={authPassword}
              onChange={(event) => setAuthPassword(event.target.value)}
            />
          </label>
          {authError ? <div className="error">{authError}</div> : null}
          <div className="button-row">
            <button
              type="button"
              className="primary"
              onClick={handleCredentialsSignIn}
              disabled={authSubmitting}
            >
              メールでログイン
            </button>
            <button
              type="button"
              className="secondary"
              onClick={handleRegister}
              disabled={authSubmitting}
            >
              新規登録してログイン
            </button>
            <button
              type="button"
              className="outline"
              onClick={handleGoogleSignIn}
              disabled={!googleAvailable}
            >
              Googleでログイン
            </button>
            {!googleAvailable ? (
              <p className="hint">Googleログインは環境変数が未設定です。</p>
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <div className="card">
        <h1 className="card-title">ログイン済み</h1>
        <div className="session-info">
          <div>{session.user.name || "User"}</div>
          <div className="session-sub">
            {session.user.email}
            {session.user.provider ? ` (${session.user.provider})` : ""}
          </div>
        </div>
        <button
          type="button"
          className="outline"
          onClick={handleSignOut}
          disabled={authSubmitting}
        >
          サインアウト
        </button>
      </div>
    </div>
  )
}
