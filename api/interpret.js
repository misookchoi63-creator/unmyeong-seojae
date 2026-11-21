
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
      year2027: "2027년 운세 상세 보고서"
    };

    const daewoon =
      chart.daewoon ?? chart.luck?.daewoon ?? null;

    const sewoon =
      chart.sewoon ?? chart.luck?.sewoon ?? null;

    const hasDaewoon = Array.isArray(daewoon)
      ? daewoon.length > 0
      : Boolean(daewoon);

    const hasSewoon = Array.isArray(sewoon)
      ? sewoon.length > 0
      : Boolean(sewoon);

    const isFull = mode === "full";

    const prompt = `
당신은 전통 명리학을 바탕으로 사주를 설명하는 전문 안내자입니다.

아래 입력 데이터에 실제로 포함된 정보만 근거로 한국어 보고서를 작성하세요.

[작성 원칙]

1. 입력에 없는 간지, 오행 수치, 십성, 대운, 세운을 임의로 만들지 마세요.
2. 대운·세운 자료가 제공되면 실제 간지와 시작 나이, 기간을 활용하세요.
3. 자료가 없으면 계산된 것처럼 풀이하지 마세요.
4. 대운은 약 10년 단위의 큰 흐름이며 세운은 특정 연도의 흐름입니다.
5. 대운별로 직업, 재물, 연애, 가족관계의 흐름을 설명하세요.
6. 세운은 해당 연도의 간지를 근거로 설명하세요.
7. 대운과 세운의 상호작용은 실제 자료에 근거해서만 설명하세요.
8. 사주 해석은 전통 명리학에 따른 참고 자료이며 확정된 미래 예언이 아닙니다.
9. 건강은 의학적 진단이나 질병 예측을 하지 마세요.
10. 재물운은 투자 권유가 아닌 소비와 저축 관리 관점으로 설명하세요.
11. 불안을 조장하거나 불행을 단정하지 마세요.
12. 반복되는 문장으로 분량을 채우지 마세요.

[보고서 종류]
${modeNames[mode] || modeNames.full}

[분량]
${isFull
  ? "최소 10,000자 이상을 목표로 충분히 상세하게 작성하세요."
  : "최소 3,000자 이상으로 상세하게 작성하세요."}

[대운 자료]
${hasDaewoon
  ? "대운 자료가 제공되었습니다. 아래 실제 데이터를 활용하세요."
  : "대운 자료가 없습니다. 임의로 계산하지 말고 미계산 상태라고 표시하세요."}

[세운 자료]
${hasSewoon
  ? "세운 자료가 제공되었습니다. 아래 실제 데이터를 활용하세요."
  : "세운 자료가 없습니다. 임의로 계산하지 말고 미계산 상태라고 표시하세요."}

[전체 사주 데이터]
${JSON.stringify(chart, null, 2)}

[상세 보고서 목차]

1. 출생 정보와 사주 원국 확인
2. 타고난 성격과 기질
3. 강점과 보완할 점
4. 직업운과 사업운
5. 재물운과 금전 관리
6. 연애운과 결혼운
7. 가족운과 대인관계
8. 건강과 생활 습관
9. 대운 상세 분석
   - 대운 시작 나이와 시작 시점
   - 각 대운의 간지와 기간
   - 직업, 재물, 연애, 가족관계의 흐름
   - 각 시기에 참고할 현실적인 조언
10. 세운 상세 분석
   - 제공된 연도별 간지
   - 연도별 직업운과 재물운
   - 연애와 대인관계
   - 해당 연도의 주의점과 준비 방향
11. 대운과 세운을 함께 살펴보는 시기별 계획
12. 인생 전반에 대한 종합 조언

대운 자료가 없으면 대운 분석을 계산한 것처럼 작성하지 마세요.
세운 자료가 없으면 연도별 간지를 추측하지 마세요.

2027년 운세도 2027년 세운 정보가 제공된 경우에만 개인 운세로 풀이하세요.

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
        error:
          data?.error?.message ||
          "Gemini API 요청에 실패했습니다."
      });
    }

    const interpretation =
      data?.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("\n")
        .trim() || "";

    if (!interpretation) {
      return res.status(502).json({
        error: "AI 풀이 결과가 비어 있습니다."
      });
    }

    return res.status(200).json({
      title: modeNames[mode] || "AI 사주 상세 풀이",
      interpretation
    });

  } catch (error) {
    return res.status(500).json({
      error:
        error?.message ||
        "서버 처리 중 오류가 발생했습니다."
    });
  }
}
