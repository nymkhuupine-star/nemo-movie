import { notFound } from "next/navigation";
import { Suspense } from "react";
import Modal from "@/components/Modal";
import MovieDetail, { MovieDetailSkeleton } from "@/components/MovieDetail";
import { MOVIES, getMovie } from "@/lib/movies";

type Params = PageProps<"/movie/[id]">["params"];

export function generateStaticParams() {
  return MOVIES.map((m) => ({ id: m.id }));
}

async function Content({ params }: { params: Params }) {
  const { id } = await params;
  const movie = getMovie(id);
  if (!movie) notFound();
  return <MovieDetail movie={movie} inModal />;
}

export default function MovieModal({ params }: PageProps<"/movie/[id]">) {
  return (
    <Modal>
      <Suspense fallback={<MovieDetailSkeleton />}>
        <Content params={params} />
      </Suspense>
    </Modal>
  );
}
