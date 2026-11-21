
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "POST 요청만 허용됩니다."
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(503).json({
      error: "Vercel에 GEMINI_API_KEY를 등록해 주세요."
    });
  }

  const { chart, mode } = req.body || {};

  if (
    !chart ||
    !chart.pillars ||
    !chart.pillars.year ||
    !chart.pillars.month ||
    !chart.pillars.day
  ) {
    return res.status(400).json({
      error: "사주 계산 정보가 부족합니다."
    });
  }

  const topics = {
    full: "종합 사주풀이",
    today: "오늘의 운세. 실제 일진 데이터가 없으므로 일진을 지어내지 마세요.",
    wealth: "재물과 직업운. 투자 수익을 예언하지 마세요.",
    love: "연애와 대인관계",
    year2027: "2027년 운세. 개인별 세운 계산 데이터가 없음을 밝혀주세요."
  };

  const topic = topics[mode] || topics.full;

  const prompt = `
당신은 한국 전통 명리학을 설명하는 신중한 해설자입니다.

아래 사주 원국을 바탕으로 한국어 풀이를 작성하세요.

요청 항목: ${topic}

사주 정보:
${JSON.stringify(chart)}

작성 원칙:
1. 입력된 간지와 정보만 사용하세요.
2. 없는 오행, 십성, 대운, 세운을 만들어내지 마세요.
3. 계산되지 않은 정보는 판단할 수 없다고 밝혀주세요.
4. 질병 진단, 수명 예측, 공포 조장, 투자 권유를 하지 마세요.
5. 전통 명리학 관점의 참고 해석임을 밝혀주세요.
6. 자연스럽고 이해하기 쉬운 한국어로 작성하세요.

다음 순서로 작성하세요.
1. 풀이 제목
2. 핵심 해석
3. 강점과 주의할 점
4. 일상에서 적용할 조언
5. 해석의 한계

700~1000자 내외로 작성하세요.
`;

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
      {
        method: "POST",
        headers: {
          "x-goog-api-key": apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1400
          }
        })
      }
    );

    const payload = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error:
          payload.error?.message ||
          "Gemini API 호출에 실패했습니다."
      });
    }

    const text = (
      payload.candidates?.[0]?.content?.parts || []
    )
      .map(part => part.text || "")
      .join("\n")
      .trim();

    if (!text) {
      return res.status(502).json({
        error: "AI 응답이 비어 있습니다. 다시 시도해 주세요."
      });
    }

    return res.status(200).json({
      title:
        mode === "today" ? "오늘의 운세" :
        mode === "wealth" ? "재물·직업운 풀이" :
        mode === "love" ? "연애·대인관계 풀이" :
        mode === "year2027" ? "2027년 운세" :
        "종합 사주풀이",
      interpretation: text
    });

  } catch (error) {
    return res.status(500).json({
      error: "서버 처리 중 오류가 발생했습니다."
    });
  }
}
