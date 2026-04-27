/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect } from "react";

export default function Home() {
  const [channelIds, setChannelIds] = useState("");
  const [videos, setVideos] = useState<any[]>([]);
  const [savedChannels, setSavedChannels] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [subscriberFilter, setSubscriberFilter] = useState("전체");
  const [periodFilter, setPeriodFilter] = useState("전체");
  const [languageFilter, setLanguageFilter] = useState("전체");
  const [sortMode, setSortMode] = useState("성공점수순");
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("savedChannels");
    if (saved) {
      const parsed = JSON.parse(saved);
      setSavedChannels(parsed);
      setChannelIds(parsed.join("\n"));
    }
  }, []);

  const isRealChannel = (video: any) => {
    const title = video.channelTitle || "";
    const subscribers = Number(video.subscribers || 0);

    return (
      !title.includes("Topic") &&
      !title.includes("- Topic") &&
      subscribers >= 1000
    );
  };

  const categorizeWithAI = async (videosToCategorize: any[]) => {
    const categorizedVideos = [];

    for (let i = 0; i < videosToCategorize.length; i++) {
      const video = videosToCategorize[i];

      setLoadingMessage(
        `AI 카테고리 분류 중... ${i + 1}/${videosToCategorize.length}`
      );

      try {
        const res = await fetch("/api/categorize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: video.title }),
        });

        const data = await res.json();

        categorizedVideos.push({
          ...video,
          category: data.category || video.category || "기타",
        });
      } catch {
        categorizedVideos.push({
          ...video,
          category: video.category || "기타",
        });
      }
    }

    return categorizedVideos;
  };

  const getPreviousSnapshot = () => {
    try {
      const saved = localStorage.getItem("youtubeAnalyzerSnapshot");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  };

  const saveCurrentSnapshot = (items: any[]) => {
    const snapshot: any = {};

    items.forEach((video) => {
      snapshot[video.videoId] = {
        views: video.views,
        subscribers: video.subscribers,
        savedAt: new Date().toISOString(),
      };
    });

    localStorage.setItem("youtubeAnalyzerSnapshot", JSON.stringify(snapshot));
  };

  const saveChannels = () => {
    const ids = channelIds
      .split("\n")
      .map((id) => id.trim())
      .filter(Boolean);

    localStorage.setItem("savedChannels", JSON.stringify(ids));
    setSavedChannels(ids);
    alert(`${ids.length}개 채널을 저장했습니다.`);
  };

  const analyzeChannelList = async (ids: string[]) => {
    setLoading(true);
    setLoadingMessage("유튜브 데이터 가져오는 중...");
    setVideos([]);

    const previousSnapshot = getPreviousSnapshot();
    let allVideos: any[] = [];

    for (const id of ids) {
      setLoadingMessage(`채널 분석 중: ${id}`);

      const res = await fetch(`/api/youtube?channelId=${id}`);
      const data = await res.json();

      if (data.videos) {
        allVideos = [...allVideos, ...data.videos];
      }
    }

    const cleanAllVideos = allVideos.filter(isRealChannel);

    const avg =
      cleanAllVideos.reduce((sum, v) => sum + v.views, 0) /
      (cleanAllVideos.length || 1);

    const analyzedVideos = cleanAllVideos.map((video) => {
      const previous = previousSnapshot[video.videoId];

      return {
        ...video,
        score: video.views / avg,
        previousViews: previous?.views ?? null,
        viewGrowth:
          previous?.views !== undefined ? video.views - previous.views : null,
        subscriberGrowth:
          previous?.subscribers !== undefined
            ? video.subscribers - previous.subscribers
            : null,
      };
    });

    const aiCategorizedVideos = await categorizeWithAI(analyzedVideos);

    saveCurrentSnapshot(aiCategorizedVideos);

    setVideos(aiCategorizedVideos);
    setLoading(false);
    setLoadingMessage("");
  };

  const handleAnalyze = async () => {
    const ids = channelIds
      .split("\n")
      .map((id) => id.trim())
      .filter(Boolean);

    await analyzeChannelList(ids);
  };

  const analyzeSavedChannels = async () => {
    if (savedChannels.length === 0) {
      alert("저장된 채널이 없습니다.");
      return;
    }

    setChannelIds(savedChannels.join("\n"));
    await analyzeChannelList(savedChannels);
  };

  const handleTrending = async (region: string) => {
    setLoading(true);
    setLoadingMessage(
      region === "KR"
        ? "🔥 한국 자동 트렌딩 분석 중..."
        : "🌍 글로벌 자동 트렌딩 분석 중..."
    );
    setVideos([]);

    try {
      const res = await fetch(`/api/trending?region=${region}`);
      const data = await res.json();

      const rawVideos = (data.videos || []).filter(isRealChannel);

      const avg =
        rawVideos.reduce((sum: number, v: any) => sum + v.views, 0) /
        (rawVideos.length || 1);

      const trendingVideos = rawVideos.map((video: any) => ({
        ...video,
        category: video.category || "트렌딩",
        score: video.views / avg,
        previousViews: null,
        viewGrowth: null,
        subscriberGrowth: null,
      }));

      const aiCategorizedVideos = await categorizeWithAI(trendingVideos);
      setVideos(aiCategorizedVideos);
    } catch {
      alert("자동 트렌딩 분석 중 오류가 발생했습니다.");
    }

    setLoading(false);
    setLoadingMessage("");
  };

  const categories = [
    "전체",
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

  const languages = [
    "전체",
    ...Array.from(new Set(videos.map((v) => v.language).filter(Boolean))),
  ];

  let filteredVideos =
    selectedCategory === "전체"
      ? videos
      : videos.filter((v) => v.category === selectedCategory);

  filteredVideos = filteredVideos.filter(isRealChannel);

  filteredVideos = filteredVideos.filter((v) => {
    if (subscriberFilter === "소형") return v.subscribers < 100000;
    if (subscriberFilter === "중형")
      return v.subscribers >= 100000 && v.subscribers < 1000000;
    if (subscriberFilter === "대형") return v.subscribers >= 1000000;
    return true;
  });

  filteredVideos = filteredVideos.filter((v) => {
    if (languageFilter === "전체") return true;
    return v.language === languageFilter;
  });

  filteredVideos = filteredVideos.filter((v) => {
    if (periodFilter === "전체") return true;

    const published = new Date(v.publishedAt);
    const now = new Date();
    const diffDays =
      (now.getTime() - published.getTime()) / (1000 * 60 * 60 * 24);

    if (periodFilter === "7일") return diffDays <= 7;
    if (periodFilter === "30일") return diffDays <= 30;

    return true;
  });

  filteredVideos = [...filteredVideos].sort((a, b) => {
    if (sortMode === "조회수순") return b.views - a.views;
    if (sortMode === "증가량순")
      return (b.viewGrowth ?? -1) - (a.viewGrowth ?? -1);
    return b.score - a.score;
  });

  const successVideos = filteredVideos.filter((v) => v.score >= 3);
  const normalVideos = filteredVideos.filter((v) => v.score < 3);
  const topVideos = filteredVideos.slice(0, 5);

  const getTrendingKeywords = (sourceVideos: any[]) => {
    const stopWords = new Set([
      "the",
      "and",
      "for",
      "with",
      "this",
      "that",
      "from",
      "you",
      "your",
      "are",
      "was",
      "how",
      "why",
      "what",
      "new",
      "official",
      "video",
      "shorts",
      "short",
      "feat",
      "ft",
      "of",
      "in",
      "on",
      "to",
      "a",
      "is",
      "이",
      "그",
      "저",
      "것",
      "수",
      "왜",
      "하는",
      "하고",
      "에서",
      "으로",
      "그리고",
      "입니다",
    ]);

    const words: Record<string, number> = {};

    sourceVideos.forEach((video) => {
      const tokens = video.title
        .replace(/[^a-zA-Z가-힣0-9\s]/g, " ")
        .split(/\s+/)
        .map((word: string) => word.trim())
        .filter(Boolean);

      tokens.forEach((word: string) => {
        const normalized = word.toLowerCase();

        if (normalized.length < 2) return;
        if (stopWords.has(normalized)) return;

        words[normalized] = (words[normalized] || 0) + 1;
      });
    });

    return Object.entries(words)
      .sort((a: any, b: any) => b[1] - a[1])
      .slice(0, 10);
  };

  const trendingKeywords = getTrendingKeywords(filteredVideos);

  const buildChannelRanking = (sourceVideos: any[]) => {
    const cleanVideos = sourceVideos.filter(isRealChannel);
    const channelMap: any = {};

    cleanVideos.forEach((video) => {
      if (!channelMap[video.channelId]) {
        channelMap[video.channelId] = {
          channelId: video.channelId,
          channelTitle: video.channelTitle,
          subscribers: video.subscribers,
          totalViews: 0,
          videoCount: 0,
          successCount: 0,
          totalLikes: 0,
          totalComments: 0,
        };
      }

      const ch = channelMap[video.channelId];

      ch.totalViews += video.views;
      ch.videoCount += 1;
      ch.totalLikes += video.likes;
      ch.totalComments += video.comments;

      if (video.score >= 3) {
        ch.successCount += 1;
      }
    });

    return Object.values(channelMap)
      .map((ch: any) => {
        const avgViews = ch.totalViews / (ch.videoCount || 1);
        const viewPerSub = avgViews / (ch.subscribers || 1);
        const engagement =
          (ch.totalLikes + ch.totalComments) / (ch.totalViews || 1);

        const channelScore =
          viewPerSub * 5 + ch.successCount * 2 + engagement * 10;

        return {
          ...ch,
          avgViews,
          viewPerSub,
          engagement,
          channelScore,
        };
      })
      .sort((a: any, b: any) => b.channelScore - a.channelScore)
      .slice(0, 5);
  };

  const categoryTrendingChannels = buildChannelRanking(filteredVideos);
  const allTrendingChannels =
    filteredVideos.length > 0 ? buildChannelRanking(videos) : [];

  const formatDate = (dateString: string) => {
    if (!dateString) return "날짜 없음";
    return new Date(dateString).toLocaleDateString("ko-KR");
  };

  const formatGrowth = (value: number | null) => {
    if (value === null) return "비교 데이터 없음";
    if (value > 0) return `+${value.toLocaleString()}`;
    return value.toLocaleString();
  };

  const VideoCard = ({ video, highlight = false }: any) => {
    return (
      <div
        className={`p-4 mb-4 rounded shadow flex gap-4 text-gray-900 ${
          highlight ? "bg-yellow-100" : "bg-white"
        }`}
      >
        <img
          src={video.thumbnail}
          alt={video.title}
          className="w-40 h-24 rounded object-cover"
        />

        <div className="flex-1 text-gray-900">
          <p className="font-bold mb-2 text-gray-900">{video.title}</p>
          <p>채널: {video.channelTitle}</p>
          <p>구독자 수: {video.subscribers.toLocaleString()}</p>
          <p>구독자 증가: {formatGrowth(video.subscriberGrowth)}</p>
          <p>카테고리: {video.category}</p>
          <p>언어: {video.language || "미분류"}</p>
          <p>업로드일: {formatDate(video.publishedAt)}</p>
          <p>조회수: {video.views.toLocaleString()}</p>
          <p>조회수 증가: {formatGrowth(video.viewGrowth)}</p>
          <p>좋아요: {video.likes.toLocaleString()}</p>
          <p>댓글: {video.comments.toLocaleString()}</p>
          <p>평균 대비: {video.score.toFixed(1)}배</p>

          {video.score >= 3 && (
            <p className="text-red-600 font-bold mt-2">🚀 성공 DNA 영상</p>
          )}
        </div>
      </div>
    );
  };

  const categoryTitle =
    selectedCategory === "전체"
      ? "전체 카테고리"
      : `${selectedCategory} 카테고리`;

  return (
    <div className="min-h-screen bg-gray-100 p-10 text-gray-900">
      <div className="flex flex-col items-center mb-8 text-gray-900">
        <h1 className="text-3xl font-bold mb-6 text-gray-900">
          유튜브 트렌딩 분석기
        </h1>

        <textarea
          placeholder={`채널 ID, @핸들, 채널 링크를 한 줄에 하나씩 입력하세요\n예:\nUC_x5XG1OV2P6uZZ5FSM9Ttw\n@GoogleDevelopers`}
          value={channelIds}
          onChange={(e) => setChannelIds(e.target.value)}
          className="px-4 py-3 border border-gray-400 rounded w-96 h-36 mb-4 bg-white text-gray-900 placeholder-gray-500"
        />

        <div className="flex flex-wrap gap-2 justify-center">
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="bg-blue-500 text-white px-6 py-2 rounded disabled:bg-gray-400"
          >
            {loading ? "분석 중..." : "여러 채널 분석하기"}
          </button>

          <button
            onClick={saveChannels}
            disabled={loading}
            className="bg-green-500 text-white px-6 py-2 rounded disabled:bg-gray-400"
          >
            채널 저장
          </button>

          <button
            onClick={analyzeSavedChannels}
            disabled={loading}
            className="bg-purple-500 text-white px-6 py-2 rounded disabled:bg-gray-400"
          >
            저장된 채널 전체 분석
          </button>

          <button
            onClick={() => handleTrending("KR")}
            disabled={loading}
            className="bg-red-500 text-white px-6 py-2 rounded disabled:bg-gray-400"
          >
            🔥 한국 자동 트렌딩
          </button>

          <button
            onClick={() => handleTrending("US")}
            disabled={loading}
            className="bg-gray-800 text-white px-6 py-2 rounded disabled:bg-gray-400"
          >
            🌍 글로벌 자동 트렌딩
          </button>
        </div>

        {savedChannels.length > 0 && (
          <p className="mt-3 text-sm text-gray-700">
            저장된 채널: {savedChannels.length}개
          </p>
        )}

        {loadingMessage && (
          <p className="mt-3 text-sm text-gray-700">{loadingMessage}</p>
        )}
      </div>

      <div className="max-w-4xl mx-auto text-gray-900">
        {videos.length > 0 && (
          <div className="bg-white text-gray-900 p-4 mb-6 rounded shadow">
            <p className="font-bold text-gray-900">분석 요약</p>
            <p>현재 선택 카테고리: {categoryTitle}</p>
            <p>분석 영상 수: {filteredVideos.length}개</p>
            <p>성공 DNA 영상 수: {successVideos.length}개</p>
            <p className="text-sm text-gray-700 mt-1">
              Topic 채널과 구독자 1,000명 미만 채널은 제외됩니다.
            </p>

            <div className="flex flex-wrap gap-2 mt-3">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="border border-gray-400 px-3 py-2 rounded bg-white text-gray-900"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              <select
                value={subscriberFilter}
                onChange={(e) => setSubscriberFilter(e.target.value)}
                className="border border-gray-400 px-3 py-2 rounded bg-white text-gray-900"
              >
                <option value="전체">전체 구독자</option>
                <option value="소형">10만 이하</option>
                <option value="중형">10만~100만</option>
                <option value="대형">100만 이상</option>
              </select>

              <select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value)}
                className="border border-gray-400 px-3 py-2 rounded bg-white text-gray-900"
              >
                <option value="전체">전체 기간</option>
                <option value="7일">최근 7일</option>
                <option value="30일">최근 30일</option>
              </select>

              <select
                value={languageFilter}
                onChange={(e) => setLanguageFilter(e.target.value)}
                className="border border-gray-400 px-3 py-2 rounded bg-white text-gray-900"
              >
                {languages.map((language) => (
                  <option key={language} value={language}>
                    {language}
                  </option>
                ))}
              </select>

              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value)}
                className="border border-gray-400 px-3 py-2 rounded bg-white text-gray-900"
              >
                <option value="성공점수순">성공점수순</option>
                <option value="조회수순">조회수순</option>
                <option value="증가량순">조회수 증가량순</option>
              </select>
            </div>
          </div>
        )}

        {filteredVideos.length === 0 && videos.length > 0 && (
          <div className="bg-orange-50 text-gray-900 p-4 mb-6 rounded shadow text-sm">
            현재 필터 조건에 맞는 영상/채널이 없습니다. 카테고리, 구독자 수,
            기간 필터를 변경해보세요.
          </div>
        )}

        {trendingKeywords.length > 0 && (
          <>
            <h2 className="text-xl font-bold mb-4 text-gray-900">
              🔥 {categoryTitle} 지금 뜨는 키워드 TOP 10
            </h2>
            <div className="flex flex-wrap gap-2 mb-8">
              {trendingKeywords.map(([word, count]: any, index: number) => (
                <span
                  key={index}
                  className="bg-black text-white px-3 py-1 rounded text-sm"
                >
                  {word} ({count})
                </span>
              ))}
            </div>
          </>
        )}

        {categoryTrendingChannels.length > 0 && (
          <>
            <h2 className="text-xl font-bold mb-4 text-gray-900">
              🚀 {categoryTitle} 뜨는 채널 TOP 5
            </h2>
            {categoryTrendingChannels.map((ch: any, index: number) => (
              <div
                key={index}
                className="bg-blue-100 text-gray-900 p-4 mb-3 rounded shadow"
              >
                <p className="font-bold text-gray-900">
                  {index + 1}. {ch.channelTitle}
                </p>
                <p>구독자: {ch.subscribers.toLocaleString()}</p>
                <p>분석 영상 수: {ch.videoCount}개</p>
                <p>평균 조회수: {Math.round(ch.avgViews).toLocaleString()}</p>
                <p>성공 DNA 영상 수: {ch.successCount}</p>
                <p>
                  구독자 대비 평균 조회수: {(ch.viewPerSub * 100).toFixed(2)}%
                </p>
                <p>반응률: {(ch.engagement * 100).toFixed(2)}%</p>
                <p>채널 점수: {ch.channelScore.toFixed(2)}</p>
              </div>
            ))}
          </>
        )}

        {selectedCategory !== "전체" && allTrendingChannels.length > 0 && (
          <>
            <h2 className="text-xl font-bold mt-8 mb-4 text-gray-900">
              🌐 전체 카테고리 뜨는 채널 TOP 5
            </h2>
            {allTrendingChannels.map((ch: any, index: number) => (
              <div
                key={index}
                className="bg-white text-gray-900 p-4 mb-3 rounded shadow"
              >
                <p className="font-bold text-gray-900">
                  {index + 1}. {ch.channelTitle}
                </p>
                <p>구독자: {ch.subscribers.toLocaleString()}</p>
                <p>평균 조회수: {Math.round(ch.avgViews).toLocaleString()}</p>
                <p>채널 점수: {ch.channelScore.toFixed(2)}</p>
              </div>
            ))}
          </>
        )}

        {topVideos.length > 0 && (
          <>
            <h2 className="text-xl font-bold mt-8 mb-4 text-gray-900">
              🏆 {categoryTitle} TOP 5 영상
            </h2>
            {topVideos.map((video, index) => (
              <div
                key={index}
                className="bg-green-100 text-gray-900 p-4 mb-3 rounded shadow"
              >
                <p className="font-bold text-gray-900">
                  {index + 1}. {video.title}
                </p>
                <p>채널: {video.channelTitle}</p>
                <p>카테고리: {video.category}</p>
                <p>업로드일: {formatDate(video.publishedAt)}</p>
                <p>조회수: {video.views.toLocaleString()}</p>
                <p>조회수 증가: {formatGrowth(video.viewGrowth)}</p>
                <p>평균 대비: {video.score.toFixed(1)}배</p>
              </div>
            ))}
          </>
        )}

        {successVideos.length > 0 && (
          <>
            <h2 className="text-xl font-bold mt-8 mb-4 text-gray-900">
              🔥 {categoryTitle} 성공 DNA 영상
            </h2>
            {successVideos.map((video, index) => (
              <VideoCard key={index} video={video} highlight={true} />
            ))}
          </>
        )}

        {normalVideos.length > 0 && (
          <>
            <h2 className="text-xl font-bold mt-8 mb-4 text-gray-900">
              일반 영상
            </h2>
            {normalVideos.map((video, index) => (
              <VideoCard key={index} video={video} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}