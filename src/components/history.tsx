"use client";
import { useCapital } from "./profile-context";
import { Card, Chart, Empty, Badge } from "./ui";
import { fmt, dateFmt, pct } from "@/lib/format";
import { assets } from "@/lib/finance/assets";
export function HistoryView() {
  const { state } = useCapital();
  return (
    <>
      <div className="page-title">
        <div>
          <div className="eyebrow">
            <i />
            ВАШ ШЛЯХ У ЦИФРАХ
          </div>
          <h1>Історія капіталу</h1>
          <p>Знімки, внески та результати кожного місяця.</p>
        </div>
        <Badge kind="green">Локальна історія</Badge>
      </div>
      <Card>
        <h2>Чистий капітал у часі</h2>
        {state.snapshots.length > 1 ? (
          <Chart
            series={state.snapshots.map((p) => ({
              x: dateFmt(p.date),
              a: p.netWorth,
              b: p.contributions,
            }))}
            labels={["Чистий капітал", "Записані внески"]}
            caption="Збережені користувачем знімки капіталу та внесків"
          />
        ) : (
          <Empty
            title="Збережіть перший знімок"
            body="У розділі «Капітал» натисніть «Зберегти знімок». Історія показує лише ваші фактичні збережені точки."
          />
        )}
      </Card>
      <Card>
        <h2 style={{ marginBottom: 20 }}>Щомісячні підсумки</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Місяць</th>
                <th>Отримано</th>
                <th>Витрачено</th>
                <th>Резерв + цілі</th>
                <th>Інвестовано</th>
                <th>Cash flow</th>
              </tr>
            </thead>
            <tbody>
              {state.periods
                .filter((p) => p.checkedIn)
                .map((p) => (
                  <tr key={p.id}>
                    <td>{p.id}</td>
                    <td>{fmt(p.actual.income)}</td>
                    <td>{fmt(p.actual.expenses)}</td>
                    <td>{fmt(p.actual.reserve + p.actual.goals)}</td>
                    <td>{fmt(p.actual.invest)}</td>
                    <td>{fmt(p.actual.income - p.actual.expenses)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {!state.periods.some((p) => p.checkedIn) && (
          <Empty
            title="Заповніть щомісячний check-in"
            body="Внесіть фактичний дохід, витрати та внески у розділі «Бюджет», щоб зберегти підсумок."
          />
        )}
        {state.periods
          .filter((p) => p.checkedIn)
          .slice(-1)
          .map((p) => (
            <div className="notice" key={p.id} style={{ marginTop: 20 }}>
              У {p.id} ви отримали {fmt(p.actual.income)}, витратили{" "}
              {fmt(p.actual.expenses)}, відклали у резерв і на цілі{" "}
              {fmt(p.actual.reserve + p.actual.goals)}, внесли в інвестиції{" "}
              {fmt(p.actual.invest)}. Ринкова переоцінка активів тут не
              вважається заробітком.
            </div>
          ))}
      </Card>
      {state.snapshots.length > 0 && (
        <Card>
          <h2 style={{ marginBottom: 20 }}>
            Прогрес цілей та структура сценарію
          </h2>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Дата знімка</th>
                  <th>Накопичення цілей</th>
                  <th>Розподіл у Portfolio Lab</th>
                </tr>
              </thead>
              <tbody>
                {state.snapshots.map((p) => (
                  <tr key={p.date}>
                    <td>{dateFmt(p.date)}</td>
                    <td>{fmt(p.goalProgress)}</td>
                    <td>
                      {p.allocation
                        .filter((a) => a.percent > 0)
                        .map(
                          (a) =>
                            `${assets.find((x) => x.id === a.id)?.short ?? a.id} ${pct(a.percent)}`,
                        )
                        .join(" · ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <Card>
        <h2 style={{ marginBottom: 20 }}>Журнал операцій</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Дата</th>
                <th>Актив</th>
                <th>Операція</th>
                <th>Сума</th>
                <th>Коментар</th>
              </tr>
            </thead>
            <tbody>
              {[...state.transactions].reverse().map((t) => (
                <tr key={t.id}>
                  <td>{dateFmt(t.date)}</td>
                  <td>
                    {assets.find((a) => a.id === t.assetId)?.name ?? t.assetId}
                  </td>
                  <td>
                    {
                      {
                        buy: "Купівля",
                        sell: "Продаж",
                        contribution: "Внесок",
                        redemption: "Погашення",
                        dividend: "Дивіденд",
                        coupon: "Купон",
                      }[t.type]
                    }
                  </td>
                  <td>{fmt(t.amount, t.currency)}</td>
                  <td>{t.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!state.transactions.length && (
          <Empty
            title="Операцій поки немає"
            body="Запишіть купівлю, внесок або виплату у розділі «Капітал»."
          />
        )}
      </Card>
    </>
  );
}
