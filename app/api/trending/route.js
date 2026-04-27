function classifyLanguage(title) {
  const hasKorean = /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(title);
  return hasKorean ? "한국어" : "영어/기타";
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const region = searchParams.get("region") || "KR";
  const API_KEY = process.env.YOUTUBE_API_KEY;

  const popularRes = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=${region}&maxResults=50&key=${API_KEY}`
  );

  const popularData = await popularRes.json();

  if (!popularData.items) {
    return Response.json({ videos: [], channels: [] });
  }

  const channelIds = [
    ...new Set(popularData.items.map((video) => video.snippet.channelId)),
  ];

  const channelRes = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelIds.join(
      ","
    )}&key=${API_KEY}`
  );

  const channelData = await channelRes.json();

  const channelInfo = {};

  channelData.items?.forEach((channel) => {
    channelInfo[channel.id] = {
      channelId: channel.id,
      channelTitle: channel.snippet.title,
      subscribers: Number(channel.statistics.subscriberCount || 0),
      totalChannelViews: Number(channel.statistics.viewCount || 0),
      videoCount: Number(channel.statistics.videoCount || 0),
    };
  });

  const videos = popularData.items.map((video) => {
    const channel = channelInfo[video.snippet.channelId];

    const views = Number(video.statistics.viewCount || 0);
    const likes = Number(video.statistics.likeCount || 0);
    const comments = Number(video.statistics.commentCount || 0);
    const subscribers = channel?.subscribers || 0;

    const viewPerSub = views / (subscribers || 1);
    const engagement = (likes + comments) / (views || 1);

    const trendScore = viewPerSub * 10 + engagement * 100;

    return {
      videoId: video.id,
      title: video.snippet.title,
      thumbnail: video.snippet.thumbnails.medium.url,
      channelId: video.snippet.channelId,
      channelTitle: video.snippet.channelTitle,
      subscribers,
      views,
      likes,
      comments,
      publishedAt: video.snippet.publishedAt,
      language: classifyLanguage(video.snippet.title),
      viewPerSub,
      engagement,
      trendScore,
    };
  });

  const channelMap = {};

  videos.forEach((video) => {
    if (!channelMap[video.channelId]) {
      channelMap[video.channelId] = {
        channelId: video.channelId,
        channelTitle: video.channelTitle,
        subscribers: video.subscribers,
        videoCount: 0,
        totalViews: 0,
        totalLikes: 0,
        totalComments: 0,
        bestVideoTitle: video.title,
        bestVideoViews: video.views,
      };
    }

    const ch = channelMap[video.channelId];

    ch.videoCount += 1;
    ch.totalViews += video.views;
    ch.totalLikes += video.likes;
    ch.totalComments += video.comments;

    if (video.views > ch.bestVideoViews) {
      ch.bestVideoTitle = video.title;
      ch.bestVideoViews = video.views;
    }
  });

  const channels = Object.values(channelMap)
    .map((ch) => {
      const avgViews = ch.totalViews / ch.videoCount;
      const viewPerSub = avgViews / (ch.subscribers || 1);
      const engagement =
        (ch.totalLikes + ch.totalComments) / (ch.totalViews || 1);

      const channelTrendScore = viewPerSub * 10 + engagement * 100 + ch.videoCount;

      return {
        ...ch,
        avgViews,
        viewPerSub,
        engagement,
        channelTrendScore,
      };
    })
    .sort((a, b) => b.channelTrendScore - a.channelTrendScore);

  return Response.json({
    videos: videos.sort((a, b) => b.trendScore - a.trendScore),
    channels,
  });
}