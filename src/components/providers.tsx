import { ArrowUpRight } from "lucide-react";
import { partners, partnerLink, type Provider } from "@/lib/partners";
import { Badge } from "./ui";
export function ProviderDirectory({
  category,
}: {
  category: Provider["category"];
}) {
  return (
    <div>
      {partners
        .filter((p) => p.category === category)
        .map((p) => (
          <div className="provider-row" key={p.id}>
            <div>
              <strong>{p.name}</strong>
              {p.affiliateUrl && <Badge kind="warning">Партнер</Badge>}
              <small>{p.verification}</small>
              <small>{p.fees}</small>
            </div>
            <div>
              <a
                className="button outline small"
                href={partnerLink(p)}
                target="_blank"
                rel={
                  p.affiliateUrl
                    ? "sponsored nofollow noopener noreferrer"
                    : "noopener noreferrer"
                }
              >
                Перейти <ArrowUpRight size={14} />
              </a>
              {p.affiliateUrl && <small>Партнерське посилання</small>}
            </div>
          </div>
        ))}
      <p className="muted" style={{ fontSize: 11, marginTop: 15 }}>
        Партнерство не впливає на порядок і не означає, що провайдер
        «найкращий». Зараз партнерські посилання не активні.
      </p>
    </div>
  );
}
