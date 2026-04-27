'use client'

import { useState } from 'react'

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'result'; actors: Record<string, string> }
  | { status: 'error'; message: string }

export default function FeedbackApp() {
  const [feedback, setFeedback] = useState('')
  const [appState, setAppState] = useState<State>({ status: 'idle' })
  const [activeTab, setActiveTab] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function analyze() {
    if (!feedback.trim()) return
    setAppState({ status: 'loading' })
    setCopied(false)

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback }),
      })
      const data = await res.json()

      if (!res.ok || data.error) {
        setAppState({ status: 'error', message: data.error ?? '알 수 없는 오류가 발생했습니다.' })
        return
      }

      const actors: Record<string, string> = data.actors
      const firstActor = Object.keys(actors)[0] ?? null
      setAppState({ status: 'result', actors })
      setActiveTab(firstActor)
    } catch {
      setAppState({ status: 'error', message: '서버 연결에 실패했습니다.' })
    }
  }

  function reset() {
    setAppState({ status: 'idle' })
    setActiveTab(null)
    setCopied(false)
  }

  async function copyFeedback(text: string) {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isLoading = appState.status === 'loading'
  const hasResult = appState.status === 'result'

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-bg)' }}>
      <header className="px-8 py-5 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
        <h1 className="text-lg font-semibold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
          배우 피드백 분리기
        </h1>
        {hasResult && (
          <button
            onClick={reset}
            className="text-sm px-3 py-1.5 rounded-md transition-colors"
            style={{ color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
          >
            다시 작성
          </button>
        )}
      </header>

      <main className="flex-1 flex flex-col max-w-3xl w-full mx-auto px-8 py-10 gap-6">
        {/* Input section */}
        {!hasResult && (
          <section className="flex flex-col gap-4">
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder={"피드백을 자유롭게 입력하세요.\n\n예)\n김철수 - 발음이 많이 좋아졌어요.\n이영희: 오늘 감정선 훌륭했음\n박민준 3막 등장 타이밍 늦음"}
              disabled={isLoading}
              rows={12}
              className="w-full resize-none rounded-xl p-5 text-[15px] outline-none transition-colors"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
                lineHeight: '1.8',
              }}
            />
            <div className="flex justify-end">
              <button
                onClick={analyze}
                disabled={isLoading || !feedback.trim()}
                className="px-6 py-2.5 rounded-lg text-sm font-medium transition-opacity disabled:opacity-40"
                style={{
                  background: 'var(--color-accent)',
                  color: 'var(--color-accent-fg)',
                }}
              >
                {isLoading ? '분석 중...' : '분석하기'}
              </button>
            </div>

            {appState.status === 'error' && (
              <p className="text-sm text-red-500">{appState.message}</p>
            )}
          </section>
        )}

        {/* Result section */}
        {hasResult && appState.status === 'result' && (
          <section className="flex flex-col gap-0 rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
            {/* Tabs */}
            <div className="flex overflow-x-auto" style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
              {Object.keys(appState.actors).map((name) => (
                <button
                  key={name}
                  onClick={() => { setActiveTab(name); setCopied(false) }}
                  className="px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors"
                  style={{
                    color: activeTab === name ? 'var(--color-accent)' : 'var(--color-text-muted)',
                    borderBottom: activeTab === name ? '2px solid var(--color-accent)' : '2px solid transparent',
                    background: 'transparent',
                  }}
                >
                  {name}
                </button>
              ))}
            </div>

            {/* Feedback content */}
            {activeTab && (
              <div className="flex flex-col gap-4 p-6" style={{ background: 'var(--color-surface)' }}>
                <pre
                  className="text-[15px] whitespace-pre-wrap"
                  style={{ color: 'var(--color-text-primary)', lineHeight: '1.8', fontFamily: 'inherit' }}
                >
                  {appState.actors[activeTab]}
                </pre>
                <div className="flex justify-end">
                  <button
                    onClick={() => copyFeedback(appState.actors[activeTab])}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={{
                      background: copied ? '#e8f0e8' : 'var(--color-bg)',
                      color: copied ? '#2d6a2d' : 'var(--color-text-muted)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    {copied ? '복사됨' : '복사하기'}
                  </button>
                </div>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  )
}
