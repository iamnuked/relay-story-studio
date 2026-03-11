import { CanvasWorkspace } from "../../../components/canvas/CanvasWorkspace";
import { getMockCanvasWorkspace } from "../../../components/canvas/mockCanvasData";

type CanvasPageProps = {
  params: {
    shareKey: string;
  };
  searchParams?: {
    mode?: string;
  };
};

export default function CanvasPage({ params, searchParams }: CanvasPageProps) {
  const viewerMode = searchParams?.mode === "guest" ? "anonymous" : "authenticated";
  const workspace = getMockCanvasWorkspace(params.shareKey, viewerMode);

  return <CanvasWorkspace workspace={workspace} />;
}
