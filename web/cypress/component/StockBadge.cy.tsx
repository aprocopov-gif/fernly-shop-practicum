import { StockBadge } from '../../src/components/StockBadge';

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

/** Uses the element's own background, or the nearest opaque ancestor. */
function opaqueBackground(el: Element): string {
  let node: Element | null = el;
  while (node) {
    const bg = window.getComputedStyle(node).backgroundColor;
    if (isOpaque(bg)) return bg;
    node = node.parentElement;
  }
  throw new Error('No opaque background found for badge text');
}

describe('StockBadge', () => {
  it('C1 shows Only N left for stock 1–3, nothing for 4/30/0, contrast ≥ 4.5:1', { tags: '@component' }, () => {
    cy.mount(
      <div style={{ background: '#f6faf3', padding: '8px' }}>
        <StockBadge stock={1} />
      </div>,
    );
    cy.findByText('Only 1 left').then(($badge) => {
      const node = $badge[0];
      const fg = window.getComputedStyle(node).color;
      const bg = opaqueBackground(node);
      expect(contrastRatio(fg, bg), 'stock 1 badge contrast').to.be.at.least(4.5);
    });

    cy.mount(<StockBadge stock={2} />);
    cy.findByText('Only 2 left');

    cy.mount(<StockBadge stock={3} />);
    cy.findByText('Only 3 left');

    cy.mount(<StockBadge stock={4} />);
    cy.findByText(/Only .+ left/).should('not.exist');

    cy.mount(<StockBadge stock={30} />);
    cy.findByText(/Only .+ left/).should('not.exist');

    cy.mount(<StockBadge stock={0} />);
    cy.findByText('Only 0 left').should('not.exist');
    cy.findByText(/Only .+ left/).should('not.exist');
  });
});
