# Feedback: Observability Tooling Clarification
Date: 2026-03-28

## Context
User reviewed resume bullets referencing Grafana, ELK, Prometheus/LGTM observability at Beno.

## Clarifications

### Grafana at Beno
Grafana was used at Beno specifically to analyze **engineers' contributions using MergeStat** — not for system/infrastructure monitoring. Framing should be around keeping engineers sharp with data-driven contribution insights and giving encouragement.

### ELK Stack
ELK was only used during time at **Roamworks**. It should not be attributed to Beno.

### Kibana vs Grafana
These are substitutes, not complements. Mentioning both together is incorrect. Pick one based on which role/company it applies to.

### LGTM Stack (Prometheus/Grafana for OTEL)
Tried as part of understanding OTEL in an **aborted side project**. Not production experience. Concluded it is easier to use Honeycomb or Dash0 instead.

### Beno Logging
CloudWatch is used for logs at Beno. No major observability achievements to highlight there.

### Notable Beno Achievement (Logging/Email)
Built a CloudWatch dashboard to monitor domain reputation. Eliminated test emails by switching to MailTrap, and tightly monitored bounced emails from Amazon SES. This was a meaningful reliability and deliverability improvement.

## Action Items
- Mark Prometheus/Grafana observability bullets for beno_em as `exaggerated`
- Replace observability framing at Beno with CloudWatch or remove entirely
- Grafana at Beno = MergeStat engineering analytics only
- Add domain reputation / SES monitoring achievement to journal
- Never pair ELK + Grafana for the same role
