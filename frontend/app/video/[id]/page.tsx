import VideoPageContent from "./VideoPageContent";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface Video {
  id: string;
  title: string | null;
  uploadPath: string;
  streamPath: string | null;
  status: string;
  createdAt: string;
}

interface GetVideoResult {
  video: Video | null;
  message?: string;
}

async function getVideo(id: string): Promise<GetVideoResult> {
  try {
    const res = await fetch(`${API_URL}/videos/${id}`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) {
      return { video: null, message: res.status === 404 ? "Video not found" : data.message || "Failed to load video" };
    }
    return { video: data, message: data.message };
  } catch {
    return { video: null, message: "Failed to load video" };
  }
}

export default async function VideoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { video, message } = await getVideo(id);

  return <VideoPageContent video={video} message={message} />;
}
