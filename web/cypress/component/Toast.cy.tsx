import { Toast } from '../../src/components/Feedback';

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
  throw new Error('No opaque background found for toast message');
}

describe('Toast', () => {
  it('TO-01 shows success message in a status region with success styling', { tags: '@component' }, () => {
    cy.mount(<Toast message="Added to cart" onClose={cy.spy()} duration={0} />);

    cy.findByRole('status').within(() => {
      cy.findByText('Added to cart');
    });
    cy.findByRole('status').then(($status) => {
      const bg = window.getComputedStyle($status[0]).backgroundColor;
      const [r, g, b] = parseRgb(bg);
      // success uses --leaf-800 (#24532d)
      expect([r, g, b], 'success background').to.deep.equal([36, 83, 45]);
    });
  });

  it('TO-02 shows error message with error styling', { tags: '@component' }, () => {
    cy.mount(
      <Toast message="Not enough stock" tone="error" onClose={cy.spy()} duration={0} />,
    );

    cy.findByRole('status').within(() => {
      cy.findByText('Not enough stock');
    });
    cy.findByRole('status').then(($status) => {
      const bg = window.getComputedStyle($status[0]).backgroundColor;
      const [r, g, b] = parseRgb(bg);
      // error uses #7a1f14
      expect([r, g, b], 'error background').to.deep.equal([122, 31, 20]);
    });
  });

  it('TO-03 calls onClose when Dismiss is clicked', { tags: '@component' }, () => {
    const onClose = cy.spy().as('onClose');
    cy.mount(<Toast message="Added to cart" onClose={onClose} duration={0} />);

    cy.findByRole('button', { name: 'Dismiss' }).click();
    cy.get('@onClose').should('have.been.calledOnce');
  });

  it('TO-04 calls onClose once after duration via clock', { tags: '@component' }, () => {
    // Only stub timeout APIs so React can still flush effects (rAF / microtasks).
    cy.clock(null, ['setTimeout', 'clearTimeout']);
    const onClose = cy.spy().as('onClose');
    cy.mount(<Toast message="Added to cart" onClose={onClose} duration={50} />);

    cy.findByRole('status');
    cy.get('@onClose').should('not.have.been.called');
    cy.tick(49);
    cy.get('@onClose').should('not.have.been.called');
    cy.tick(1);
    cy.get('@onClose').should('have.been.calledOnce');
  });

  it('TO-05 does not call onClose on a long tick when duration is 0', { tags: '@component' }, () => {
    cy.clock(null, ['setTimeout', 'clearTimeout']);
    const onClose = cy.spy().as('onClose');
    cy.mount(<Toast message="Added to cart" onClose={onClose} duration={0} />);

    cy.findByRole('status');
    cy.tick(60_000);
    cy.get('@onClose').should('not.have.been.called');
  });

  it('TO-06 exposes status role and Dismiss accessible name', { tags: '@component' }, () => {
    cy.mount(<Toast message="Added to cart" onClose={cy.spy()} duration={0} />);

    cy.findByRole('status');
    cy.findByRole('button', { name: 'Dismiss' });
  });

  it('TO-07 meets contrast for error message text on its background', { tags: '@component' }, () => {
    cy.mount(
      <div style={{ background: '#f6faf3', padding: '8px', minHeight: '80px' }}>
        <Toast message="Not enough stock" tone="error" onClose={cy.spy()} duration={0} />
      </div>,
    );

    cy.findByText('Not enough stock').then(($msg) => {
      const node = $msg[0];
      const fg = window.getComputedStyle(node).color;
      const bg = opaqueBackground(node);
      const ratio = contrastRatio(fg, bg);
      expect(ratio, 'error toast message contrast').to.be.at.least(4.5);
    });
  });
});
