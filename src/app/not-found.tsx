import Link from "next/link";
import { Header, Footer } from "@/components/header";
export default function NotFound() {
  return (
    <>
      <Header />
      <main
        id="main"
        className="container"
        style={{ paddingTop: 70, paddingBottom: 100 }}
      >
        <div className="eyebrow">404</div>
        <h1>Сторінку не знайдено.</h1>
        <p className="muted" style={{ margin: "25px 0" }}>
          Поверніться до свого фінансового простору.
        </p>
        <Link href="/app" className="button">
          Мій єКапітал ↗
        </Link>
      </main>
      <Footer />
    </>
  );
}
