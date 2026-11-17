import { useState } from 'react';
import { StarRatingInput } from '../../src/components/StarRatingInput';

const STAR_NAMES = ['1 star', '2 stars', '3 stars', '4 stars', '5 stars'] as const;

function assertKeyboardFocusVisible($el: JQuery<HTMLElement>, label: string) {
  expect($el[0], `${label} has keyboard focus`).to.equal(document.activeElement);
  const style = window.getComputedStyle($el[0]);
  expect(style.outlineStyle, `${label} outline style`).to.not.equal('none');
  expect(parseFloat(style.outlineWidth), `${label} outline width`).to.be.greaterThan(0);
}

function StarRatingHarness({
  initial = 0,
  onChange,
}: {
  initial?: number;
  onChange: (rating: number) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <StarRatingInput
      value={value}
      onChange={(rating) => {
        onChange(rating);
        setValue(rating);
      }}
    />
  );
}

describe('StarRatingInput', () => {
  it('C3-01 shows Your rating radiogroup with five named star radios', { tags: '@component' }, () => {
    cy.mount(<StarRatingInput value={0} onChange={cy.spy()} />);

    cy.findByRole('radiogroup', { name: 'Your rating' });
    cy.findByRole('radio', { name: '1 star' });
    cy.findByRole('radio', { name: '2 stars' });
    cy.findByRole('radio', { name: '3 stars' });
    cy.findByRole('radio', { name: '4 stars' });
    cy.findByRole('radio', { name: '5 stars' });
  });

  it('C3-02 calls onChange with 4 and selects the 4 stars radio', { tags: '@component' }, () => {
    const onChange = cy.spy().as('onChange');
    cy.mount(<StarRatingHarness onChange={onChange} />);

    cy.findByRole('radio', { name: '4 stars' }).click();

    cy.get('@onChange').should('have.been.calledWith', 4);
    cy.findByRole('radio', { name: '4 stars' }).then(($el) =>
      expect($el, '4 stars selected after click').to.have.attr('aria-checked', 'true'),
    );
  });

  it('C3-03 selects no star radio when value is 0', { tags: '@component' }, () => {
    cy.mount(<StarRatingInput value={0} onChange={cy.spy()} />);

    STAR_NAMES.forEach((name) => {
      cy.findByRole('radio', { name }).then(($el) => {
        expect($el.attr('aria-checked'), `${name} when value is 0`).to.not.equal('true');
      });
    });
  });

  it('C3-04 tabs into the group and changes rating with arrow keys', { tags: '@component' }, () => {
    const onChange = cy.spy().as('onChange');
    cy.mount(<StarRatingHarness initial={0} onChange={onChange} />);

    cy.press(Cypress.Keyboard.Keys.TAB);
    cy.findByRole('radio', { name: '1 star' }).then(($el) => {
      assertKeyboardFocusVisible($el, '1 star');
    });

    cy.press(Cypress.Keyboard.Keys.RIGHT);
    cy.get('@onChange').should('have.been.calledWith', 2);
    cy.findByRole('radio', { name: '2 stars' }).then(($el) => {
      expect($el, '2 stars selected after ArrowRight').to.have.attr('aria-checked', 'true');
      assertKeyboardFocusVisible($el, '2 stars');
    });
  });

  it('C3-05 exposes the selected star as a checked radio with its name', { tags: '@component' }, () => {
    cy.mount(<StarRatingInput value={4} onChange={cy.spy()} />);

    cy.findByRole('radio', { name: '4 stars' }).then(($el) =>
      expect($el, '4 stars announced as checked').to.have.attr('aria-checked', 'true'),
    );
    cy.findByRole('radio', { name: '1 star' }).then(($el) =>
      expect($el.attr('aria-checked'), '1 star not checked').to.not.equal('true'),
    );
  });
});
