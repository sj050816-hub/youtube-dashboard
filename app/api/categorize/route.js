export async function POST(req) {
  const { title } = await req.json();

  const API_KEY = process.env.GOOGLE_API_KEY;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `
다음 유튜브 제목을 반드시 아래 카테고리 중 하나로만 분류해.

[카테고리 목록]
AI / IT
전자제품
음식
비즈니스
상품 / 추천
뷰티 / 패션
건강 / 운동
여행
음악 / 엔터
뷰티/패션
기타

[중요 규칙]
- 가수, 아이돌, MV, 공연, 댄스, 예능, 쇼 → 무조건 "음악 / 엔터"
- beauty, makeup, fashion, outfit 관련은 "뷰티 / 패션"
- tech, ai, coding → "AI / IT"

제목: ${title}

반드시 카테고리 이름만 출력해.
`,
              },
            ],
          },
        ],
      }),
    }
  );

  const data = await res.json();

  if (!res.ok) {
    return Response.json({ category: "기타" });
  }

  return Response.json({
    category:
      data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "기타",
  });
}