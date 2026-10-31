import { notFound } from "next/navigation";
import { Suspense } from "react";
import Modal from "@/components/Modal";
import MovieDetail, { MovieDetailSkeleton } from "@/components/MovieDetail";
import SeriesWatch from "@/components/SeriesWatch";
import { getMovie, movieIdParams } from "@/lib/data";

type Params = PageProps<"/movie/[id]">["params"];

export function generateStaticParams() {
  return movieIdParams();
}

async function Content({ params }: { params: Params }) {
  const { id } = await params;
  const movie = await getMovie(id);
  if (!movie) notFound();
  return movie.episodes ? (
    <Modal fullPage>
      <SeriesWatch movie={movie} inModal />
    </Modal>
  ) : (
    <Modal>
      <MovieDetail movie={movie} inModal />
    </Modal>
  );
}

export default function MovieModal({ params }: PageProps<"/movie/[id]">) {
  return (
    <Suspense
      fallback={
        <Modal>
          <MovieDetailSkeleton />
        </Modal>
      }
    >
      <Content params={params} />
    </Suspense>
  );
}
