export interface UseCase {
  slug: string;
  title: string;
  amount: number;
  who: string;
  story: string;
  tip: string;
}

export const useCases: UseCase[] = [
  {
    slug: 'kirana',
    title: 'Monthly kirana bill',
    amount: 4200,
    who: 'Households',
    story: 'The month’s groceries at the corner shop come to ₹4,200 on the khata. The shop’s UPI sticker is on the counter.',
    tip: 'Put “Sept khata” in the note so the shopkeeper can tick it off in one go.',
  },
  {
    slug: 'restaurant',
    title: 'Restaurant bill for the table',
    amount: 3650,
    who: 'Dining out',
    story: 'Dinner for four is ₹3,650 and the restaurant’s QR is on the bill folder. One person pays and collects from the others later.',
    tip: 'Use the bill number as the note. Tell the waiter it’s coming as two payments.',
  },
  {
    slug: 'electronics',
    title: 'Phone, mixer or appliance',
    amount: 14999,
    who: 'Shopping',
    story: 'A ₹14,999 phone at a local electronics shop that takes UPI. The card machine is “not working today”.',
    tip: 'Eight payments — ask the shop first. Many prefer it to a card fee, some don’t.',
  },
  {
    slug: 'pharmacy',
    title: 'Pharmacy and diagnostics',
    amount: 2850,
    who: 'Health',
    story: 'Medicines and a blood test for a parent come to ₹2,850 at the chemist next to the clinic.',
    tip: 'Keep the note as the prescription date; it helps with insurance claims later.',
  },
  {
    slug: 'coaching',
    title: 'Tuition and coaching fees',
    amount: 6000,
    who: 'Education',
    story: 'The coaching centre collects ₹6,000 a month by UPI to the owner’s ID and hands over a receipt.',
    tip: 'Use the student’s name and month as the note, e.g. “Priya – Oct fees”.',
  },
  {
    slug: 'wedding',
    title: 'Wedding and event vendors',
    amount: 25000,
    who: 'Events',
    story: 'Advance to the decorator, balance to the caterer, tips to the band — all by UPI, all above ₹2,000.',
    tip: 'Send the WhatsApp breakdown to the vendor so both sides have the same list.',
  },
  {
    slug: 'hotel',
    title: 'Hotel and homestay checkout',
    amount: 5400,
    who: 'Travel',
    story: 'Two nights at a homestay, ₹5,400, paid to the owner’s UPI ID at checkout.',
    tip: 'Note the booking dates. Screenshots of three payments are easier than arguing about one.',
  },
  {
    slug: 'repairs',
    title: 'Plumber, electrician, mechanic',
    amount: 3200,
    who: 'Services',
    story: 'The bike service came to ₹3,200 including parts. The mechanic shows his UPI QR on his phone.',
    tip: 'Scan his QR once to get the UPI ID, then paste it here.',
  },
];
