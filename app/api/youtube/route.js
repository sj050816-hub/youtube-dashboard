async function resolveChannelId(input, API_KEY) {
  if (!input) return null;

  let value = input.trim();

  if (value.startsWith("UC")) {
    return value;
  }

  const channelMatch = value.match(/youtube\.com\/channel\/([^/?]+)/);
  if (channelMatch) {
    return channelMatch[1];
  }

  let handle = value;

  if (value.includes("youtube.com")) {
    const handleMatch = value.match(/@([^/?]+)/);
    if (handleMatch) {
      handle = handleMatch[1];
    }
  }

  if (handle.startsWith("@")) {
    handle = handle.replace("@", "");
  }

  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(
      handle
    )}&maxResults=1&key=${API_KEY}`
  );

  const data = await res.json();

  return data.items?.[0]?.snippet?.channelId || null;
}

function classifyCategory(title) {
  const text = title.toLowerCase();

  if (
    text.includes("ai") ||
    text.includes("gemini") ||
    text.includes("chatgpt") ||
    text.includes("agent") ||
    text.includes("automation") ||
    text.includes("developer") ||
    text.includes("coding") ||
    text.includes("programming") ||
    text.includes("software") ||
    text.includes("app")
  ) {
    return "AI / IT";
  }

  if (
    text.includes("iphone") ||
    text.includes("phone") ||
    text.includes("camera") ||
    text.includes("gadget") ||
    text.includes("device") ||
    text.includes("review") ||
    text.includes("laptop") ||
    text.includes("macbook") ||
    text.includes("earbuds") ||
    text.includes("headphones")
  ) {
    return "전자제품";
  }

  if (
    text.includes("food") ||
    text.includes("recipe") ||
    text.includes("cook") ||
    text.includes("eat") ||
    text.includes("restaurant") ||
    text.includes("meal") ||
    text.includes("kitchen") ||
    text.includes("맛집") ||
    text.includes("요리") ||
    text.includes("먹방")
  ) {
    return "음식";
  }

  if (
    text.includes("money") ||
    text.includes("business") ||
    text.includes("sales") ||
    text.includes("marketing") ||
    text.includes("side hustle") ||
    text.includes("startup") ||
    text.includes("income") ||
    text.includes("수익") ||
    text.includes("창업")
  ) {
    return "비즈니스";
  }

  if (
    text.includes("best") ||
    text.includes("top") ||
    text.includes("추천") ||
    text.includes("must have") ||
    text.includes("buy") ||
    text.includes("amazon") ||
    text.includes("coupang") ||
    text.includes("쿠팡") ||
    text.includes("제품") ||
    text.includes("아이템")
  ) {
    return "상품 / 추천";
  }

  if (
    text.includes("health") ||
    text.includes("fitness") ||
    text.includes("workout") ||
    text.includes("diet") ||
    text.includes("exercise") ||
    text.includes("운동") ||
    text.includes("다이어트") ||
    text.includes("건강")
  ) {
    return "건강 / 운동";
  }

  if (
    text.includes("travel") ||
    text.includes("trip") ||
    text.includes("hotel") ||
    text.includes("tour") ||
    text.includes("여행") ||
    text.includes("호텔")
  ) {
    return "여행";
  }

  if (
    text.includes("beauty") ||
    text.includes("makeup") ||
    text.includes("skincare") ||
    text.includes("fashion") ||
    text.includes("뷰티") ||
    text.includes("화장품") ||
    text.includes("패션")
  ) {
    return "뷰티 / 패션";
  }

  return "기타";
}

function classifyLanguage(title) {
  const hasKorean = /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(title);
  return hasKorean ? "한국어" : "영어/기타";
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const input = searchParams.get("channelId");
  const API_KEY = process.env.YOUTUBE_API_KEY;

  const channelId = await resolveChannelId(input, API_KEY);

  if (!channelId) {
    return Response.json({ error: "채널을 찾을 수 없습니다." }, { status: 404 });
  }

  const channelRes = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&id=${channelId}&key=${API_KEY}`
  );
  const channelData = await channelRes.json();

  const channel = channelData.items?.[0];

  if (!channel) {
    return Response.json({ error: "채널을 찾을 수 없습니다." }, { status: 404 });
  }

  const uploadsPlaylistId = channel.contentDetails.relatedPlaylists.uploads;
  const subscribers = Number(channel.statistics.subscriberCount || 0);

  const videoListRes = await fetch(
    `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=20&key=${API_KEY}`
  );
  const videoListData = await videoListRes.json();

  const videoIds = videoListData.items.map(
    (item) => item.snippet.resourceId.videoId
  );

  const statsRes = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoIds.join(
      ","
    )}&key=${API_KEY}`
  );
  const statsData = await statsRes.json();

  const videos = statsData.items.map((video) => ({
    videoId: video.id,
    channelId,
    channelTitle: channel.snippet.title,
    subscribers,
    channelSubscriberCount: subscribers,
    title: video.snippet.title,
    thumbnail: video.snippet.thumbnails.medium.url,
    views: Number(video.statistics.viewCount || 0),
    likes: Number(video.statistics.likeCount || 0),
    comments: Number(video.statistics.commentCount || 0),
    publishedAt: video.snippet.publishedAt,
    language: classifyLanguage(video.snippet.title),
    category: classifyCategory(video.snippet.title),
  }));

  return Response.json({ videos });
}