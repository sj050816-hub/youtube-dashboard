export async function POST(req) {
  const { title, channelTitle } = await req.json();

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
다음 유튜브 정보를 보고 반드시 아래 카테고리 중 하나로만 분류해.

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
기타

[강력 규칙]
- 가수, 아이돌, MV, 공연, 댄스, 예능, 쇼 → 무조건 "음악 / 엔터"
- beauty, makeup, fashion → "뷰티 / 패션"
- tech, ai, coding → "AI / IT"
- 먹방, 요리 → "음식"

[출력 규칙]
👉 반드시 카테고리 이름만 1개 출력 (설명 금지)

제목: ${title}
채널명: ${channelTitle}
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

  let result =
    data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "기타";

  // 🔥 강제 정제 (핵심)
  const validCategories = [
    "AI / IT",
    "전자제품",
    "음식",
    "비즈니스",
    "상품 / 추천",
    "뷰티 / 패션",
    "건강 / 운동",
    "여행",
    "음악 / 엔터",
    "기타",
  ];

  const matched = validCategories.find((c) => result.includes(c));

  return Response.json({
    category: matched || "기타",
  });
}