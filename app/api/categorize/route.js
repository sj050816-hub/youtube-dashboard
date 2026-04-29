export async function POST(req) {
  const { title, channelTitle } = await req.json();

  const API_KEY = process.env.GOOGLE_API_KEY;

  const textForRule = `${title || ""} ${channelTitle || ""}`.toLowerCase();

  const ruleCategory = classifyByRule(textForRule);
  if (ruleCategory) {
    return Response.json({ category: ruleCategory });
  }

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
- 가수, 아이돌, MV, Music Video, Official Video, 노래, 앨범, 공연, 댄스, 예능, 쇼 → 무조건 "음악 / 엔터"
- 영화 예고편, 드라마 예고편, 티저, trailer, teaser → "음악 / 엔터"
- 게임, game, gameplay, brawl stars, minecraft, roblox → "음악 / 엔터"
- beauty, makeup, skincare, fashion, outfit → "뷰티 / 패션"
- tech, ai, coding, software, app → "AI / IT"
- food, 먹방, 요리, recipe → "음식"

[출력 규칙]
반드시 카테고리 이름만 1개 출력해. 설명 금지.

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

  const result =
    data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "기타";

  return Response.json({
    category: normalizeCategory(result, textForRule),
  });
}

function classifyByRule(text) {
  if (
    text.includes("music video") ||
    text.includes("official music video") ||
    text.includes("mv") ||
    text.includes("vevo") ||
    text.includes("song") ||
    text.includes("album") ||
    text.includes("lyrics") ||
    text.includes("lyric") ||
    text.includes("performance") ||
    text.includes("dance") ||
    text.includes("concert") ||
    text.includes("live") ||
    text.includes("singer") ||
    text.includes("idol") ||
    text.includes("kpop") ||
    text.includes("lady gaga") ||
    text.includes("sidhu moose wala") ||
    text.includes("찬송가") ||
    text.includes("노래") ||
    text.includes("뮤직") ||
    text.includes("가수") ||
    text.includes("아이돌") ||
    text.includes("공연") ||
    text.includes("댄스")
  ) {
    return "음악 / 엔터";
  }

  if (
    text.includes("trailer") ||
    text.includes("teaser") ||
    text.includes("movie") ||
    text.includes("drama") ||
    text.includes("netflix") ||
    text.includes("hbo") ||
    text.includes("paramount") ||
    text.includes("예고편") ||
    text.includes("티저") ||
    text.includes("영화") ||
    text.includes("드라마")
  ) {
    return "음악 / 엔터";
  }

  if (
    text.includes("game") ||
    text.includes("gaming") ||
    text.includes("gameplay") ||
    text.includes("brawl stars") ||
    text.includes("minecraft") ||
    text.includes("roblox")
  ) {
    return "음악 / 엔터";
  }

  if (
    text.includes("ai") ||
    text.includes("chatgpt") ||
    text.includes("gemini") ||
    text.includes("coding") ||
    text.includes("software") ||
    text.includes("developer") ||
    text.includes("app") ||
    text.includes("tech")
  ) {
    return "AI / IT";
  }

  if (
    text.includes("iphone") ||
    text.includes("camera") ||
    text.includes("laptop") ||
    text.includes("macbook") ||
    text.includes("gadget") ||
    text.includes("전자제품")
  ) {
    return "전자제품";
  }

  if (
    text.includes("food") ||
    text.includes("recipe") ||
    text.includes("cook") ||
    text.includes("restaurant") ||
    text.includes("먹방") ||
    text.includes("요리") ||
    text.includes("맛집")
  ) {
    return "음식";
  }

  if (
    text.includes("beauty") ||
    text.includes("makeup") ||
    text.includes("skincare") ||
    text.includes("fashion") ||
    text.includes("outfit") ||
    text.includes("뷰티") ||
    text.includes("패션") ||
    text.includes("화장품")
  ) {
    return "뷰티 / 패션";
  }

  if (
    text.includes("business") ||
    text.includes("money") ||
    text.includes("startup") ||
    text.includes("marketing") ||
    text.includes("창업") ||
    text.includes("수익")
  ) {
    return "비즈니스";
  }

  if (
    text.includes("health") ||
    text.includes("fitness") ||
    text.includes("workout") ||
    text.includes("diet") ||
    text.includes("운동") ||
    text.includes("건강") ||
    text.includes("다이어트")
  ) {
    return "건강 / 운동";
  }

  if (
    text.includes("travel") ||
    text.includes("trip") ||
    text.includes("hotel") ||
    text.includes("여행") ||
    text.includes("호텔")
  ) {
    return "여행";
  }

  if (
    text.includes("review") ||
    text.includes("best") ||
    text.includes("top") ||
    text.includes("추천") ||
    text.includes("제품") ||
    text.includes("쿠팡")
  ) {
    return "상품 / 추천";
  }

  return null;
}

function normalizeCategory(result, originalText) {
  const text = `${result || ""} ${originalText || ""}`.toLowerCase();

  if (
    text.includes("음악") ||
    text.includes("엔터") ||
    text.includes("music") ||
    text.includes("entertainment") ||
    text.includes("mv") ||
    text.includes("trailer") ||
    text.includes("teaser") ||
    text.includes("movie") ||
    text.includes("game")
  ) {
    return "음악 / 엔터";
  }

  if (
    text.includes("ai") ||
    text.includes("it") ||
    text.includes("tech") ||
    text.includes("coding") ||
    text.includes("software")
  ) {
    return "AI / IT";
  }

  if (
    text.includes("전자") ||
    text.includes("iphone") ||
    text.includes("camera") ||
    text.includes("gadget") ||
    text.includes("laptop")
  ) {
    return "전자제품";
  }

  if (
    text.includes("음식") ||
    text.includes("food") ||
    text.includes("recipe") ||
    text.includes("cook") ||
    text.includes("먹방") ||
    text.includes("요리")
  ) {
    return "음식";
  }

  if (
    text.includes("비즈니스") ||
    text.includes("business") ||
    text.includes("money") ||
    text.includes("marketing")
  ) {
    return "비즈니스";
  }

  if (
    text.includes("상품") ||
    text.includes("추천") ||
    text.includes("review") ||
    text.includes("best")
  ) {
    return "상품 / 추천";
  }

  if (
    text.includes("뷰티") ||
    text.includes("패션") ||
    text.includes("beauty") ||
    text.includes("makeup") ||
    text.includes("fashion") ||
    text.includes("outfit")
  ) {
    return "뷰티 / 패션";
  }

  if (
    text.includes("건강") ||
    text.includes("운동") ||
    text.includes("health") ||
    text.includes("fitness") ||
    text.includes("workout")
  ) {
    return "건강 / 운동";
  }

  if (text.includes("여행") || text.includes("travel") || text.includes("trip")) {
    return "여행";
  }

  return "기타";
}