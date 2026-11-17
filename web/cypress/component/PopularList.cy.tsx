import { PopularList, type PopularItem } from '../../src/components/PopularList';

function parseRgb(color: string): [number, number, number] {
  const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) {
    throw new Error(`Unsupported color: ${color}`);
  }
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(fg: string, bg: string): number {
  const [fr, fgG, fb] = parseRgb(fg);
  const [br, bgG, bb] = parseRgb(bg);
  const lFg = relativeLuminance(fr, fgG, fb);
  const lBg = relativeLuminance(br, bgG, bb);
  const lighter = Math.max(lFg, lBg);
  const darker = Math.min(lFg, lBg);
  return (lighter + 0.05) / (darker + 0.05);
}

function isOpaque(color: string): boolean {
  const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!m) return false;
  const alpha = m[4] === undefined ? 1 : Number(m[4]);
  return alpha >= 1;
}

function opaqueBackground(el: Element): string {
  let node: Element | null = el;
  while (node) {
    const bg = window.getComputedStyle(node).backgroundColor;
    if (isOpaque(bg)) return bg;
    node = node.parentElement;
  }
  throw new Error('No opaque background found');
}

const FIVE_ITEMS: PopularItem[] = [
  { id: 'pl-monstera', name: 'Monstera Deliciosa', unitsSold: 128 },
  { id: 'pl-snake', name: 'Snake Plant', unitsSold: 97 },
  { id: 'pl-pothos', name: "Pothos 'Golden'", unitsSold: 80 },
  { id: 'pl-zz', name: 'ZZ Plant', unitsSold: 61 },
  { id: 'pl-spider', name: 'Spider Plant', unitsSold: 40 },
];

describe('PopularList', () => {
  it('C1 shows four popular links leaving out currentId with sold counts', { tags: '@component' }, () => {
    cy.mount(<PopularList items={FIVE_ITEMS} currentId="pl-aloe" />);

    cy.findByRole('region', { name: 'Popular right now' });
    cy.findByRole('heading', { level: 2, name: 'Popular right now' });

    cy.findByRole('list').within(() => {
      cy.findAllByRole('listitem').should('have.length', 4);
      cy.findAllByRole('link').should('have.length', 4);
    });

    const expected = [
      { name: 'Monstera Deliciosa', id: 'pl-monstera', sold: '128 sold this month' },
      { name: 'Snake Plant', id: 'pl-snake', sold: '97 sold this month' },
      { name: "Pothos 'Golden'", id: 'pl-pothos', sold: '80 sold this month' },
      { name: 'ZZ Plant', id: 'pl-zz', sold: '61 sold this month' },
    ];

    cy.findAllByRole('link').each(($link, index) => {
      const row = expected[index]!;
      expect($link.text(), `link ${index}`).to.eq(row.name);
      expect($link.attr('href'), `href ${index}`).to.eq(`/plants/${row.id}`);
    });

    for (const row of expected) {
      cy.findByText(row.sold);
    }

    cy.findByRole('link', { name: 'Spider Plant' }).should('not.exist');

    cy.findByText('128 sold this month').then(($el) => {
      const fg = window.getComputedStyle($el[0]!).color;
      const bg = opaqueBackground($el[0]!);
      expect(contrastRatio(fg, bg), 'sold this month contrast').to.be.at.least(4.5);
    });
  });
});
