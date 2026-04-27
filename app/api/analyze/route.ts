import OpenAI from 'openai'
import { extractText } from 'unpdf'

const client = new OpenAI()

export async function POST(request: Request) {
  const formData = await request.formData()
  const feedback = formData.get('feedback') as string | null
  const scriptFile = formData.get('script') as File | null

  if (!feedback?.trim()) {
    return Response.json({ error: '피드백 내용을 입력해주세요.' }, { status: 400 })
  }

  let scriptText = ''
  if (scriptFile) {
    const buffer = new Uint8Array(await scriptFile.arrayBuffer())
    const { text } = await extractText(buffer, { mergePages: true })
    scriptText = text
  }

  const commonRules = `
- 피드백에 장/막/날짜/씬 등 구분 헤더(예: "1장", "2장", "11.02", "약국1" 등)가 있으면 각 배우의 피드백에도 해당 헤더를 포함하세요
- 헤더 아래에 해당 배우의 피드백이 없으면 그 헤더는 생략하세요
- 여러 배우에게 공동으로 해당하는 피드백은 해당하는 모든 배우에게 각각 포함하세요
- 피드백 줄 하나도 빠뜨리지 마세요. 누구 것인지 모호하면 관련 가능성이 있는 배우 모두에게 포함하세요
- 어떤 배우에게도 귀속할 수 없는 피드백은 "전체" 키에 넣으세요
- 반드시 JSON 형식으로만 응답하세요 (설명 없이 JSON만)
- JSON 형식: {"배우이름": "1장\\n피드백 내용\\n\\n2장\\n피드백 내용", "전체": "..."}
- 피드백은 원문 내용을 최대한 유지하세요`

  const systemPrompt = scriptText
    ? `당신은 연극 연출가의 배우 피드백을 정리하는 도우미입니다.
아래에 연극 대본과 연출 피드백이 제공됩니다. 대본 맥락을 참고하여 각 피드백이 어떤 배우에게 해당하는지 파악해주세요.

규칙:
- 배우/배역 이름이 직접 언급된 피드백은 해당 배우에게 귀속하세요
- 대본의 배역 이름, 장면, 대사 등을 참고해 어떤 배우의 피드백인지 추론하세요${commonRules}`
    : `당신은 연극 연출가의 배우 피드백을 정리하는 도우미입니다.
피드백 텍스트에서 각 배우의 이름과 그에 해당하는 피드백을 추출해주세요.

규칙:
- 배우 이름을 정확히 파악하고 그 배우에게 해당하는 피드백을 추출하세요
- 배우 이름 뒤에 오는 구분자(-, :, 공백 등)는 제거하고 피드백 내용만 남기세요${commonRules}`

  const userContent = scriptText
    ? `[대본]\n${scriptText}\n\n[피드백]\n${feedback}`
    : feedback

  const completion = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
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
