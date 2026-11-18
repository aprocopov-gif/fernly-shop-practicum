import { CareLevelBadge } from '../../src/components/CareLevelBadge';

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

describe('CareLevelBadge', () => {
  it('CL-01 shows Easy care with one decorative dot', { tags: '@component' }, () => {
    cy.mount(<CareLevelBadge level={1} />);

    cy.findByText(/Easy care/).should(($badge) => {
      expect($badge.text(), 'badge text').to.match(/Easy care/);
    });
    cy.findByText(/Easy care/)
      .find('[aria-hidden="true"]')
      .then(($dots) => {
        expect($dots.text(), 'decorative dots').to.eq('●');
      });
  });

  it('CL-02 shows Moderate care with two decorative dots', { tags: '@component' }, () => {
    cy.mount(<CareLevelBadge level={2} />);

    cy.findByText(/Moderate care/).should(($badge) => {
      expect($badge.text(), 'badge text').to.match(/Moderate care/);
    });
    cy.findByText(/Moderate care/)
      .find('[aria-hidden="true"]')
      .then(($dots) => {
        expect($dots.text(), 'decorative dots').to.eq('●●');
      });
  });

  it('CL-03 shows Expert care with three decorative dots', { tags: ['@component', '@known-bug'] }, () => {
    cy.mount(<CareLevelBadge level={3} />);

    cy.findByText(/Expert care/).should(($badge) => {
      expect($badge.text(), 'badge text').to.match(/Expert care/);
    });
    cy.findByText(/Expert care/)
      .find('[aria-hidden="true"]')
      .then(($dots) => {
        expect($dots.text(), 'decorative dots').to.eq('●●●');
      });
  });

  it('CL-04 hides dots from AT and exposes tooltip and Moderate care name', { tags: '@component' }, () => {
    cy.mount(<CareLevelBadge level={2} />);

    cy.findByText(/Moderate care/).then(($badge) => {
      expect($badge.attr('title'), 'tooltip').to.eq('How much care this plant needs');

      const $dots = $badge.find('[aria-hidden="true"]');
      expect($dots.length, 'decorative dots wrapper').to.eq(1);
      expect($dots.attr('aria-hidden'), 'dots aria-hidden').to.eq('true');

      const clone = $badge[0].cloneNode(true) as HTMLElement;
      clone.querySelectorAll('[aria-hidden="true"]').forEach((node) => node.remove());
      expect(clone.textContent ?? '', 'accessible name').to.match(/Moderate care/);
    });
  });

  it('CL-05 meets contrast on page background for levels 1–3', { tags: '@component' }, () => {
    ([1, 2, 3] as const).forEach((level) => {
      cy.mount(
        <div style={{ background: '#f6faf3', padding: '8px' }}>
          <CareLevelBadge level={level} />
        </div>,
      );

      cy.findByTitle('How much care this plant needs').then(($badge) => {
        const node = $badge[0];
        const fg = window.getComputedStyle(node).color;
        const bg = opaqueBackground(node);
        const ratio = contrastRatio(fg, bg);
        expect(ratio, `level ${level} contrast on badge background`).to.be.at.least(4.5);
      });
    });
  });
});
