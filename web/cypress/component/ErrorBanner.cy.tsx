import { ErrorBanner } from '../../src/components/Feedback';

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
  throw new Error('No opaque background found for banner text');
}

describe('ErrorBanner', () => {
  it('EB-01 shows the message without Try again when onRetry is omitted', { tags: '@component' }, () => {
    cy.mount(<ErrorBanner message="Your cart couldn't be loaded." />);

    cy.findByRole('alert').within(() => {
      cy.findByText("Your cart couldn't be loaded.");
    });
    cy.findByRole('button', { name: 'Try again' }).should('not.exist');
  });

  it('EB-02 shows Try again when onRetry is provided', { tags: '@component' }, () => {
    cy.mount(
      <ErrorBanner message="Your cart couldn't be loaded." onRetry={cy.spy().as('onRetry')} />,
    );

    cy.findByRole('button', { name: 'Try again' });
  });

  it('EB-03 calls onRetry once when Try again is clicked', { tags: '@component' }, () => {
    cy.mount(
      <ErrorBanner message="Your cart couldn't be loaded." onRetry={cy.spy().as('onRetry')} />,
    );

    cy.findByRole('button', { name: 'Try again' }).click();

    cy.get('@onRetry').should('have.been.calledOnce');
  });

  it('EB-04 uses role alert and names Try again', { tags: '@component' }, () => {
    cy.mount(
      <ErrorBanner
        message="The plant couldn't be loaded."
        onRetry={cy.spy().as('onRetry')}
      />,
    );

    cy.findByRole('alert').within(() => {
      cy.findByText("The plant couldn't be loaded.");
    });
    cy.findByRole('button', { name: 'Try again' });
  });

  it('EB-05 meets contrast for banner text on its background', { tags: '@component' }, () => {
    cy.mount(
      <div style={{ background: '#f6faf3', padding: '8px' }}>
        <ErrorBanner
          message="Your cart couldn't be loaded."
          onRetry={cy.spy().as('onRetry')}
        />
      </div>,
    );

    cy.findByText("Your cart couldn't be loaded.").then(($text) => {
      const node = $text[0];
      const fg = window.getComputedStyle(node).color;
      const bg = opaqueBackground(node);
      const ratio = contrastRatio(fg, bg);
      expect(ratio, 'banner text contrast').to.be.at.least(4.5);
    });
  });
});
