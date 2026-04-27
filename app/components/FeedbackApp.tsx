'use client'

import { useState, KeyboardEvent } from 'react'

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'result'; actors: Record<string, string> }
  | { status: 'error'; message: string }

const FORMAT_TIPS = [
  '한 줄에 한 배우의 피드백을 작성하세요',
  '배우 이름은 줄 맨 앞에 쓰세요: 루리 – 피드백  또는  루리: 피드백',
  '한 줄에 여러 배우 이름이 섞이면 분리가 어려울 수 있어요',
  '장/씬 구분은 "1장", "약국1" 처럼 별도 줄로 쓰면 헤더로 처리돼요',
]

export default function FeedbackApp() {
  const [feedback, setFeedback] = useState('')
  const [actorNames, setActorNames] = useState<string[]>([])
  const [actorInput, setActorInput] = useState('')
  const [showTips, setShowTips] = useState(false)
  const [triedWithoutActors, setTriedWithoutActors] = useState(false)
  const [appState, setAppState] = useState<State>({ status: 'idle' })
  const [activeTab, setActiveTab] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [copiedAll, setCopiedAll] = useState(false)

  function addActor(name: string) {
    const trimmed = name.trim()
    if (trimmed && !actorNames.includes(trimmed)) {
      setActorNames(prev => [...prev, trimmed])
      setTriedWithoutActors(false)
    }
    setActorInput('')
  }

  function handleActorKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addActor(actorInput)
    } else if (e.key === 'Backspace' && !actorInput && actorNames.length > 0) {
      setActorNames(prev => prev.slice(0, -1))
    }
  }

  function removeActor(name: string) {
    setActorNames(prev => prev.filter(n => n !== name))
  }

  function handleAnalyzeClick() {
    if (actorNames.length === 0) {
      setTriedWithoutActors(true)
      return
    }
    analyze()
  }

  async function analyze() {
    if (!feedback.trim() || actorNames.length === 0) return
    setAppState({ status: 'loading' })
    setCopied(false)
    setCopiedAll(false)

    try {
      const formData = new FormData()
      formData.append('feedback', feedback)
      formData.append('actorNames', actorNames.join(','))

      const res = await fetch('/api/analyze', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok || data.error) {
        setAppState({ status: 'error', message: data.error ?? '알 수 없는 오류가 발생했습니다.' })
        return
      }

      const actors: Record<string, string> = data.actors
      setAppState({ status: 'result', actors })
      setActiveTab(Object.keys(actors)[0] ?? null)
    } catch {
      setAppState({ status: 'error', message: '서버 연결에 실패했습니다.' })
    }
  }

  function reset() {
    setAppState({ status: 'idle' })
    setFeedback('')
    setActiveTab(null)
    setCopied(false)
    setCopiedAll(false)
    setTriedWithoutActors(false)
    // actorNames 유지
  }

  async function copyFeedback(text: string) {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function copyAll() {
    if (appState.status !== 'result') return
    const all = Object.entries(appState.actors)
      .map(([name, text]) => `[${name}]\n${text}`)
      .join('\n\n---\n\n')
    await navigator.clipboard.writeText(all)
    setCopiedAll(true)
    setTimeout(() => setCopiedAll(false), 2000)
  }

  function downloadAll() {
    if (appState.status !== 'result') return
    const all = Object.entries(appState.actors)
      .map(([name, text]) => `[${name}]\n${text}`)
      .join('\n\n---\n\n')
    const blob = new Blob([all], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '피드백.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  const isLoading = appState.status === 'loading'
  const hasResult = appState.status === 'result'

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-bg)' }}>
      <header
        className="px-8 py-5 border-b flex items-center justify-between gap-4"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
      >
        <h1 className="text-lg font-semibold tracking-tight shrink-0" style={{ color: 'var(--color-text-primary)' }}>
          배우 피드백 분리기
        </h1>

        {hasResult && (
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={copyAll}
              className="text-sm px-3 py-1.5 rounded-md transition-colors"
              style={{
                color: copiedAll ? '#2d6a2d' : 'var(--color-text-muted)',
                border: '1px solid var(--color-border)',
                background: copiedAll ? '#e8f0e8' : 'transparent',
              }}
            >
              {copiedAll ? '전체 복사됨' : '전체 복사'}
            </button>
            <button
              onClick={downloadAll}
              className="text-sm px-3 py-1.5 rounded-md transition-colors"
              style={{ color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
            >
              다운로드
            </button>
            <button
              onClick={reset}
              className="text-sm px-3 py-1.5 rounded-md transition-colors"
              style={{ color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
            >
              다시 작성
            </button>
          </div>
        )}
      </header>

      <main className="flex-1 flex flex-col max-w-3xl w-full mx-auto px-8 py-10 gap-4">
        {!hasResult && (
          <section className="flex flex-col gap-4">
            {/* Actor name tags — required */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  출연 배우
                  <span className="ml-1 text-xs" style={{ color: '#c0392b' }}>필수</span>
                </span>
                <button
                  onClick={() => setShowTips(v => !v)}
                  className="text-xs transition-colors"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  작성 도움말 {showTips ? '▲' : '▼'}
                </button>
              </div>

              {showTips && (
                <ul
                  className="rounded-lg px-4 py-3 flex flex-col gap-1"
                  style={{ background: '#f0f4ff', border: '1px solid #c7d4f0' }}
                >
                  {FORMAT_TIPS.map((tip, i) => (
                    <li key={i} className="text-sm" style={{ color: '#3a4a6b' }}>
                      · {tip}
                    </li>
                  ))}
                </ul>
              )}

              <div
                className="flex flex-wrap items-center gap-2 rounded-xl px-4 py-3 min-h-[48px] cursor-text"
                style={{
                  background: 'var(--color-surface)',
                  border: `1px solid ${triedWithoutActors && actorNames.length === 0 ? '#c0392b' : 'var(--color-border)'}`,
                }}
                onClick={() => document.getElementById('actor-input')?.focus()}
              >
                {actorNames.map(name => (
                  <span
                    key={name}
                    className="flex items-center gap-1 text-sm px-2.5 py-0.5 rounded-full"
                    style={{ background: 'var(--color-accent)', color: 'var(--color-accent-fg)' }}
                  >
                    {name}
                    <button
                      onClick={e => { e.stopPropagation(); removeActor(name) }}
                      className="hover:opacity-70 transition-opacity leading-none"
                      style={{ fontSize: '11px' }}
                    >
                      ✕
                    </button>
                  </span>
                ))}
                <input
                  id="actor-input"
                  value={actorInput}
                  onChange={e => { setActorInput(e.target.value); setTriedWithoutActors(false) }}
                  onKeyDown={handleActorKeyDown}
                  onBlur={() => { if (actorInput.trim()) addActor(actorInput) }}
                  placeholder={actorNames.length === 0 ? '배우 이름 입력 후 Enter (예: 루리, 하울, 단우)' : '추가...'}
                  disabled={isLoading}
                  className="flex-1 min-w-[180px] outline-none text-sm bg-transparent"
                  style={{ color: 'var(--color-text-primary)' }}
                />
              </div>

              {triedWithoutActors && actorNames.length === 0 && (
                <p className="text-xs" style={{ color: '#c0392b' }}>
                  배우 이름을 하나 이상 등록해야 분석할 수 있어요.
                </p>
              )}
            </div>

            {/* Feedback textarea */}
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder={"피드백을 자유롭게 입력하세요.\n\n예)\n1장\n루리 – 톤이 너무 낮아졌어\n하울 – 호흡이 없는데 랩 하냐?\n단우 – 너무 엄마 같다"}
              disabled={isLoading}
              rows={14}
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
                onClick={handleAnalyzeClick}
                disabled={isLoading || !feedback.trim()}
                className="px-6 py-2.5 rounded-lg text-sm font-medium transition-opacity disabled:opacity-40"
                style={{ background: 'var(--color-accent)', color: 'var(--color-accent-fg)' }}
              >
                {isLoading ? '분석 중...' : '분석하기'}
              </button>
            </div>

            {appState.status === 'error' && (
              <p className="text-sm text-red-500">{appState.message}</p>
            )}
          </section>
        )}

        {/* Result */}
        {hasResult && appState.status === 'result' && (
          <section
            className="flex flex-col gap-0 rounded-xl overflow-hidden"
            style={{ border: '1px solid var(--color-border)' }}
          >
            <div
              className="flex overflow-x-auto"
              style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}
            >
              {Object.keys(appState.actors)
                .sort((a, b) => {
                  const order = (k: string) => k === '전원' ? 1 : k === '기타' ? 2 : 0
                  return order(a) - order(b)
                })
                .map((name) => (
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
