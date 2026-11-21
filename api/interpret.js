
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST 요청만 허용됩니다." });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: "서버에 OPENAI_API_KEY가 설정되지 않았습니다. Vercel 환경변수에 API 키를 등록해 주세요."
    });
  }

  const { chart, mode } = req.body || {};
  if (!chart || !chart.pillars || !chart.pillars.year || !chart.pillars.month || !chart.pillars.day) {
    return res.status(400).json({
      error: "사주 계산 정보가 부족합니다. 생년월일을 다시 입력해 주세요."
    });
  }

  const topics = {
    full: "종합 사주풀이: 일간을 중심으로 한 기질, 성향, 강점과 주의점을 설명한다.",
    today: "오늘의 운세: 오늘의 날짜를 기준으로 참고용 생활 조언을 작성한다. 실제 일진 계산 데이터가 없으므로 사주 원국만으로 오늘의 간지를 안다고 주장하지 않는다.",
    wealth: "재물·직업운: 전통 명리학 관점의 일과 돈에 대한 성향 및 현실적인 자기관리 조언을 작성한다. 재물의 획득이나 투자 수익을 예언하지 않는다.",
    love: "연애·대인관계: 관계에서 나타날 수 있는 성향과 소통에 관한 조언을 작성한다.",
    year2027: "2027년 운세: 2027년의 간지 및 세운 상세 계산값이 입력되지 않았음을 명시하고, 확정적 예언 대신 한 해를 준비하는 참고용 조언을 제공한다."
  };

  const topic = topics[mode] || topics.full;

  const prompt = `
당신은 한국 전통 명리학 콘텐츠를 설명하는 신중한 해설자입니다.
아래에 제공된 사주 원국을 사실 데이터로 취급하세요.
간지나 오행, 십성, 대운, 세운을 임의로 계산하거나 만들어내지 마세요.
입력에 없는 세부 명리 정보는 현재 계산 데이터에 포함되지 않아 판단할 수 없다고 밝혀주세요.
현대 독자가 이해하기 쉬운 자연스러운 한국어로 작성하세요.
단정적 운명 예언, 공포 조장, 질병 진단, 수명 예측, 투자 권유를 하지 마세요.
사주 해석은 전통적 관점의 참고 콘텐츠이며 과학적으로 검증된 미래 예측이 아니라는 점을 자연스럽게 밝혀주세요.

요청 항목: ${topic}

출생정보 및 계산된 원국(JSON):
${JSON.stringify(chart)}

답변은 다음 순서로 작성하세요.
1. 풀이 제목
2. 핵심 해석
3. 강점과 주의할 점
4. 일상에서 적용할 조언
5. 해석의 한계 및 참고 안내

한국어로 700~1000자 내외로 작성하세요.
`;

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content: "전통 명리학의 문화적 해석을 신중하고 비단정적으로 설명하는 한국어 작가입니다."
          },
          { role: "user", content: prompt }
        ],
        max_output_tokens: 1400
      })
    });

    const payload = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: payload.error?.message || "AI 서비스 호출에 실패했습니다."
      });
    }

    const text = (payload.output || [])
      .filter(item => item.type === "message")
      .flatMap(item => item.content || [])
      .filter(item => item.type === "output_text")
      .map(item => item.text)
      .join("\n")
      .trim();

    if (!text) {
      return res.status(502).json({
        error: "AI 응답을 읽지 못했습니다. 잠시 후 다시 시도해 주세요."
      });
    }

    return res.status(200).json({
      title: mode === "today" ? "오늘의 운세" :
             mode === "wealth" ? "재물·직업운 풀이" :
             mode === "love" ? "연애·대인관계 풀이" :
             mode === "year2027" ? "2027년 운세" : "종합 사주풀이",
      interpretation: text
    });

  } catch (error) {
    return res.status(500).json({
      error: "서버 처리 중 오류가 발생했습니다."
    });
  }
}
