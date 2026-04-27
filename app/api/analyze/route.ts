import OpenAI from 'openai'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const client = new OpenAI()
  const formData = await request.formData()
  const feedback = formData.get('feedback') as string | null
  const actorNamesRaw = formData.get('actorNames') as string | null

  if (!feedback?.trim()) {
    return Response.json({ error: '피드백 내용을 입력해주세요.' }, { status: 400 })
  }

  const actorNames = actorNamesRaw
    ? actorNamesRaw.split(',').map(n => n.trim()).filter(Boolean)
    : []

  if (actorNames.length === 0) {
    return Response.json({ error: '배우 이름을 하나 이상 등록해주세요.' }, { status: 400 })
  }

  const actorList = actorNames.join(', ')

  const systemPrompt = `당신은 연극 연출가의 배우 피드백을 정리하는 도우미입니다.

출연 배우 목록: ${actorList}

이 배우 목록을 반드시 참고해 각 피드백이 어떤 배우에게 해당하는지 파악하세요.

배우 이름 인식 규칙:
- 배우 이름이 줄 맨 앞에 오면 그 줄의 주인공입니다 (예: "루리 – 피드백", "단우: 피드백")
- 한국어 호격(-아, -야)은 이름 호출입니다 (예: "세훈아" → 세훈, "루리야" → 루리)
- 배우 이름이 문장 중간에 등장해도 그 배우에 대한 피드백입니다
- 한 줄에 여러 배우가 언급되면 각 배우에게 해당 내용을 모두 포함하세요

장면/헤더 규칙:
- "1장", "2장", "약국1" 등 독립된 줄의 구분자는 헤더로 취급하세요
- 헤더 아래에 해당 배우의 피드백이 있으면 해당 헤더를 포함하세요
- 헤더 아래 해당 배우 피드백이 없으면 그 헤더는 생략하세요

키 구분:
- 개별 배우 이름: 해당 배우에게만 해당하는 피드백
- "전원": 모든 배우에게 공동으로 해당하는 피드백 ("다들", "모두", "전원", "다 같이" 등의 표현, 또는 명시적으로 모든 배우를 지칭할 때)
- "기타": 어떤 배우에게도 귀속할 수 없는 피드백 (최소화할 것)

여러 배우 동시 피드백:
- 한 줄에 2명 이상의 배우가 명시되면 각 배우의 키에 해당 내용을 모두 포함하세요
- 예: "루리 세훈 꼭 다리에서 떨어져야" → 루리, 세훈 둘 다에 포함
- 예: "다들 템포가 느리다" → "전원" 키에 포함

출력 형식:
- 반드시 JSON 형식으로만 응답하세요 (설명 없이 JSON만)
- JSON 형식: {"배우이름": "1장\\n피드백 내용\\n\\n2장\\n피드백 내용", "전원": "...", "기타": "..."}
- 피드백은 원문 내용을 최대한 유지하세요
- 배우 이름 키는 등록된 배우 목록(${actorList})의 이름을 사용하세요
- "전원", "기타" 키는 해당 내용이 없으면 생략하세요`

  const completion = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: feedback },
    ],
    response_format: { type: 'json_object' },
  })

  const text = completion.choices[0].message.content
  if (!text) {
    return Response.json({ error: '분석에 실패했습니다.' }, { status: 500 })
  }

  try {
    const actors: Record<string, string> = JSON.parse(text)
    return Response.json({ actors })
  } catch {
    return Response.json({ error: '결과를 파싱하지 못했습니다.' }, { status: 500 })
  }
}
