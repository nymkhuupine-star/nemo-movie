import type { Metadata } from "next";
import MyList from "@/components/MyList";
import { getMovies } from "@/lib/data";

export const metadata: Metadata = { title: "Миний жагсаалт" };

export default async function MyListPage() {
  return <MyList movies={await getMovies()} />;
}
