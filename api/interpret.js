
// Vercel Serverless Function
// Gemini API를 이용한 상세 사주 풀이

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "POST 요청만 사용할 수 있습니다."
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "GEMINI_API_KEY 환경 변수가 설정되지 않았습니다."
    });
  }

  try {
    const { chart = {}, mode = "full" } = req.body || {};

    const modeNames = {
      full: "종합 사주 상세 보고서",
      today: "오늘의 운세",
      wealth: "재물운 상세 풀이",
      love: "연애·결혼운 상세 풀이",
      year2027: "2027년 운세 보고서"
    };

    const isFull = mode === "full";

    const lengthGuide = isFull
      ? "최소 10,000자 이상을 목표로 상세하게 작성하세요. 각 항목을 충분히 설명하고 짧게 요약하지 마세요."
      : "최소 3,000자 이상으로 상세하게 작성하세요.";

    const prompt = `
당신은 동양 명리학의 전통적 해석을 설명하는 전문 안내자입니다.

아래 사주 데이터를 바탕으로 이해하기 쉬운 한국어 보고서를 작성하세요.

[작성 원칙]

1. 입력 데이터에 없는 간지, 오행 수치, 십성, 대운 등을 임의로 만들지 마세요.
2. 계산되지 않은 정보는 정확히 산출된 것처럼 표현하지 마세요.
3. 사주 해석은 전통 명리학에 따른 참고 자료이며 확정된 미래 예언이 아닙니다.
4. 건강 부분은 질병 진단이나 수명 예측을 하지 말고 생활 습관에 관한 일반적인 조언만 작성하세요.
5. 재물운은 소비, 저축, 자산 관리 관점에서 설명하세요.
6. 불안을 조장하거나 불행을 단정하는 표현을 사용하지 마세요.
7. 반복되는 문장으로 분량을 채우지 말고 구체적으로 설명하세요.
8. 입력된 사주 정보의 범위 안에서 해석하세요.

[보고서 종류]
${modeNames[mode] || modeNames.full}

[작성 분량]
${lengthGuide}

[사주 입력 정보]
${JSON.stringify(chart, null, 2)}

[종합 사주 상세 보고서 목차]

1. 사주 정보 확인 및 기본 구성
- 입력된 출생 정보 확인
- 년주, 월주, 일주, 시주 설명
- 현재 계산된 정보와 계산되지 않은 정보 구분

2. 타고난 성격과 기질
- 기본적인 성향
- 생각과 행동의 특징
- 감정 표현과 대인관계

3. 장점과 보완할 점
- 타고난 강점
- 주의할 성향
- 균형을 잡는 방법

4. 직업운과 사업운
- 직업 선택에서 고려할 점
- 조직생활과 독립적인 업무
- 사업과 직장생활에 관한 참고 해석
- 장기적인 역량 개발 방향

5. 재물운과 금전 관리
- 돈을 관리하는 성향
- 소비와 저축 습관
- 재정 관리에서 주의할 점
- 현실적인 자산 관리 방법

6. 연애운과 결혼운
- 연애할 때의 성향
- 배우자 관계에서 고려할 점
- 소통과 갈등 관리
- 안정적인 관계를 위한 조언

7. 가족운과 대인관계
- 가족과의 관계
- 주변 사람들과의 소통
- 인간관계에서 주의할 점

8. 건강과 생활 습관
- 전통 명리학적 관점의 일반적인 참고사항
- 규칙적인 생활과 휴식에 관한 조언
- 의학적 진단이나 질병 예측 금지

9. 인생의 흐름과 시기별 계획
- 대운 정보가 제공된 경우에만 해당 정보를 근거로 설명
- 대운 정보가 없으면 정확한 분석이 어렵다고 밝히기
- 인생 단계별 현실적인 계획 제안

10. 2027년을 준비하는 방향
- 개인 세운 정보가 없으면 개인 운세를 단정하지 않기
- 직업, 재물, 관계, 생활 관리에 관한 준비 방향

11. 종합 정리와 실천 조언
- 핵심 내용 정리
- 일상에서 실천할 수 있는 구체적인 제안

[다른 풀이 모드]
오늘의 운세: 하루의 태도, 소통, 일정과 지출 관리
재물운: 수입·지출 균형과 금전 관리 습관
연애운: 관계의 소통과 기대 조율
2027년 운세: 계산된 개인 세운 정보가 없다면 미래를 단정하지 말고 현실적인 계획 중심으로 작성

소제목을 사용하고 각 항목을 충분히 설명하세요.
보고서 본문만 출력하세요.
`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: isFull ? 8192 : 4096
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || "Gemini API 요청에 실패했습니다."
      });
    }

    const interpretation =
      data?.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("\n")
        .trim() || "";

    if (!interpretation) {
      return res.status(502).json({
        error: "AI 풀이 결과가 비어 있습니다. 다시 시도해 주세요."
      });
    }

    return res.status(200).json({
      title: modeNames[mode] || "AI 사주 상세 풀이",
      interpretation
    });

  } catch (error) {
    return res.status(500).json({
      error: error.message || "서버 처리 중 오류가 발생했습니다."
    });
  }
}
