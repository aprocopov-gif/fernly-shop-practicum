import { NotifyForm } from '../../src/components/NotifyForm';

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

describe('NotifyForm', () => {
  it('C2 labels Email me when it\'s back, submits trimmed email, confirms or alerts', { tags: '@component' }, () => {
    const onSubmit = cy.spy().as('onSubmit');
    cy.mount(<NotifyForm plantName="Chinese Money Plant" onSubmit={onSubmit} />);

    cy.findByText("Email me when it's back");
    cy.findByLabelText("Email me when it's back");
    cy.findByRole('textbox', { name: "Email me when it's back" });
    cy.findByRole('button', { name: 'Notify me' });

    cy.findByLabelText("Email me when it's back").focus();
    cy.findByLabelText("Email me when it's back").then(($input) => {
      assertKeyboardFocusVisible($input, 'notify email');
    });
    cy.findByLabelText("Email me when it's back").type('  ava@fernly.test  ');
    cy.findByRole('button', { name: 'Notify me' }).focus();
    cy.findByRole('button', { name: 'Notify me' }).then(($button) => {
      assertKeyboardFocusVisible($button, 'Notify me');
    });
    cy.findByRole('button', { name: 'Notify me' }).click();
    cy.get('@onSubmit').should('have.been.calledOnceWithExactly', 'ava@fernly.test');

    cy.findByText("Email me when it's back").then(($label) => {
      const node = $label[0];
      const fg = window.getComputedStyle(node).color;
      const bg = opaqueBackground(node);
      expect(contrastRatio(fg, bg), 'label contrast').to.be.at.least(4.5);
    });

    cy.mount(
      <NotifyForm
        plantName="Chinese Money Plant"
        onSubmit={cy.spy()}
        error="You're already on the list"
      />,
    );
    cy.findByRole('alert').within(() => {
      cy.findByText("You're already on the list");
    });
    cy.findByRole('alert').then(($alert) => {
      const node = $alert[0];
      const fg = window.getComputedStyle(node).color;
      const bg = opaqueBackground(node);
      expect(contrastRatio(fg, bg), 'error contrast').to.be.at.least(4.5);
    });

    cy.mount(
      <NotifyForm
        plantName="Chinese Money Plant"
        onSubmit={cy.spy()}
        subscribedEmail="ava@fernly.test"
      />,
    );
    cy.findByRole('status').within(() => {
      cy.findByText(/We'll email ava@fernly\.test when Chinese Money Plant is back/);
    });
  });
});
