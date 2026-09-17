export interface UseCase {
  slug: string;
  title: string;
  amount: number;
  who: string;
  story: string;
  tip: string;
  /** Short note the "Try with ₹X" link fills in, as the tip or story suggests. Keep it under 30 characters. */
  note?: string;
}

/** The splitter with this use case's amount, and its note if it has one, filled in. */
export function tryHref({ amount, note }: Pick<UseCase, 'amount' | 'note'>): string {
  return note ? `/?amount=${amount}&note=${encodeURIComponent(note)}` : `/?amount=${amount}`;
}

export const useCases: UseCase[] = [
  {
    slug: 'kirana',
    title: 'Monthly kirana bill',
    amount: 4200,
    who: 'Households',
    story: 'The month’s groceries at the corner shop come to ₹4,200 on the khata. The shop’s UPI sticker is on the counter.',
    tip: 'Put “Sept khata” in the note so the shopkeeper can tick it off in one go.',
    note: 'Sept khata',
  },
  {
    slug: 'restaurant',
    title: 'Restaurant bill for the table',
    amount: 3650,
    who: 'Dining out',
    story: 'Dinner for four is ₹3,650 and the restaurant’s QR is on the bill folder. One person pays and collects from the others later.',
    tip: 'Use the bill number as the note, and ask before you pay whether two payments are fine.',
    note: 'Bill 1042',
  },
  {
    slug: 'electronics',
    title: 'Phone, mixer or appliance',
    amount: 14999,
    who: 'Shopping',
    story: 'A ₹14,999 phone at a local electronics shop that takes UPI, but one payment that size won’t go through from your account.',
    tip: 'Eight payments means eight PINs. Ask the shop first, and put the invoice number in the note.',
    note: 'Invoice 318',
  },
  {
    slug: 'pharmacy',
    title: 'Pharmacy and diagnostics',
    amount: 2850,
    who: 'Health',
    story: 'Medicines and a blood test for a parent come to ₹2,850 at the pharmacy and lab next to the clinic.',
    tip: 'Use the prescription date as the note so the payments are easy to find later.',
    note: 'Prescription 12 Sept',
  },
  {
    slug: 'coaching',
    title: 'Tuition and coaching fees',
    amount: 5500,
    who: 'Education',
    story: 'The coaching centre collects ₹5,500 a month by UPI to the owner’s ID and hands over a receipt.',
    tip: 'Use the student’s name and month as the note, e.g. “Priya – Oct fees”.',
    note: 'Priya – Oct fees',
  },
  {
    slug: 'wedding',
    title: 'Wedding and event vendors',
    amount: 25000,
    who: 'Events',
    story: 'The decorator’s advance is ₹25,000, paid by UPI to the decorator’s ID.',
    tip: 'Ask the decorator first, then send the WhatsApp breakdown so both sides have the same list.',
    note: 'Decorator advance',
  },
  {
    slug: 'hotel',
    title: 'Hotel and homestay checkout',
    amount: 5400,
    who: 'Travel',
    story: 'Two nights at a homestay, ₹5,400, paid to the owner’s UPI ID at checkout.',
    tip: 'Note the booking dates, and ask the owner at checkout before you pay in parts.',
    note: 'Stay 10 to 12 Oct',
  },
  {
    slug: 'repairs',
    title: 'Plumber, electrician, mechanic',
    amount: 3200,
    who: 'Services',
    story: 'The bike service came to ₹3,200 including parts. The mechanic shows his UPI QR on his phone.',
    tip: 'Scan his QR once to get the UPI ID, then paste it into the splitter.',
    note: 'Bike service',
  },
];
