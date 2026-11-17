import { ReviewList } from '../../src/components/ReviewList';
import type { ReviewItem } from '../../src/components/ReviewList';

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
  throw new Error('No opaque background found for review list text');
}

const threeReviews: ReviewItem[] = [
  {
    id: 'rev-ben',
    author: 'Ben Moss',
    rating: 5,
    text: 'My third one. Impossible to kill.',
    createdAt: '2026-10-05T08:10:00.000Z',
  },
  {
    id: 'rev-omar',
    author: 'Omar K.',
    rating: 4,
    text: 'Arrived healthy, a little smaller than expected.',
    createdAt: '2026-09-18T15:30:00.000Z',
  },
  {
    id: 'rev-grace',
    author: 'Grace L.',
    rating: 5,
    text: 'Survived my dark hallway and a month of neglect.',
    createdAt: '2026-09-02T10:00:00.000Z',
  },
];

const singleReview: ReviewItem[] = [
  {
    id: 'rev-ava',
    author: 'Ava Green',
    rating: 5,
    text: 'Healthy leaves and easy care.',
    createdAt: '2026-11-01T12:00:00.000Z',
  },
];

describe('ReviewList', () => {
  it('C1-01 shows average, count, and each review author text and date', { tags: '@component' }, () => {
    cy.mount(<ReviewList average={4.7} count={3} reviews={threeReviews} />);

    cy.findByText(/4\.7 out of 5 · 3 reviews/);

    cy.findByText('Ben Moss');
    cy.findByText('My third one. Impossible to kill.');
    cy.findByText('Oct 5, 2026');

    cy.findByText('Omar K.');
    cy.findByText('Arrived healthy, a little smaller than expected.');
    cy.findByText('Sep 18, 2026');

    cy.findByText('Grace L.');
    cy.findByText('Survived my dark hallway and a month of neglect.');
    cy.findByText('Sep 2, 2026');
  });

  it('C1-02 uses singular review wording for one review', { tags: '@component' }, () => {
    cy.mount(<ReviewList average={5} count={1} reviews={singleReview} />);

    cy.findByText(/5\.0 out of 5 · 1 review(?!s)/);

    cy.findByText('Ava Green');
    cy.findByText('Healthy leaves and easy care.');
    cy.findByText('Nov 1, 2026');
  });

  it('C1-03 shows empty invitation with no average or list items', { tags: '@component' }, () => {
    cy.mount(<ReviewList average={0} count={0} reviews={[]} />);

    cy.findByText(/out of 5/).should('not.exist');
    cy.findByRole('listitem').should('not.exist');

    // Invitation-style empty copy (Q1 wording unresolved — do not pin the exact sentence).
    cy.findByText(/review/i);
    cy.findByText(/first/i);
  });

  it('C1-04 hides decorative stars and exposes visually hidden ratings', { tags: '@component' }, () => {
    cy.mount(<ReviewList average={4.7} count={3} reviews={threeReviews} />);

    cy.findByText(/4\.7 out of 5 · 3 reviews/).then(($avg) => {
      const stars = $avg[0].querySelectorAll('[aria-hidden="true"]');
      expect(stars.length, 'average decorative stars').to.be.at.least(1);
      stars.forEach((star) => {
        expect(star.getAttribute('aria-hidden'), 'average ★ aria-hidden').to.eq('true');
        expect(star.textContent ?? '', 'average ★ characters').to.match(/★+/);
      });
    });

    cy.findAllByText(/^\d out of 5$/).should('have.length', 3).then(($hiddenRatings) => {
      $hiddenRatings.each((index, el) => {
        const $hidden = Cypress.$(el);
        expect($hidden.text().trim(), `review ${index} rating name`).to.match(/^[1-5] out of 5$/);

        // `.visually-hidden` is 1×1 + clipped; Cypress `not.be.visible` does not treat that as hidden.
        const style = window.getComputedStyle(el);
        expect(style.position, `review ${index} rating clipped off-screen`).to.eq('absolute');
        expect(parseFloat(style.width), `review ${index} rating width`).to.be.at.most(1);
        expect(parseFloat(style.height), `review ${index} rating height`).to.be.at.most(1);
        expect(style.overflow, `review ${index} rating overflow`).to.eq('hidden');

        const ratingRoot = el.parentElement;
        expect(ratingRoot, `review ${index} rating root`).to.not.equal(null);
        const decorative = ratingRoot!.querySelector('[aria-hidden="true"]');
        expect(decorative, `review ${index} decorative ★`).to.not.equal(null);
        expect(decorative!.getAttribute('aria-hidden'), `review ${index} ★ aria-hidden`).to.eq('true');
        expect(decorative!.textContent ?? '', `review ${index} ★ characters`).to.match(/★+/);
      });
    });
  });

  it('C1-05 meets contrast for average and list text', { tags: '@component' }, () => {
    cy.mount(
      <div style={{ background: '#f6faf3', padding: '8px' }}>
        <ReviewList average={4.7} count={3} reviews={threeReviews} />
      </div>,
    );

    const assertContrast = (label: string) => ($el: JQuery<HTMLElement>) => {
      const node = $el[0];
      const fg = window.getComputedStyle(node).color;
      const bg = opaqueBackground(node);
      const ratio = contrastRatio(fg, bg);
      expect(ratio, `${label} contrast (${fg} on ${bg})`).to.be.at.least(4.5);
    };

    cy.findByText(/4\.7 out of 5 · 3 reviews/).then(assertContrast('average summary'));
    cy.findByText('Ben Moss').then(assertContrast('author'));
    cy.findByText('My third one. Impossible to kill.').then(assertContrast('review text'));
    cy.findByText('Oct 5, 2026').then(assertContrast('review date'));
  });
});
