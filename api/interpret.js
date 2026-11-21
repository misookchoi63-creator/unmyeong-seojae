
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
    const isYear2027 = mode === "year2027";

    let reportGuide = "";

    if (isFull) {
      reportGuide = `
[종합 사주 보고서 작성 지침]

이 보고서는 한 사람의 타고난 사주와 인생 전반을 분석하는 보고서입니다.

다음 항목을 중심으로 작성하세요.

1. 출생 정보와 사주 원국 확인
2. 년주, 월주, 일주, 시주 해석
3. 타고난 성격과 기질
4. 장점과 보완할 점
5. 직업운과 사업운
6. 재물운과 금전 관리 성향
7. 연애운과 결혼운
8. 가족운과 대인관계
9. 건강과 생활 습관
10. 인생 전반의 대운 분석
11. 인생의 주요 변화와 대응 방향
12. 종합 조언

[대운 분석 특별 지침]

대운은 10년 단위의 큰 흐름만 분석하세요.

- 각 대운의 간지
- 대운 시작 나이와 기간
- 해당 대운의 전반적인 특징
- 직업과 사업의 흐름
- 재물과 경제적인 변화
- 연애, 결혼, 가족관계의 흐름
- 그 시기에 참고할 조언

중요: 대운 하나 안에서 1년씩 나누어 연도별 운세를 나열하지 마세요.
대운별 연도 목록이나 연도별 간지 목록도 만들지 마세요.
대운의 큰 흐름과 10년 단위의 특징만 설명하세요.

2027년의 상세 운세를 별도로 길게 풀이하지 마세요.
2027년은 종합 사주에서 반복적으로 다루지 말고, 필요하면 간단히 언급하세요.

대운 자료가 없으면 임의로 만들어내지 마세요.
`;
    } else if (isYear2027) {
      reportGuide = `
[2027년 운세 전문 보고서 작성 지침]

이 보고서는 오직 2027년 한 해의 운세를 집중적으로 분석하는 보고서입니다.

종합 사주 보고서처럼 타고난 성격이나 인생 전체를 길게 설명하지 마세요.
종합 사주에서 다룰 내용을 반복하지 마세요.

다음 항목을 중심으로 작성하세요.

1. 2027년 전체 운세와 핵심 흐름
2. 2027년 개인 세운과 사주 원국의 관계
3. 직장운과 사업운
4. 재물운과 금전 관리
5. 연애운과 결혼운
6. 가족운과 대인관계
7. 건강과 생활 습관
8. 새로운 기회와 조심할 부분
9. 상반기와 하반기의 흐름
10. 2027년에 실천하면 좋은 생활 방향

[2027년 분석 규칙]

- 제공된 사주 원국과 2027년 세운 자료를 근거로 풀이하세요.
- 세운 자료에서 2027년에 해당하는 정보만 사용하세요.
- 2027년 간지가 입력되어 있지 않으면 임의로 만들어내지 마세요.
- 확인되지 않은 월별 운세나 날짜를 지어내지 마세요.
- 상반기와 하반기 구분도 실제 자료가 뒷받침하는 범위에서만 설명하세요.
- 대운과 2027년 세운의 관계는 실제 입력 자료가 있을 때만 설명하세요.
- 2027년 한 해에 집중하고 다른 연도의 운세를 나열하지 마세요.

2027년의 직업, 재물, 애정, 건강, 인간관계에서 어떤 점을 살피면 좋을지 구체적으로 설명하세요.
`;
    } else if (mode === "wealth") {
      reportGuide = `
[재물운 전문 분석]
돈을 관리하는 성향, 수입과 지출, 저축 습관, 경제활동의 특징을 중심으로 설명하세요.
투자 성공이나 큰돈을 얻는 시기를 단정하지 마세요.
`;
    } else if (mode === "love") {
      reportGuide = `
[연애·결혼운 전문 분석]
연애 성향, 배우자 관계, 결혼생활, 소통 방식, 갈등 관리와 관계 개선 방향을 중심으로 설명하세요.
`;
    } else if (mode === "today") {
      reportGuide = `
[오늘의 운세]
오늘의 날짜가 입력되어 있지 않다면 날짜를 임의로 만들지 마세요.
하루의 태도, 대인관계, 일정, 소비와 지출 관리에 관한 참고 조언을 작성하세요.
`;
    }

    const lengthGuide = isFull
      ? "가능한 범위에서 10,000자 이상을 목표로 상세하게 작성하세요."
      : "약 3,000자 이상을 목표로 충분히 구체적으로 작성하세요.";

    const prompt = `
당신은 전통 명리학을 바탕으로 사주를 설명하는 전문 안내자입니다.

아래 입력 데이터에 실제로 포함된 정보만 근거로 한국어 보고서를 작성하세요.

[공통 작성 원칙]

1. 입력에 없는 간지, 오행 수치, 십성, 대운, 세운을 임의로 만들지 마세요.
2. 계산되지 않은 정보는 정확하게 산출된 것처럼 표현하지 마세요.
3. 제공된 대운과 세운의 실제 데이터를 우선적으로 활용하세요.
4. 대운은 약 10년 단위의 큰 흐름이며 세운은 특정 연도의 흐름입니다.
5. 대운과 세운의 상호작용은 실제 자료가 있을 때만 설명하세요.
6. 사주 해석은 전통 명리학에 따른 참고 자료이며 확정된 미래 예언이 아닙니다.
7. 건강 부분은 의학적 진단이나 질병 예측을 하지 마세요.
8. 재물운은 투자 권유가 아닌 소비와 저축 관리 관점에서 설명하세요.
9. 불안을 조장하거나 불행을 단정하지 마세요.
10. 같은 내용을 여러 항목에서 반복하지 마세요.
11. 근거가 부족한 부분은 부족하다고 명확히 밝혀주세요.
12. 실제 생활에 도움이 되는 구체적인 조언을 작성하세요.

[보고서 종류]
${modeNames[mode] || modeNames.full}

[작성 분량]
${lengthGuide}

[대운 데이터 상태]
${hasDaewoon
  ? "대운 자료가 제공되었습니다. 실제 입력된 자료만 활용하세요."
  : "대운 자료가 없습니다. 임의로 계산하거나 만들어내지 마세요."}

[세운 데이터 상태]
${hasSewoon
  ? "세운 자료가 제공되었습니다. 실제 입력된 자료만 활용하세요."
  : "세운 자료가 없습니다. 임의로 계산하거나 만들어내지 마세요."}

[사주 전체 입력 데이터]
${JSON.stringify(chart, null, 2)}

[이번 보고서의 개별 작성 지침]
${reportGuide}

[중복 방지 규칙]

종합 사주와 2027년 운세는 목적이 서로 다릅니다.

종합 사주는 타고난 사주와 인생 전체의 큰 흐름을 설명합니다.
2027년 운세는 2027년 한 해에 발생할 수 있는 흐름과 대응 방향을 설명합니다.

두 보고서의 목차와 설명을 그대로 반복하지 마세요.
같은 성향을 설명하더라도 보고서의 목적에 맞는 새로운 관점으로 작성하세요.

특히 대운의 연도별 나열은 하지 마세요.
대운은 10년 단위의 흐름으로만 분석하세요.

[최종 작성 방식]

- 읽기 편한 소제목을 사용하세요.
- 각 항목은 구체적으로 설명하세요.
- 불필요한 서론과 같은 내용의 반복을 줄이세요.
- 보고서 본문만 출력하세요.
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
