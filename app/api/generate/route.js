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
                text: `이 유튜브 제목을 기반으로 조회수가 잘 나올 수 있는 제목 5개를 만들어줘:

제목: ${title}

조건:
- 클릭 유도
- 짧고 강렬하게
- 한국어`,
              },
            ],
          },
        ],
      }),
    }
  );

  const data = await res.json();

  return Response.json({
    result: data.candidates?.[0]?.content?.parts?.[0]?.text || "생성 실패",
  });
}