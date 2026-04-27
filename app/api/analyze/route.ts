import OpenAI from 'openai'

const client = new OpenAI()

export async function POST(request: Request) {
  const { feedback } = await request.json()

  if (!feedback?.trim()) {
    return Response.json({ error: '피드백 내용을 입력해주세요.' }, { status: 400 })
  }

  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `당신은 연극 연출가의 배우 피드백을 정리하는 도우미입니다.
피드백 텍스트에서 각 배우의 이름과 그에 해당하는 피드백을 추출해주세요.

규칙:
- 배우 이름을 정확히 파악하고 그 배우에게 해당하는 피드백만 추출하세요
- 배우 이름 뒤에 오는 구분자(-, :, 공백 등)는 제거하고 피드백 내용만 남기세요
- 텍스트에 장/막/날짜/페이지 등 구분 헤더(예: "1장", "2장", "11.02", "약국1" 등)가 있으면 각 배우의 피드백에도 해당 헤더를 포함하세요
- 헤더 아래에 해당 배우의 피드백이 없으면 그 헤더는 생략하세요
- 반드시 JSON 형식으로만 응답하세요 (설명 없이 JSON만)
- JSON 형식: {"배우이름": "1장\\n피드백 내용\\n\\n2장\\n피드백 내용", ...}
- 피드백은 원문 내용을 최대한 유지하세요`,
      },
      {
        role: 'user',
        content: feedback,
      },
    ],
    response_format: { type: 'json_object' },
  })

  const text = completion.choices[0].message.content
  if (!text) {
    return Response.json({ error: '분석에 실패했습니다.' }, { status: 500 })
  }

  try {
    const parsed = JSON.parse(text)
    const actors: Record<string, string> = parsed
    return Response.json({ actors })
  } catch {
    return Response.json({ error: '결과를 파싱하지 못했습니다.' }, { status: 500 })
  }
}
