
export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "POST 방식으로 요청해야 합니다." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      success: false,
      error: "GEMINI_API_KEY가 설정되어 있지 않습니다. Vercel 환경변수를 확인해 주세요."
    });
  }

  const chart = req.body?.chart;
  const mode = req.body?.mode || "full";
  const allowedModes = ["full", "today", "wealth", "love", "year2027"];

  if (!chart?.pillars) {
    return res.status(400).json({ success: false, error: "사주 정보가 전달되지 않았습니다. 사주 원국을 먼저 계산해 주세요." });
  }
  if (!allowedModes.includes(mode)) {
    return res.status(400).json({ success: false, error: "지원하지 않는 분석 항목입니다." });
  }

  const modeNames = {
    full: "종합 사주 심층 분석",
    today: "오늘의 운세",
    wealth: "평생 재물운·직업운·말년 재물 창고 분석",
    love: "애정운·결혼운·재혼운",
    year2027: "2027년 신년 운세"
  };

  const chartData = {
    이름: chart.name || "이름 미입력",
    성별: chart.gender || "미상",
    혼인상태: chart.maritalStatus || "미상",
    달력구분: chart.calendar || "미상",
    양력생일: chart.solarDate || "미상",
    음력생일: chart.lunarDate || "미상",
    띠: chart.zodiac || "미상",
    출생시간: chart.birthHour || "미상",
    출생시간확인여부: chart.hasBirthHour ? "확인됨" : "모름",
    출생지역: chart.place || "미입력",
    사주원국: chart.pillars || {},
    대운자료: Array.isArray(chart.daewoon) ? chart.daewoon : [],
    심층계산자료: chart.advanced || {},
    오행출현집계: chart.elementCount || {},
    계산상주의사항: Array.isArray(chart.calculationNotes) ? chart.calculationNotes : []
  };

  const commonRules = `
당신은 전통 자평명리학의 원리를 깊이 이해하고 있는 사주 해석 전문가입니다.
제공된 사주 원국과 심층 계산 자료만을 근거로 해석합니다.

[절대 준수]
1. 제공되지 않은 간지, 대운, 세운, 월운, 출생 정보, 사건을 만들지 마세요.
2. 계산 자료가 없거나 출생 시각이 미상이면 해당 분석의 한계를 명시하세요.
3. 전통 명리학에 따른 참고 해석이며 과학적으로 검증된 미래 예측처럼 표현하지 마세요.
4. 합·충·형·파·해를 분석하거나 언급하지 마세요. 해당 독립 항목·표·설명을 만들지 마세요.
5. 오행 개수만으로 신강·신약, 용신, 재물운의 길흉을 결정하지 마세요.
6. 용신·격국·조후는 실제 계산 근거가 전달된 경우에만 해석하고, 자료가 없으면 확정하지 마세요.
7. 실제 통계가 없는 확률·퍼센트를 만들지 마세요.
8. 질병명, 사망, 사고 시기, 이혼, 외도, 재물 획득을 확정적으로 예언하지 마세요.
9. 사용자가 제공하지 않은 직업·재산·가족관계·연애 경험을 사실처럼 쓰지 마세요.
10. 이름은 호칭에만 사용하고 한자·획수를 추정하지 마세요.
11. 대운·세운의 시기는 전달된 시작 나이·연도·간지와 정확히 연결하세요.
12. 지장간은 자료에 제공된 순서를 유지하세요. 지장간에 포함된 글자가 있다는 이유만으로 실제 사건을 단정하지 마세요.
13. 재물 창고는 진·술·축·미가 원국에 있는지만으로 확정하지 마세요. 일간 기준 십성, 지장간, 월령, 원국 전체의 균형, 대운·세운을 함께 살피세요.
14. 창고가 있다고 무조건 부자가 되거나, 창고가 열리면 반드시 돈이 생긴다고 쓰지 마세요.
15. 시주는 말년 해석의 참고 요소 중 하나입니다. 출생 시각 미상이라면 시주 기반 말년 분석을 제외하세요.
16. 돈을 버는 능력, 현금흐름, 자산을 지키는 능력은 구분해서 설명하세요.
17. 좋은 흐름과 주의할 흐름을 함께 제시하고, 실생활에서 취할 수 있는 조언으로 연결하세요.
18. 자연스럽고 이해하기 쉬운 한국어를 사용하고 전문 용어는 처음 나올 때 풀이하세요.
`;

  const prompts = {
    full: `
${commonRules}
# 운명의 서재 | 종합 사주 심층 보고서

## 1장. 출생 정보와 해석 범위
입력 정보, 출생 시각 확인 여부, 계산상 주의사항을 설명하세요.

## 2장. 사주 핵심 요약
원국에서 확인되는 중심 특징, 강점, 주의점, 삶의 방향을 정리하세요.

## 3장. 일간과 타고난 기질
일간의 오행·음양, 월령과의 관계, 성향과 생활 속 발현을 설명하세요.

## 4장. 네 기둥과 지장간
년주·월주·일주·시주의 역할, 천간과 지장간, 제공된 십성을 해석하세요. 시주 미상은 제외하세요.

## 5장. 오행과 계절의 균형
월령·계절·오행 분포를 함께 살피고 단순 개수만으로 강약을 판정하지 마세요.

## 6장. 십성의 작용
비겁·식상·재성·관성·인성의 배치와 실제 생활에서 나타날 수 있는 경향을 설명하세요. 계산자료에 없는 십성은 만들지 마세요.

## 7장. 인간관계와 가족
원국에서 뒷받침되는 관계 성향과 현실적인 조언을 제시하세요.

## 8장. 직업과 적성
업무 방식, 조직·독립 업무 적성, 강점을 살릴 환경을 설명하세요.

## 9장. 평생 재물 구조
수입을 만드는 방식, 재성의 위치와 십성, 돈을 모으고 지키는 성향을 구분해 설명하세요.

## 10장. 재물 창고와 말년 재물운
진·술·축·미의 원국 위치, 해당 지지의 지장간, 일간 기준 십성 중 재성 여부를 확인하세요. 시주가 있으면 말년의 참고 요소로 함께 해석하세요. 창고가 있다는 사실만으로 재물운을 단정하지 마세요.

## 11장. 대운과 인생 후반의 변화
전달된 대운을 시작 나이·연도·간지 그대로 표로 정리하고 각 시기의 주제를 설명하세요. 자료가 없으면 추측하지 마세요.

## 12장. 연도별 재물 흐름
전달된 세운 자료가 있는 경우에만 재물·직업·지출 관리 관점으로 분석하세요. 자료가 없으면 한계를 밝히세요.

## 13장. 애정·결혼과 배우자 관계
관계 성향과 혼인 상태에 맞는 조언을 제시하세요. 결혼 시기는 자료가 충분할 때만 범위로 설명하세요.

## 14장. 건강·생활 관리와 실천 조언
질병을 예언하지 말고 생활 습관 중심으로 설명하세요. 재정·관계·일상에서 실행할 조언으로 마무리하세요.

각 장은 서로 반복하지 말고 근거와 해석을 연결하세요. 장문 전문가 보고서로 작성하되 자료가 없는 부분을 억지로 채우지 마세요.
`,
    today: `
${commonRules}
# 운명의 서재 | 오늘의 운세
오늘 날짜를 임의로 만들지 마세요. 제공된 원국에서 확인할 수 있는 성향을 바탕으로 실용적인 하루 조언을 작성하세요.
## 1. 오늘의 핵심 흐름
## 2. 일과 업무
## 3. 재물과 소비
## 4. 인간관계와 애정
## 5. 컨디션 관리
## 6. 오늘의 실천 조언
오늘의 정확한 일진 자료가 제공되지 않았다면 특정 일진에 근거한 것처럼 말하지 마세요. 종합 사주 풀이를 반복하지 마세요.
`,
    wealth: `
${commonRules}
# 운명의 서재 | 평생 재물운·직업운·말년 재물 창고 심층 보고서

## 1. 타고난 재물 구조
일간을 기준으로 재성(정재·편재)의 의미와 원국 내 위치를 확인하세요. 재성이 전달되지 않았다면 임의로 계산하지 말고 자료가 부족하다고 밝혀 주세요.

## 2. 돈을 버는 방식
식상과 재성의 연결, 관성·인성·비겁의 작용이 계산 자료에 있을 때 해석하세요. 소득 창출 방식과 업무 환경을 구분하세요.

## 3. 재물 창고 진술축미 분석
원국의 진(辰)·술(戌)·축(丑)·미(未)가 어느 기둥에 있는지 표로 정리하세요. 각 창고의 지장간을 제시하고, 일간 기준 십성 중 정재·편재가 포함되는지 확인하세요. 지장간의 주기·중기·여기 순서를 임의로 바꾸지 마세요. 창고 글자만으로 부자 여부를 판정하지 마세요.

## 4. 시주와 말년 재물운
출생 시각이 확인된 경우에만 시주의 천간·지지·지장간·십성을 분석하세요. 말년의 소득 활동, 자산 관리, 생활 안정 가능성을 참고 관점으로 설명하세요. 시주가 미상이면 이 장의 판단 한계를 분명히 밝히세요.

## 5. 초년·중년·말년 재물 흐름
원국의 네 기둥을 참고해 생애 단계별 재물 관련 성향을 설명하되, 실제 대운 연령과 연결할 수 있을 때만 시기를 제시하세요. 단순히 년주·월주·일주·시주를 기계적으로 나이와 일대일 대응하지 마세요.

## 6. 대운별 재물 변화
대운 자료를 시작 나이·시작 연도·간지 그대로 표로 정리하세요. 각 대운의 천간·지지에 대해 전달된 정보 범위에서 재물 관련 십성 여부를 설명하세요. 자료에 없는 대운은 만들지 마세요.

## 7. 세운·월운의 기회와 주의점
연도별·월별 흐름 자료가 있을 때만 분석하세요. 월운 대표일 기준 자료라면 절입 경계에서 달라질 수 있음을 표시하세요. 금전 유입을 보장하지 말고 수입·지출·투자 판단의 주의점으로 표현하세요.

## 8. 돈을 지키는 힘
비겁, 인성, 관성, 일간의 상태 등 실제 제공된 근거를 이용해 재물 유지·관리 성향을 설명하세요. 신강·신약이 계산되지 않았다면 단정하지 마세요.

## 9. 직업·사업·자산 형성
직장 소득, 사업·프리랜스, 장기 자산관리의 적합한 조건을 설명하세요. 특정 투자 상품이나 매수 시점을 권유하지 마세요.

## 10. 평생 재물운 종합 결론
재물을 만드는 방식, 지키는 방식, 주의할 시기, 현실적인 관리 원칙을 정리하세요.
`,
    love: `
${commonRules}
# 운명의 서재 | 애정운·결혼운·재혼운 심층 보고서
## 1. 사랑을 대하는 성향
## 2. 연애 관계의 특징
## 3. 배우자 인연의 특징
## 4. 결혼생활에서 중요하게 살필 점
## 5. 결혼 시기와 인연의 흐름
대운·세운 근거가 있을 때만 범위로 제시하세요.
## 6. 미혼·연애 중인 경우
## 7. 기혼인 경우
## 8. 이혼한 경우의 새로운 관계 가능성
## 9. 사별한 경우의 새로운 인연과 마음의 준비
## 10. 재혼 가능성
재혼을 확정하거나 보장하지 말고 자료가 뒷받침하는 범위에서만 설명하세요.
## 11. 관계를 편안하게 만드는 현실적인 조언
혼인 상태에 맞춰 작성하고 실제 경험을 꾸며 쓰지 마세요.
`,
    year2027: `
${commonRules}
# 운명의 서재 | 2027년 신년 운세 심층 보고서
2027년 자료가 전달되지 않은 항목은 임의로 계산했다고 주장하지 마세요.
## 1. 2027년 전체 흐름
## 2. 직업과 사회생활
## 3. 재물운과 자산 관리
## 4. 애정과 부부 관계
## 5. 가족과 인간관계
## 6. 생활 리듬과 건강 관리
## 7. 2027년 월별 흐름
월별 자료가 제공된 경우에만 간지에 근거한 해석을 하세요. 월별 대표일 자료라면 절입 경계에서 달라질 수 있음을 밝히세요. 자료가 없으면 월별 간지 예측을 만들지 말고 일반적인 계획 조언으로 구분하세요.
## 8. 잡아야 할 기회
## 9. 조심해야 할 선택
## 10. 2027년 최종 조언
`
  };

  const prompt = `
${prompts[mode]}

[사용자 사주 데이터]
${JSON.stringify(chartData, null, 2)}

[최종 조건]
- 보고서 제목: ${modeNames[mode]}
- 계산 자료에 없는 정보는 추측하지 마세요.
- 표가 유용한 곳은 Markdown 표를 사용하세요.
- 합·충·형·파·해 관련 분석·용어·독립 항목은 출력하지 마세요.
- 해석 근거와 불확실성을 함께 제시하세요.
`;

  // Google Gemini API의 현재 모델 목록에 있는 Flash-Lite 모델
  const model = "gemini-3.5-flash-lite";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.55,
          topP: 0.9,
          maxOutputTokens: mode === "full" ? 16000 : mode === "wealth" ? 14000 : 9000
        }
      })
    });

    const rawText = await response.text();
    let result;
    try {
      result = JSON.parse(rawText);
    } catch {
      console.error("Gemini non-JSON response:", rawText.slice(0, 1200));
      return res.status(502).json({
        success: false,
        error: `Gemini 서버가 JSON이 아닌 응답을 반환했습니다. HTTP ${response.status}: ${rawText.slice(0, 500)}`
      });
    }

    if (!response.ok) {
      const apiMessage = result?.error?.message || "Gemini API 요청에 실패했습니다.";
      console.error("Gemini API error:", response.status, apiMessage);
      return res.status(response.status >= 400 && response.status <= 599 ? response.status : 502).json({
        success: false,
        error: `Gemini 오류 (${response.status}): ${apiMessage}`
      });
    }

    const candidate = result?.candidates?.[0];
    const interpretation = candidate?.content?.parts?.map(part => part.text || "").join("\n").trim();

    if (!interpretation) {
      return res.status(502).json({
        success: false,
        error: `AI 응답이 비어 있습니다. 응답 상태: ${candidate?.finishReason || "응답 내용 없음"}`
      });
    }

    return res.status(200).json({
      success: true,
      mode,
      title: modeNames[mode],
      interpretation,
      finishReason: candidate?.finishReason || null
    });
  } catch (error) {
    console.error("Gemini API error:", error);
    return res.status(500).json({
      success: false,
      error: `서버에서 AI 분석을 처리하지 못했습니다: ${error.message || "알 수 없는 오류"}`
    });
  }
}
