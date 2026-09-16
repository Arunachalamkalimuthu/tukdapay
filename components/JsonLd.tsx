import { jsonLdHtml } from '@/lib/metadata';

export function JsonLd({ data }: { data: object | object[] }) {
  const items = Array.isArray(data) ? data : [data];
  return items.map((d, i) => (
    <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(d) }} />
  ));
}
