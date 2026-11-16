import { PetSafeTag } from '../../src/components/PetSafeTag';

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
  throw new Error('No opaque background found for pet-safe tag text');
}

/** Matches the tag root whose visible label (excluding the decorative emoji) is `label`. */
function tagWithLabel(label: string) {
  return (_content: string, element: Element | null): boolean => {
    if (!element) return false;
    const emoji = element.querySelector('[aria-hidden="true"]');
    if (!emoji || emoji.parentElement !== element) return false;
    const withoutEmoji = (element.textContent ?? '').replace(emoji.textContent ?? '', '').trim();
    return withoutEmoji === label;
  };
}

describe('PetSafeTag', () => {
  it('PS-01 shows Pet safe when petSafe is true', { tags: '@component' }, () => {
    cy.mount(<PetSafeTag petSafe={true} />);

    cy.findByText(tagWithLabel('Pet safe'));
  });

  it('PS-02 shows Not pet safe when petSafe is false', { tags: '@component' }, () => {
    cy.mount(<PetSafeTag petSafe={false} />);

    cy.findByText(tagWithLabel('Not pet safe'));
  });

  it('PS-03 hides decorative emoji and names the tag from text', { tags: '@component' }, () => {
    cy.mount(<PetSafeTag petSafe={true} />);

    cy.findByText(tagWithLabel('Pet safe')).then(($tag) => {
      const emoji = $tag[0].querySelector('[aria-hidden="true"]');
      expect(emoji, '🐾 is present and aria-hidden').to.not.equal(null);
      expect(emoji?.getAttribute('aria-hidden'), '🐾 aria-hidden').to.equal('true');
      expect(emoji?.textContent, 'safe emoji').to.equal('🐾');
      expect($tag.text().replace(emoji?.textContent ?? '', '').trim(), 'accessible name').to.equal(
        'Pet safe',
      );
    });

    cy.mount(<PetSafeTag petSafe={false} />);

    cy.findByText(tagWithLabel('Not pet safe')).then(($tag) => {
      const emoji = $tag[0].querySelector('[aria-hidden="true"]');
      expect(emoji, '⚠ is present and aria-hidden').to.not.equal(null);
      expect(emoji?.getAttribute('aria-hidden'), '⚠ aria-hidden').to.equal('true');
      expect(emoji?.textContent, 'unsafe emoji').to.equal('⚠');
      expect($tag.text().replace(emoji?.textContent ?? '', '').trim(), 'accessible name').to.equal(
        'Not pet safe',
      );
    });
  });

  it('PS-04 meets contrast on page background for both states', { tags: '@component' }, () => {
    const cases = [
      { petSafe: true, label: 'Pet safe' },
      { petSafe: false, label: 'Not pet safe' },
    ] as const;

    cases.forEach(({ petSafe, label }) => {
      cy.mount(
        <div style={{ background: '#f6faf3', padding: '8px' }}>
          <PetSafeTag petSafe={petSafe} />
        </div>,
      );

      cy.findByText(tagWithLabel(label)).then(($tag) => {
        const node = $tag[0];
        const fg = window.getComputedStyle(node).color;
        const bg = opaqueBackground(node);
        const ratio = contrastRatio(fg, bg);
        expect(ratio, `${label} contrast on #f6faf3`).to.be.at.least(4.5);
      });
    });
  });
});
