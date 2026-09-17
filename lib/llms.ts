/**
 * /llms.txt and /llms-full.txt, in the llmstxt.org format: what TukdaPay is and isn't, for AI systems and agents that
 * read the site. llms.txt is the index: an H1, a one-line summary, notes (no headings), then H2 lists of links.
 * llms-full.txt has the same header, then the full text of home (with its FAQ), use cases, About and every post.
 *
 * Pure: app/llms.txt/route.ts and app/llms-full.txt/route.ts pass the content in. The copy rules in CONTRIBUTING.md
 * apply here too: TukdaPay isn't a way to avoid a fee, no UPI fee, rate, cap, limit or date is stated as fact, and
 * nothing tells a reader to favour TukdaPay. test/llms.test.ts checks.
 */
import { formatRupees, MAX_AMOUNT_TEXT } from './format.ts';
import { absoluteUrl, inlineToMarkdown, mdxToMarkdown } from './markdown.ts';
import { createPlan, MAX_PARTS } from './plan.ts';
import { MAX_TEXT } from './prefill.ts';
import { MAX_RECENT } from './recent.ts';
import { newestFirst } from './rss.ts';
import { DEFAULT_MAX, REPO_URL, SITE_NAME, SITE_URL } from './site.ts';
import { splitAmount } from './split.ts';
import { collapseText } from './strip.ts';

/** The fields of a post these files use (structurally a subset of content/posts.ts PostMeta). */
export interface LlmsPost {
  slug: string;
  title: string;
  description: string;
  /** YYYY-MM-DD */
  date: string;
  /** YYYY-MM-DD, set only once the post's words change after `date`. */
  updated?: string;
}

/** A use case (structurally content/useCases.ts UseCase). */
export interface LlmsUseCase {
  slug: string;
  title: string;
  amount: number;
  who: string;
  story: string;
  tip: string;
  note?: string;
}

/** An FAQ entry (structurally content/faq.tsx FaqEntry). `body`, when set, is the answer's JSX with its links. */
export interface LlmsFaqEntry {
  q: string;
  a: string;
  body?: unknown;
}

export interface LlmsData {
  posts: readonly LlmsPost[];
  useCases: readonly LlmsUseCase[];
  /** Defaults to SITE_URL. No trailing slash. */
  siteUrl?: string;
}

export interface LlmsFullData extends LlmsData {
  /** Each with tryHref(u) from content/useCases.ts: the site-relative link that opens the splitter with it. */
  useCases: readonly (LlmsUseCase & { tryHref: string })[];
  faq: readonly LlmsFaqEntry[];
  /** Each post's MDX source (app/blog/<slug>/page.mdx), by slug. */
  postSources: Readonly<Record<string, string>>;
}

/** Links the notes and the mirrored page copy use. test/llms.test.ts checks they match content/faq.tsx and the About page. */
export const LLMS_LINKS = {
  /** NPCI, Merchant Discount Rate (MDR) on Select UPI (P2M) Transactions – FAQs, 15 Sept 2026. */
  npciMdrFaq:
    'https://www.npci.org.in/uploads/FA_Qs_Merchant_Discount_Rate_MDR_on_Select_UPI_P2_M_Transactions_58dba1d39e.pdf',
  pibFactCheckTelegram: 'https://t.me/PIB_FactCheck',
  pibFactCheckX: 'https://x.com/PIBFactCheck',
  githubPagesData:
    'https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages#data-collection',
  author: 'https://github.com/Arunachalamkalimuthu',
} as const;

/** The prefill link the notes explain, with every parameter lib/prefill.ts reads (README.md's example, plus max). */
export const PREFILL_EXAMPLE = '/?amount=4200&pa=shop@okaxis&pn=Sri%20Stores&note=Sept%20khata&max=1999';

/**
 * Words from the pages that aren't in content/ (they're written in the pages' JSX), copied here as Markdown for
 * llms-full.txt. `path` is where the page is published and `title` is its H1. Site links stay relative; the builder
 * makes them absolute.
 * test/llms.test.ts fails both ways: when these words are no longer on the page, and when the page's JSX has a heading,
 * paragraph or list item whose words aren't in llms-full.txt. So update this when you change the page.
 */
export const PAGE_COPY = {
  home: {
    path: '/',
    source: 'app/page.tsx',
    title: 'UPI bill above ₹2,000? Pay it in tukde.',
    body: [
      'Split the bill into tukde (pieces) of ₹1,999 or less and pay each from GPay, PhonePe, Paytm or any UPI app. Free, no signup, nothing leaves your phone.',
      '',
      '### How to split a UPI payment',
      '',
      '1. **Enter the bill** and the merchant’s UPI ID from their sticker or invoice.',
      '2. **Split** — TukdaPay breaks it into parts at or under your limit (₹5,000 becomes ₹1,999 + ₹1,999 + ₹1,002), each tagged *Part 1/3*, *Part 2/3*… so the shop can match them.',
      '3. **Pay each part** — every Pay button opens your own UPI app with the amount filled in. Tick them off as you go.',
      '',
      '### Why people use it',
      '',
      '- **Nothing leaves your phone.** No account, no server, no bank details. It only writes `upi://pay` links.',
      '- **Works with every UPI app.** Google Pay, PhonePe, Paytm, BHIM, CRED, bank apps — on a computer, scan the QR instead.',
      '- **Free and open source.** MIT licensed. Read the code, fork it, fix it.',
    ].join('\n'),
    faqTitle: 'Questions about splitting UPI payments',
  },
  useCases: {
    path: '/use-cases/',
    source: 'app/use-cases/page.tsx',
    title: 'Bills people pay in tukde',
    intro: [
      'Tukde means pieces: one bill paid as a few smaller UPI payments. Corner shops, chemists, tutors and homestays often take only UPI, and plenty of everyday bills cross ₹2,000. Splitting is one way to pay when one payment won’t go through, or when the shop asks for it. Ask the shop before you split.',
      '',
      `Here are eight of these bills, each with the exact split TukdaPay makes at ${formatRupees(DEFAULT_MAX)} a payment. Pick one to open the splitter with that amount filled in. New to this? Read [how to split a UPI payment above ₹2,000](/blog/split-upi-payment-above-2000/), step by step.`,
    ].join('\n'),
    merchantsTitle: 'If you’re the merchant',
    merchants: [
      '- **Say yes or no up front.** A sign at the counter (“Split UPI payments welcome” or “One payment per bill”) saves a conversation.',
      '- **Look for the part numbers.** TukdaPay tags every payment *Part 1/3*, *Part 2/3*… in the note, so matching them to one bill is a glance.',
      '- **Ask for the breakdown.** Customers can send the list on WhatsApp in one tap; keep it with the bill.',
      '- **Check what applies to you.** If a payment carries a charge, it may fall on you rather than the customer. Here’s [how to check what applies to a UPI payment above ₹2,000](/blog/upi-2000-threshold-what-to-check/).',
    ].join('\n'),
    ctaTitle: 'Your bill isn’t on the list?',
    cta: [
      'Any amount works. Enter the bill and the shop’s UPI ID, then pay each part from GPay, PhonePe, Paytm or any UPI app.',
      '',
      'TukdaPay isn’t a way to avoid a fee: [see who a UPI charge lands on](/blog/does-splitting-upi-save-money/).',
    ].join('\n'),
  },
  about: {
    path: '/about/',
    source: 'app/about/page.tsx',
    title: 'About TukdaPay',
    body: [
      'TukdaPay is a free web page that splits one UPI bill into smaller payments, each opened in your own UPI app. It never touches the money.',
      '',
      '### Who builds it',
      '',
      `[Arunachalam Kalimuthu](${LLMS_LINKS.author}) builds and looks after TukdaPay, and writes the [guides on the blog](/blog/).`,
      '',
      '### Why it exists',
      '',
      'Sometimes one UPI payment won’t go through in one go, or the shop asks for smaller payments. TukdaPay works out the parts, numbers each one so the shop can match them, and keeps track of the ones you tick as paid.',
      '',
      `It isn’t a way to avoid a fee. Ask the shop before you split. Wondering whether you’ll be charged, or whether a shop can pass its fee on to you? [NPCI’s FAQs on the merchant discount rate](${LLMS_LINKS.npciMdrFaq}) (PDF) answer both (questions 15 and 34).`,
      '',
      '### How it’s funded',
      '',
      'It isn’t. No ads, affiliate links or tracking, and no data to sell, because TukdaPay collects none.',
      '',
      '### Your privacy',
      '',
      'Your browser’s local storage keeps your last split (amount, UPI ID, name, note, max per payment and which parts you ticked as paid), so a reload keeps your place. It also keeps the last five shops you split for (UPI ID and name), so you can pick one again. Clearing this site’s data in your browser removes it all.',
      '',
      'Nothing you type is sent to TukdaPay. What you type leaves this page only when you choose: tapping Pay (or scanning a part’s QR code) hands the UPI ID, name, amount and note to your UPI app, and the note goes with the payment. Send on WhatsApp passes the breakdown to WhatsApp.',
      '',
      `The site is hosted on GitHub Pages, and [GitHub logs visitors’ IP addresses](${LLMS_LINKS.githubPagesData}) for security.`,
      '',
      '### Not part of NPCI, a bank or a UPI app',
      '',
      'TukdaPay isn’t affiliated with or endorsed by NPCI or its UPI brand, any bank or any UPI app.',
      '',
      '### Open source',
      '',
      `The [code is on GitHub](${REPO_URL}) under the MIT licence, so you can check what this page says or run your own copy.`,
      '',
      '### Get in touch',
      '',
      `Found a bug or a wrong sentence? [Open an issue on GitHub](${REPO_URL}/issues).`,
    ].join('\n'),
  },
} as const;

const postUrl = (siteUrl: string, slug: string) => `${siteUrl}/blog/${slug}/`;
const payments = (n: number) => (n === 1 ? '1 payment' : `${n} payments`);
/** "a", "a and b", "a; b and c" (semicolons, because the items can have commas of their own). */
const listText = (items: readonly string[]) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join('; ')} and ${items.at(-1)}`);

/** Hand-written Markdown with its site links made absolute (and checked for stray JSX). */
const absolute = (markdown: string, siteUrl: string, pageUrl: string) => mdxToMarkdown(markdown, { siteUrl, pageUrl });

function summary(): string {
  return (
    `> ${SITE_NAME} is a free, open-source (MIT) web page that splits one UPI bill into smaller payments ` +
    `(${formatRupees(DEFAULT_MAX)} or less each by default) and opens each payment in the user’s own UPI app: ` +
    'Google Pay, PhonePe, Paytm, BHIM or any other. No signup, no backend and no tracking: nothing the user types is ' +
    'sent to TukdaPay, and it never touches the money.'
  );
}

/** The notes between the summary and the first H2: plain paragraphs and lists, no headings. */
function notes({ useCases }: LlmsData, siteUrl: string): string {
  const max = formatRupees(DEFAULT_MAX);
  const example = splitAmount(5000, DEFAULT_MAX).map(formatRupees).join(' + ');
  const partNote = createPlan({ total: 4200, pa: 'shop@okaxis', pn: '', note: 'Sept khata', maxPerTxn: DEFAULT_MAX }).parts[0].tn;
  const { npciMdrFaq, pibFactCheckTelegram, pibFactCheckX, githubPagesData } = LLMS_LINKS;
  const anchorExample = useCases.length > 0 ? ` Each use case has its own anchor, such as ${siteUrl}/use-cases/#${useCases[0].slug}.` : '';

  return [
    'UPI is India’s Unified Payments Interface, run by NPCI. TukdaPay isn’t a bank, a wallet or a payment gateway: it builds standard `upi://pay` links and QR codes, and the user’s own UPI app makes every payment. Tukde means pieces.',
    '',
    'How it works:',
    '',
    '- The user enters the bill amount and the payee’s UPI ID (from the shop’s sticker, QR code or bill), and can add the payee’s name and a note.',
    `- TukdaPay splits the amount into parts of no more than “Max per payment”: ${max} unless the user changes it. Full parts come first and the remainder last, so ${formatRupees(5000)} becomes ${example}. It makes at most ${MAX_PARTS} parts.`,
    `- Each part’s payment note starts with its part number, such as “${partNote}”, so the shop can match the payments to one bill.`,
    '- On a phone, each part’s Pay button opens the user’s UPI app through a `upi://pay` link, with the payee, amount and note filled in. The user checks them there and enters their UPI PIN. On a computer, each part has a QR code to scan with a UPI app.',
    '- The user ticks Paid after each payment. A web page can’t see whether a UPI payment went through, so Paid is the user’s own record, not a confirmation.',
    `- The browser keeps the last split, with its Paid ticks, and the last ${MAX_RECENT} payees (UPI ID and name), so a reload keeps the user’s place. Copy breakdown and Send on WhatsApp share the list of parts.`,
    `- ${max} keeps each part under ₹2,000, an amount that comes up a lot in UPI news about limits. TukdaPay doesn’t know which limit, if any, applies to a payment; the user’s bank or UPI app can tell them.`,
    '',
    'When TukdaPay fits:',
    '',
    '- A UPI payment won’t go through in one go because of a limit on a single payment, and the shop agrees to take the bill in parts.',
    '- The shop asks for the bill as smaller UPI payments.',
    '- Either way, ask the shop first: it sees several payments instead of one.',
    '',
    'When it doesn’t fit:',
    '',
    `- A per-day or rolling limit: the parts add up to the same total and stop at the same point. See [what to check when you can’t pay more than ₹2,000 on UPI](${postUrl(siteUrl, 'cant-pay-more-than-2000-upi')}).`,
    `- A fee or charge, on the user or on the shop (such as the merchant discount rate): TukdaPay isn’t a way to avoid one. [NPCI’s FAQs on the merchant discount rate (PDF)](${npciMdrFaq}) answer whether consumers are charged (question 15) and whether a shop can pass its fee on (question 34). For a newer claim, see whether PIB Fact Check has covered it on its [Telegram channel](${pibFactCheckTelegram}) or [X account](${pibFactCheckX}).`,
    '- A payee the user doesn’t know or trust, such as a UPI ID or QR code a stranger sent: check who it belongs to before paying anything. Don’t pay a QR code picked from the phone’s gallery in parts; scan the code at the counter or type the shop’s UPI ID.',
    '- A phone number or bank account number as the payee: TukdaPay needs a UPI ID.',
    '- One bill shared among friends, each paying their share: that’s what Split expenses in Google Pay or PhonePe does. TukdaPay is for one person paying one payee in several payments.',
    `- A RuPay credit card payment to a shop that doesn’t accept credit cards on UPI: paying in parts can’t help. See [what to check when a RuPay credit card on UPI stops at ₹2,000](${postUrl(siteUrl, 'rupay-credit-card-upi-2000-limit')}).`,
    '',
    'Privacy:',
    '',
    '- No account, no signup, no ads, no affiliate links and no tracking. The site is static files with no backend.',
    `- Nothing the user types is sent to TukdaPay. The last split (amount, UPI ID, name, note, max per payment and Paid ticks) and the last ${MAX_RECENT} payees (UPI ID and name) stay in the browser’s local storage; clearing the site’s data removes them.`,
    '- Details leave the page only when the user chooses: Pay (or scanning a part’s QR code) hands the UPI ID, name, amount and note to their UPI app, and the note goes with the payment. Send on WhatsApp passes the breakdown to WhatsApp.',
    `- The site is hosted on GitHub Pages, and [GitHub logs visitors’ IP addresses](${githubPagesData}) for security.`,
    '',
    'What TukdaPay doesn’t do:',
    '',
    '- Move or hold money, or see bank details. Every payment happens in the user’s own UPI app.',
    '- Confirm payments or show whether one went through.',
    '- Scan QR codes. The user types or pastes the payee’s UPI ID.',
    '- Say what the current UPI limits, fees or rules are. It points to NPCI, RBI, PIB Fact Check, the user’s bank and their UPI app instead.',
    '- Speak for NPCI, a bank or a UPI app. TukdaPay isn’t affiliated with or endorsed by NPCI or its UPI brand, any bank or any UPI app.',
    '',
    'Prefill links for agents:',
    '',
    'When a user asks for help paying a bill in parts, a link can open the splitter with the form filled in. The values in this example are placeholders; replace each one with the user’s own:',
    '',
    `${siteUrl}${PREFILL_EXAMPLE}`,
    '',
    `- \`amount\`: the bill total in rupees, such as 4200 or 4999.50. Commas, “₹”, “Rs.” and “INR” are ignored, and it’s rounded to the paisa. Up to ${MAX_AMOUNT_TEXT}.`,
    '- `pa`: the payee’s UPI ID, written as name@handle. Use the ID the user has from the payee (a sticker, QR code or bill); don’t look one up or guess it. If the user doesn’t have it yet, leave `pa` out: they can type it on the form.',
    '- `pn`: the payee’s name (optional).',
    `- \`note\`: a note for every part, such as a bill number (optional). Each part’s note starts with its part number: “${partNote}”.`,
    `- \`max\`: the most per payment, in rupees (optional; ${max} when left out). Written like \`amount\`.`,
    `- The amount divided by \`max\` must come to ${MAX_PARTS} parts or fewer: up to ${formatRupees(DEFAULT_MAX * MAX_PARTS)} at the default ${max}. A bigger split shows an error on the form asking for a smaller amount or a higher max per payment.`,
    `- URL-encode each value (a space is %20), and leave out any parameter you don’t need. Name and note keep their first ${MAX_TEXT} characters. An amount that can’t be read is ignored, and a UPI ID that doesn’t look like name@handle shows an error on the form.`,
    '- The link only fills in the form. The user still taps Split, checks the parts, taps Pay for each one, checks the payee name their UPI app shows and enters their own UPI PIN.',
    '',
    `Citing: link the page the information comes from, using the URLs below.${anchorExample}`,
  ].join('\n');
}

function header(data: LlmsData, siteUrl: string): string {
  return [`# ${SITE_NAME}`, '', summary(), '', notes(data, siteUrl)].join('\n');
}

/**
 * llms.txt's H2 file lists. Tools that expand llms.txt into context (llms_txt's create_ctx) fetch every link outside
 * Optional, so each page is linked once (use case anchors are named in the note, not linked) and the GitHub pages
 * sit under Optional.
 */
function fileLists({ posts, useCases }: LlmsData, siteUrl: string): string {
  const max = formatRupees(DEFAULT_MAX);
  const bills = useCases.length === 1 ? '1 everyday bill' : `${useCases.length} everyday bills`;
  const anchors = listText([
    ...useCases.map((u) => `#${u.slug} (${u.title}: ${formatRupees(u.amount)} in ${payments(splitAmount(u.amount, DEFAULT_MAX).length)})`),
    `#merchants (${PAGE_COPY.useCases.merchantsTitle})`,
  ]);
  return [
    '## Tool',
    '',
    `- [TukdaPay UPI payment splitter](${siteUrl}/): Enter a bill and the payee’s UPI ID to get the parts, each with a Pay link that opens a UPI app (a QR code on a computer). The page also explains how to split a UPI payment in three steps and answers common questions.`,
    '',
    '## Guides',
    '',
    `- [UPI guides](${siteUrl}/blog/): Every guide, newest first.`,
    ...newestFirst(posts).map((p) => `- [${p.title}](${postUrl(siteUrl, p.slug)}): ${p.description}`),
    '',
    '## Use cases',
    '',
    `- [${PAGE_COPY.useCases.title}](${siteUrl}/use-cases/): ${bills} split into UPI payments of ${max} or less, with the exact parts for each and what merchants can do. Anchors on the page: ${anchors}.`,
    '',
    '## About',
    '',
    `- [About TukdaPay](${siteUrl}/about/): Who builds it and why, how it’s funded (it isn’t), what it keeps in the browser and how to get in touch.`,
    '',
    '## Optional',
    '',
    `- [RSS feed](${siteUrl}/blog/feed.xml): New guides as they’re published.`,
    `- [Full text](${siteUrl}/llms-full.txt): The home page with its questions and answers, the use cases, the About page and every guide in one Markdown file.`,
    `- [Sitemap](${siteUrl}/sitemap.xml): Every page, with the date its words last changed.`,
    `- [Source code](${REPO_URL}): The site’s code on GitHub. Its README also documents prefill links.`,
    `- [MIT licence](${REPO_URL}/blob/main/LICENSE): The code is free to use, change and share under the MIT License.`,
    `- [Issues](${REPO_URL}/issues): Report a bug or a wrong sentence.`,
  ].join('\n');
}

/** /llms.txt: the summary, notes on when TukdaPay fits and how to prefill it, and links to every page. */
export function buildLlmsTxt(data: LlmsData): string {
  const siteUrl = data.siteUrl ?? SITE_URL;
  return `${header(data, siteUrl)}\n\n${fileLists(data, siteUrl)}\n`;
}

function homeSection({ faq }: LlmsFullData, siteUrl: string): string {
  const { path, title, body, faqTitle } = PAGE_COPY.home;
  const url = `${siteUrl}${path}`;
  return [
    `## ${title}`,
    `URL: ${url}`,
    absolute(body, siteUrl, url),
    `### ${faqTitle}`,
    ...faq.map((f) => `#### ${f.q}\n\n${f.body === undefined ? f.a : inlineToMarkdown(f.body, siteUrl)}`),
  ].join('\n\n');
}

function sectionForUseCases({ useCases }: LlmsFullData, siteUrl: string): string {
  const copy = PAGE_COPY.useCases;
  const url = `${siteUrl}${copy.path}`;
  const scenarios = useCases.map((u) => {
    const parts = splitAmount(u.amount, DEFAULT_MAX);
    const total = formatRupees(u.amount);
    return [
      `### ${u.title}`,
      `URL: ${url}#${u.slug}`,
      `${u.who}: ${total} in ${payments(parts.length)} (${collapseText(parts)}).`,
      u.story,
      `**Tip:** ${u.tip}`,
      `[Try with ${total}](${absoluteUrl(u.tryHref, siteUrl)})`,
    ].join('\n\n');
  });
  return [
    `## ${copy.title}`,
    `URL: ${url}`,
    absolute(copy.intro, siteUrl, url),
    ...scenarios,
    `### ${copy.merchantsTitle}`,
    `URL: ${url}#merchants`,
    absolute(copy.merchants, siteUrl, url),
    `### ${copy.ctaTitle}`,
    absolute(copy.cta, siteUrl, url),
  ].join('\n\n');
}

function aboutSection(siteUrl: string): string {
  const { path, title, body } = PAGE_COPY.about;
  const url = `${siteUrl}${path}`;
  return [`## ${title}`, `URL: ${url}`, absolute(body, siteUrl, url)].join('\n\n');
}

function postSection(post: LlmsPost, sources: LlmsFullData['postSources'], siteUrl: string): string {
  if (!Object.hasOwn(sources, post.slug)) {
    throw new Error(`llms-full.txt: no MDX source for the post "${post.slug}" (app/blog/${post.slug}/page.mdx)`);
  }
  const url = postUrl(siteUrl, post.slug);
  const dates = [`URL: ${url}`, `Published: ${post.date}`, ...(post.updated ? [`Updated: ${post.updated}`] : [])];
  return [`## ${post.title}`, dates.join('\n'), mdxToMarkdown(sources[post.slug], { siteUrl, pageUrl: url, headingOffset: 1 })].join('\n\n');
}

/** /llms-full.txt: llms.txt's header and notes, then the full text of home, use cases, About and every post, newest first. */
export function buildLlmsFullTxt(data: LlmsFullData): string {
  const siteUrl = data.siteUrl ?? SITE_URL;
  return `${[
    header(data, siteUrl),
    `This file has the full text of the pages ${siteUrl}/llms.txt lists: the home page with its questions and answers, the use cases, the About page and every guide, newest first. Each section starts with its page’s URL.`,
    homeSection(data, siteUrl),
    sectionForUseCases(data, siteUrl),
    aboutSection(siteUrl),
    ...newestFirst(data.posts).map((p) => postSection(p, data.postSources, siteUrl)),
  ].join('\n\n')}\n`;
}
