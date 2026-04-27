import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '배우 피드백 분리기',
  description: '연출가의 피드백을 배우별로 자동 분리합니다',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  )
}
