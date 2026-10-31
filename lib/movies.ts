export type Genre = {
  slug: string;
  name: string;
};

/** Where the logo and blur boxes sit, in % of the player box. */
export type OverlayLayout = {
  logoPos?: "tl" | "tr" | "bl" | "br";
  /** Logo width as % of the player width. */
  logoSize?: number;
  /** Free logo position (top-left, % of the player); overrides logoPos. */
  logoX?: number;
  logoY?: number;
  /** Rectangles (in % of the player) blurred over the video. */
  blurs?: { x: number; y: number; w: number; h: number }[];
};

/** Overlays and trim applied by the site's player (the video file is untouched). */
export type VideoEdit = OverlayLayout & {
  logoUrl?: string;
  startSec?: number;
  endSec?: number;
  /** Portrait (9:16) video: the player box takes that shape. */
  vertical?: boolean;
  /**
   * Layout for the portrait box. A % means something else in each box shape, so
   * once edited it's kept apart from the landscape layout (the fields above).
   */
  portrait?: OverlayLayout;
};

/** The layout in force for the box shape chosen: the portrait one once it exists. */
export function overlayLayout(edit: VideoEdit): OverlayLayout {
  const { logoPos, logoSize, logoX, logoY, blurs } =
    edit.vertical && edit.portrait ? edit.portrait : edit;
  return { logoPos, logoSize, logoX, logoY, blurs };
}

export type Movie = {
  id: string;
  title: string;
  genre: string; // Genre slug
  year: number;
  rating: number;
  price: number;
  /** Runtime in minutes (movies only). */
  duration?: number;
  /** Number of episodes (series only). */
  episodes?: number;
  isNew?: boolean;
  featured?: boolean;
  trending?: boolean;
  description: string;
  /** Optional poster image URL. A generated poster is shown when missing. */
  poster?: string;
  /** Optional video URL played by the player. */
  videoUrl?: string;
  /** Hue (0-360) for the generated poster. */
  hue: number;
  /** Portrait video; shapes the player before playback starts. */
  vertical?: boolean;
  /** Display name of the genre, resolved from the genres table. */
  genreName?: string;
  /** Position in the home page hero (lower first). */
  heroOrder?: number;
  /** Position in the trending row (lower first). */
  trendOrder?: number;
  /** Hidden from the site (admin only). */
  hidden?: boolean;
  /** Wide background image (optional). */
  backdrop?: string;
  /** Player overlays/trim. */
  edit?: VideoEdit;
};

export type Plan = {
  id: string;
  name: string;
  description: string;
  price: number;
  days: number;
  badge?: string;
  sort: number;
  active: boolean;
};

/** Default genres: used until the genres table exists. */
export const GENRES: Genre[] = [
  { slug: "action", name: "Action" },
  { slug: "animation", name: "Animation" },
  { slug: "comedy", name: "Comedy" },
  { slug: "documentary", name: "Documentary" },
  { slug: "drama", name: "Drama" },
  { slug: "horror", name: "Horror" },
  { slug: "motivation", name: "Motivation" },
  { slug: "romance", name: "Romance" },
  { slug: "sci-fi", name: "Sci-Fi" },
  { slug: "thriller", name: "Thriller" },
];

/** Collections that aren't genres but can be browsed at /browse/[slug]. */
export const COLLECTIONS: Genre[] = [
  { slug: "trending", name: "Тренд болж буй" },
  { slug: "new", name: "Шинээр нэмэгдсэн" },
];

/**
 * Size of an embedded player inside its box. Bunny's player fills its frame and
 * crops, so the frame takes the video's own shape, as large as fits the box.
 */
export function embedFit(aspect: number | undefined, vertical: boolean | undefined) {
  if (!aspect) return { width: "100%", height: "100%" };
  const box = vertical ? 9 / 16 : 16 / 9;
  return aspect < box ? { height: "100%", aspectRatio: aspect } : { width: "100%", aspectRatio: aspect };
}

/**
 * Size of the overlay box when a player is enlarged. The box keeps its shape so
 * blur boxes stay on what they cover, and grows until the video itself fits the
 * screen. On a phone a landscape box runs past the edges, but only its black
 * sides are cut off.
 */
export function expandedBoxFit(aspect: number | undefined, vertical: boolean | undefined) {
  const box = vertical ? 9 / 16 : 16 / 9;
  const video = aspect ?? box;
  const size =
    video < box
      ? { height: `min(100dvh, ${100 / video}vw)` }
      : { width: `min(100vw, ${100 * video}dvh)` };
  return { ...size, aspectRatio: box, flexShrink: 0 };
}

export const FREE_EPISODES = 3;
/** How long buying one movie or series unlocks it. */
export const MOVIE_ACCESS_DAYS = 3;

/** Sample catalogue: shown until Supabase is connected, and used by the admin "seed" button. */
export const SAMPLE_MOVIES: Movie[] = [
  { id: "1001", title: "Сүүдрийн өв залгамжлагч", genre: "action", year: 2026, rating: 9.5, price: 4900, duration: 92, isNew: true, featured: true, trending: true, hue: 145, description: "Гэр бүлээсээ хөөгдсөн залуу эцгийнхээ нууц бизнесийг өвлөн авч, өөрийг нь урвасан хүмүүсээс өшөөгөө авахаар буцаж ирнэ." },
  { id: "1002", title: "Хаан ширээний төлөөх тулаан", genre: "action", year: 2026, rating: 9.2, price: 4900, duration: 104, isNew: true, featured: true, hue: 12, description: "Хоёр том овгийн хооронд өрнөх эрх мэдлийн тэмцэлд жирийн нэгэн бүсгүй гэнэт гол дүр болж хувирна." },
  { id: "1003", title: "Тэрбумтны нууц эхнэр", genre: "romance", year: 2026, rating: 9.6, price: 4900, episodes: 52, featured: true, trending: true, hue: 330, description: "Гэрээт гэрлэлтээр эхэлсэн харилцаа жинхэнэ хайр болж хувирах болов уу? Тэрбумтан нөхөр нь эхнэрээсээ нэгэн том нууц нуусаар байдаг." },
  { id: "1004", title: "Захирлын өшөө авалт", genre: "action", year: 2026, rating: 10.0, price: 4900, episodes: 45, trending: true, hue: 0, description: "Компанийнхаа удирдлагаас хууран мэхлэгдэж хөөгдсөн эмэгтэй захирал шинэ дүр төрхтэйгээр эргэн ирж бүхнийг буцааж авна." },
  { id: "1005", title: "Хөшигний цаадах хайр", genre: "romance", year: 2026, rating: 9.8, price: 4900, episodes: 38, trending: true, hue: 300, description: "Хоёр өөр ертөнцийн хүмүүсийн хориотой хайрын түүх. Нийгмийн шүүмжлэлийг даван туулж чадах уу?" },
  { id: "1006", title: "Дур булаам багш минь", genre: "romance", year: 2026, rating: 9.6, price: 4900, episodes: 56, trending: true, hue: 345, description: "Их сургуулийн оюутан бүсгүй шинэ багшдаа дурлах ч багш нь түүний төсөөлж байснаас огт өөр хүн байв." },
  { id: "1007", title: "Элсэн цөлийн домог", genre: "action", year: 2026, rating: 9.7, price: 4900, duration: 98, trending: true, hue: 35, description: "Говийн гүнд нуугдсан эртний эрдэнэсийг хайж буй адал явдалт баг аюулт өрсөлдөгчидтэй тулгарна." },
  { id: "1008", title: "Өргөмөл охины нууц", genre: "action", year: 2026, rating: 9.3, price: 4900, duration: 88, isNew: true, hue: 210, description: "Шоронд хилсээр явуулсан өргөмөл охин суллагдаж, гэр бүлээ хуурсан хүмүүсийн нүүрийг илчилнэ." },
  { id: "1009", title: "Харж чаддаг бүсгүй", genre: "action", year: 2026, rating: 9.1, price: 4900, duration: 85, isNew: true, hue: 195, description: "Осолд орсныхоо дараа бусдын нуусан бүхнийг харж чаддаг болсон бүсгүй шударга ёсны төлөө тэмцэнэ." },
  { id: "1010", title: "Элит алуурчны сэргэлт", genre: "action", year: 2026, rating: 9.2, price: 4900, duration: 96, isNew: true, hue: 260, description: "Ой санамжаа алдсан хамгийн шилдэг алуурчин энгийн сургуулийн сурагчийн амьдралаар амьдарч эхэлнэ." },
  { id: "1011", title: "Амьтдын хэлийг ойлгогч", genre: "comedy", year: 2026, rating: 9.5, price: 4900, duration: 90, isNew: true, hue: 90, description: "Гэрийн тэжээвэр амьтдынхаа ярианаас нөхрийнхөө нууцыг мэдэж авсан эхнэрийн инээдтэй адал явдал." },
  { id: "1012", title: "Шулмын тангараг", genre: "horror", year: 2026, rating: 9.1, price: 4900, duration: 94, isNew: true, hue: 280, description: "Эртний тосгонд дахин сэрсэн шулмын хараал нэгэн гэр бүлийг бүхэлд нь сүйрүүлэхээр заналхийлнэ." },
  { id: "1013", title: "Луусын дагина", genre: "drama", year: 2026, rating: 9.3, price: 4900, duration: 101, hue: 185, description: "Нуурын эрэгт амьдардаг загасчин залуу ид шидийн дагинатай танилцсанаар амьдрал нь бүрмөсөн өөрчлөгдөнө." },
  { id: "1014", title: "Жигшдэг сүйт залуу", genre: "drama", year: 2026, rating: 9.5, price: 4900, duration: 87, hue: 20, description: "Гэр бүлийнх нь шахалтаар сүй тавьсан залуу нь нууцаар тэрбумтан байсныг бүсгүй мэдээгүй байв." },
  { id: "1015", title: "Анхны үр минь", genre: "drama", year: 2026, rating: 8.2, price: 4900, duration: 93, hue: 50, description: "Олон жил салж байсан ээж хүүхэд хоёрын сэтгэл хөдлөм эргэн уулзалтын түүх." },
  { id: "1016", title: "Нууцлаг бие хамгаалагч", genre: "drama", year: 2026, rating: 8.5, price: 4900, duration: 89, hue: 225, description: "Баян гэр бүлийн охинд хуваарилагдсан бие хамгаалагч өөрийн гэсэн нууц зорилготой." },
  { id: "1017", title: "Хайрын шалгуур", genre: "drama", year: 2026, rating: 9.2, price: 4900, duration: 95, hue: 320, description: "Болзоонд энгийн ажилтан дүрээр ирсэн тэрбумтан жинхэнэ хайрыг олохын тулд бүсгүйг шалгана." },
  { id: "1018", title: "Нисгэгчийн нууц хайр", genre: "drama", year: 2026, rating: 9.0, price: 4900, duration: 91, hue: 205, description: "Ахмад нисгэгч ба онгоцны үйлчлэгч бүсгүйн тэнгэрт эхэлсэн хайрын түүх." },
  { id: "1019", title: "Ядуу хүүгийн аз", genre: "romance", year: 2026, rating: 9.2, price: 4900, episodes: 35, hue: 40, description: "Ядуу гэж бүгдэд басамжлагдсан залуу нэг өдрийн дотор баян гоо бүсгүйтэй гэрлэж, амьдрал нь эргэнэ." },
  { id: "1020", title: "Онлайн экс маань мафи", genre: "romance", year: 2026, rating: 9.7, price: 4900, episodes: 78, hue: 355, description: "Интернэтээр танилцаж салсан хуучин найз залуу нь хотын хамгийн аюултай мафийн босс болж таарав." },
  { id: "1021", title: "Дагавар гэр бүл", genre: "romance", year: 2026, rating: 9.8, price: 4900, episodes: 30, hue: 15, description: "Шинэ гэр бүлд нэгдсэн бүсгүйн өдөр тутмын амьдрал, хайр, ээдрээтэй харилцааны түүх." },
  { id: "1022", title: "Ах дүүсийн дундах хүсэл", genre: "romance", year: 2026, rating: 9.7, price: 4900, episodes: 54, hue: 290, description: "Хоёр ах дүү нэг бүсгүйд дурлаж, гэр бүлийн харилцаа хэзээ ч эргэж засагдахгүй мэт хагарна." },
  { id: "1023", title: "Тэрбумтан ахаасаа зугтсан нь", genre: "action", year: 2026, rating: 9.2, price: 4900, episodes: 32, hue: 170, description: "Дахин төрсөн бүсгүй өмнөх амьдралдаа гаргасан алдаагаа засахын тулд хүчирхэг ахаасаа зугтана." },
  { id: "1024", title: "Сүйрлийн үеийн зомби бүсгүй", genre: "sci-fi", year: 2026, rating: 9.3, price: 4900, duration: 99, hue: 110, description: "Дэлхий сүйрсний дараах ертөнцөд ухамсраа хадгалж үлдсэн зомби бүсгүй хүн төрөлхтнийг аврах түлхүүр болно." },
  { id: "1025", title: "Могойн хааны үнсэлт", genre: "romance", year: 2026, rating: 9.2, price: 4900, duration: 86, hue: 160, description: "Эртний домгийн могойн хаан орчин үеийн хотод сэрж, өөрийг нь сэрээсэн бүсгүйд дурлана." },
  { id: "1026", title: "Шилдэг сурагчийн дахин төрөлт", genre: "motivation", year: 2026, rating: 9.6, price: 4900, duration: 97, hue: 75, description: "Амьдралдаа бүтэлгүйтсэн эр дунд сургуулийн үедээ буцаж төрөөд бүхнийг шинээр эхлүүлнэ." },
  { id: "1027", title: "Бяцхан өв залгамжлагч", genre: "comedy", year: 2026, rating: 9.5, price: 4900, episodes: 30, hue: 60, description: "Таван настай ухаалаг хүү аавыгаа олж, асар том корпорацын өв залгамжлагч болох инээдтэй түүх." },
  { id: "1028", title: "Кампусын хатан", genre: "drama", year: 2026, rating: 9.4, price: 4900, episodes: 40, hue: 240, description: "Хаягдсан охин шинэ сургуульдаа хүн бүрийн хүндэлдэг кампусын хатан болж хувирна." },
  { id: "1029", title: "Тэнгэрийн охин", genre: "action", year: 2026, rating: 9.8, price: 4900, episodes: 40, featured: true, hue: 200, description: "Тэнгэрээс бууж ирсэн ид шидийн охин хүмүүсийн ертөнцөд шударга ёсыг сахин хамгаална." },
  { id: "1030", title: "Мангас агнагч", genre: "thriller", year: 2026, rating: 9.4, price: 4900, episodes: 45, hue: 5, description: "Шөнө бүр хотод гарч ирэх мангасуудыг агнадаг нууц бүлгийн гишүүдийн түүх." },
  { id: "1031", title: "Шилжин ирсэн гоо бүсгүй", genre: "romance", year: 2026, rating: 9.7, price: 4900, episodes: 45, hue: 315, description: "Өөр ертөнцөөс шилжин ирсэн бүсгүй шинэ биедээ дасаж, өөрт нь тохиолдсон хувь заяаг өөрчилнө." },
  { id: "1032", title: "Боксын аварга гүнж", genre: "action", year: 2026, rating: 9.0, price: 4900, duration: 90, hue: 25, description: "Хааны гэр бүлийн гүнж нууцаар боксын тэмцээнд оролцож, аваргын төлөө тэмцэнэ." },
  { id: "1033", title: "Хотод ирсэн хөдөөний залуу", genre: "comedy", year: 2026, rating: 8.9, price: 4900, duration: 84, hue: 100, description: "Хөдөөнөөс хот руу анх удаа ирсэн залуугийн инээд хөөртэй адал явдал." },
  { id: "1034", title: "Од эрхэст аялал", genre: "sci-fi", year: 2026, rating: 9.1, price: 4900, duration: 112, hue: 230, description: "Хүн төрөлхтний сүүлчийн хөлөг шинэ гаригийг хайн огторгуйн гүн рүү аялна." },
  { id: "1035", title: "Чимээгүй гэрч", genre: "thriller", year: 2026, rating: 9.0, price: 4900, duration: 102, hue: 215, description: "Хүн амины хэргийн цорын ганц гэрч нь ярьж чаддаггүй бяцхан хүү байв." },
  { id: "1036", title: "Харанхуй байшин", genre: "horror", year: 2026, rating: 8.7, price: 4900, duration: 95, hue: 270, description: "Шинэ байшиндаа нүүж орсон гэр бүл шөнө бүр сонсогдох хачин чимээний учрыг олохоор шийднэ." },
  { id: "1037", title: "Мөнх цэнгэр тэнгэрийн дор", genre: "documentary", year: 2026, rating: 9.4, price: 4900, duration: 78, hue: 190, description: "Монголын нүүдэлчдийн өдөр тутмын амьдрал, уламжлалыг харуулсан баримтат кино." },
  { id: "1038", title: "Сансрын нохой Баатар", genre: "animation", year: 2026, rating: 9.3, price: 4900, duration: 82, hue: 50, description: "Сансарт нисэх мөрөөдөлтэй бяцхан гөлөгний хүүхэд, том хүн бүгдэд таалагдах хүүхэлдэйн кино." },
  { id: "1039", title: "Зүрхний хүчээр", genre: "motivation", year: 2026, rating: 9.5, price: 4900, duration: 100, hue: 120, description: "Хоёр хөлөө алдсан тамирчин дахин тэмцээнд оролцохын тулд бүхнээ зориулна." },
  { id: "1040", title: "Цэцэрлэгийн хаан", genre: "animation", year: 2026, rating: 8.8, price: 4900, duration: 80, hue: 135, description: "Цэцэрлэгийн шавьжны хаант улсад өрнөх инээдтэй, найрсаг адал явдал." },
];

export function getGenre(slug: string): Genre | undefined {
  return [...GENRES, ...COLLECTIONS].find((g) => g.slug === slug);
}

export function getGenreName(slug: string): string {
  return getGenre(slug)?.name ?? slug;
}

/** Genre label for a movie, preferring the name loaded from the database. */
export function genreLabel(movie: Movie): string {
  return movie.genreName ?? getGenreName(movie.genre);
}

export function filterBySlug(movies: Movie[], slug: string): Movie[] {
  if (slug === "trending") {
    return movies
      .filter((m) => m.trending)
      .sort((a, b) => (a.trendOrder ?? 1e9) - (b.trendOrder ?? 1e9));
  }
  if (slug === "new") return movies.filter((m) => m.isNew);
  return movies.filter((m) => m.genre === slug);
}

export function filterByQuery(movies: Movie[], query: string): Movie[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return movies.filter(
    (m) =>
      m.title.toLowerCase().includes(q) ||
      genreLabel(m).toLowerCase().includes(q),
  );
}

export function formatPrice(price: number): string {
  return `₮${price.toLocaleString("en-US")}`;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}ц ${m}м` : `${m}м`;
}

/** Default plans: used until the plans table exists. */
export const SAMPLE_PLANS: Plan[] = [
  { id: "week", name: "7 хоногийн багц", description: "7 хоног бүх контент", price: 8900, days: 7, sort: 1, active: true },
  { id: "month", name: "Сарын багц", description: "Сар бүх контент", price: 24900, days: 30, badge: "ХЯМД", sort: 2, active: true },
];
