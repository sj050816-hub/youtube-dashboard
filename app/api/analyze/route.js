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
                text: `다음 유튜브 영상 제목이 왜 조회수가 잘 나올 수 있는지 한국어로 짧게 분석해줘.

제목: ${title}

형식:
- 성공 이유:
- 반복 가능한 제목 패턴:
- 비슷하게 만들 수 있는 제목 예시 3개:`,
              },
            ],
          },
        ],
      }),
    }
  );

  const data = await res.json();

  if (!res.ok) {
    console.log("Gemini API 에러:", data);
    return Response.json({
      result: "분석 실패: Gemini API 키나 모델 설정을 확인해야 합니다.",
    });
  }

  return Response.json({
    result: data.candidates?.[0]?.content?.parts?.[0]?.text || "분석 실패",
  });
}