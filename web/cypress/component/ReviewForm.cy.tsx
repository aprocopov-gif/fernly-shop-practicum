import { ReviewForm } from '../../src/components/ReviewForm';

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
  throw new Error('No opaque background found for form text');
}

function assertKeyboardFocusVisible($el: JQuery<HTMLElement>, label: string) {
  expect($el[0], `${label} has keyboard focus`).to.equal(document.activeElement);
  const style = window.getComputedStyle($el[0]);
  expect(style.outlineStyle, `${label} outline style`).to.not.equal('none');
  expect(parseFloat(style.outlineWidth), `${label} outline width`).to.be.greaterThan(0);
}

describe('ReviewForm', () => {
  it('C2-01 shows Write a review, Your review label, and Post review', { tags: '@component' }, () => {
    cy.mount(<ReviewForm onSubmit={cy.spy()} />);

    cy.findByRole('heading', { name: 'Write a review' });
    cy.findByText('Your review');
    cy.findByLabelText('Your review');
    cy.findByRole('button', { name: 'Post review' });
  });

  it('C2-02 calls onSubmit once with rating 4 and trimmed text', { tags: '@component' }, () => {
    const onSubmit = cy.spy().as('onSubmit');
    cy.mount(<ReviewForm onSubmit={onSubmit} />);

    cy.findByRole('radio', { name: '4 stars' }).click();
    cy.findByLabelText('Your review').type('  Great healthy plant  ');
    cy.findByRole('button', { name: 'Post review' }).click();

    cy.get('@onSubmit').should('have.been.calledOnceWithExactly', {
      rating: 4,
      text: 'Great healthy plant',
    });
  });

  it('C2-03 shows choose a rating message and does not call onSubmit', { tags: '@component' }, () => {
    const onSubmit = cy.spy().as('onSubmit');
    cy.mount(<ReviewForm onSubmit={onSubmit} />);

    cy.findByLabelText('Your review').type('Plenty of characters here');
    cy.findByRole('button', { name: 'Post review' }).click();

    cy.findByRole('alert').within(() => {
      cy.findByText('Choose a rating from 1 to 5 stars.');
    });
    cy.get('@onSubmit').should('not.have.been.called');
  });

  it('C2-04 shows write at least 10 characters and does not call onSubmit', { tags: '@component' }, () => {
    const onSubmit = cy.spy().as('onSubmit');
    cy.mount(<ReviewForm onSubmit={onSubmit} />);

    cy.findByRole('radio', { name: '3 stars' }).click();
    cy.findByLabelText('Your review').type('too short');
    cy.findByRole('button', { name: 'Post review' }).click();

    cy.findByRole('alert').within(() => {
      cy.findByText('Write at least 10 characters.');
    });
    cy.get('@onSubmit').should('not.have.been.called');
  });

  it('C2-05 shows the error prop with role alert', { tags: '@component' }, () => {
    cy.mount(<ReviewForm onSubmit={cy.spy()} error="Something went wrong." />);

    cy.findByRole('alert').within(() => {
      cy.findByText('Something went wrong.');
    });
  });

  it('C2-06 shows Posting… and disables the button when busy', { tags: '@component' }, () => {
    cy.mount(<ReviewForm onSubmit={cy.spy()} busy />);

    cy.findByRole('button', { name: 'Posting…' }).then(($el) =>
      expect($el, 'Post review while a request is in flight').to.be.disabled,
    );
  });

  it('C2-07 sets textarea maxLength to 500', { tags: '@component' }, () => {
    cy.mount(<ReviewForm onSubmit={cy.spy()} />);

    cy.findByLabelText('Your review').then(($el) => {
      expect($el.attr('maxLength'), 'review textarea maxLength').to.equal('500');
    });
  });

  it('C2-08 names the textarea, reaches controls by keyboard, shows focus, and meets contrast', {
    tags: '@component',
  }, () => {
    cy.mount(<ReviewForm onSubmit={cy.spy()} />);

    cy.findByText('Your review');
    cy.findByRole('textbox', { name: 'Your review' });

    cy.press(Cypress.Keyboard.Keys.TAB);
    cy.findByRole('textbox', { name: 'Your review' }).then(($textarea) => {
      assertKeyboardFocusVisible($textarea, 'Your review');
    });

    cy.press(Cypress.Keyboard.Keys.TAB);
    cy.findByRole('button', { name: 'Post review' }).then(($button) => {
      assertKeyboardFocusVisible($button, 'Post review');
    });

    cy.findByText('Your review').then(($label) => {
      const node = $label[0];
      const fg = window.getComputedStyle(node).color;
      const bg = opaqueBackground(node);
      expect(contrastRatio(fg, bg), 'Your review label contrast').to.be.at.least(4.5);
    });

    cy.findByRole('heading', { name: 'Write a review' }).then(($heading) => {
      const node = $heading[0];
      const fg = window.getComputedStyle(node).color;
      const bg = opaqueBackground(node);
      expect(contrastRatio(fg, bg), 'Write a review heading contrast').to.be.at.least(4.5);
    });
  });
});
