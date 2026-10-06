import { Header, Footer } from "@/components/header";
import { SharedScenario } from "@/components/shared-scenario";
export const metadata = {
  title: "Публічний сценарій",
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <>
      <Header />
      <main
        id="main"
        className="container"
        style={{ paddingTop: 60, paddingBottom: 60 }}
      >
        <div className="article-hero">
          <h1>Сценарій для порівняння.</h1>
          <p>Це припущення автора, не прогноз або рекомендація сервісу.</p>
        </div>
        <SharedScenario />
      </main>
      <Footer />
    </>
  );
}
