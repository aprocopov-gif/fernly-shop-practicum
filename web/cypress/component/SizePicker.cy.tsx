import { SizePicker } from '../../src/components/SizePicker';
import type { SizeLabel } from '../../src/types';

const SML: { label: SizeLabel; priceDelta: number }[] = [
  { label: 'S', priceDelta: 0 },
  { label: 'M', priceDelta: 6 },
  { label: 'L', priceDelta: 12 },
];

describe('SizePicker', () => {
  it('SZ-01 shows Size legend, named radios, and base vs delta prices', { tags: ['@component', '@known-bug'] }, () => {
    cy.mount(<SizePicker sizes={SML} value="S" onChange={cy.spy()} />);

    cy.findByRole('group', { name: 'Size' });
    cy.findByRole('radio', { name: /Small/ });
    cy.findByRole('radio', { name: /Medium/ });
    cy.findByRole('radio', { name: /Large/ });
    cy.findByText('Base price');
    cy.findByText('+$6.00');
    cy.findByText('+$12.00');
  });

  it('SZ-02 checks Medium when value is M', { tags: '@component' }, () => {
    cy.mount(<SizePicker sizes={SML} value="M" onChange={cy.spy()} />);

    cy.findByRole('radio', { name: /Medium/ }).then(($el) =>
      expect($el, 'Medium selected').to.be.checked,
    );
    cy.findByRole('radio', { name: /Small/ }).then(($el) =>
      expect($el, 'Small not selected').to.not.be.checked,
    );
    cy.findByRole('radio', { name: /Large/ }).then(($el) =>
      expect($el, 'Large not selected').to.not.be.checked,
    );
  });

  it('SZ-03 calls onChange with L when Large is chosen', { tags: '@component' }, () => {
    const onChange = cy.spy().as('onChange');
    cy.mount(<SizePicker sizes={SML} value="S" onChange={onChange} />);

    cy.findByText('Large').click();

    cy.get('@onChange').should('have.been.calledOnceWithExactly', 'L');
  });

  it('SZ-04 shows a single Small option with Base price', { tags: '@component' }, () => {
    cy.mount(
      <SizePicker sizes={[{ label: 'S', priceDelta: 0 }]} value="S" onChange={cy.spy()} />,
    );

    cy.findAllByRole('radio').should('have.length', 1);
    cy.findByRole('radio', { name: /Small/ });
    cy.findByText('Base price');
  });

  it('SZ-05 shows Base price for Medium with zero delta', { tags: '@component' }, () => {
    cy.mount(
      <SizePicker sizes={[{ label: 'M', priceDelta: 0 }]} value="M" onChange={cy.spy()} />,
    );

    cy.findByRole('radio', { name: /Medium/ });
    cy.findByText('Base price');
  });

  it('SZ-06 shows +$0.50 for a half-dollar delta', { tags: ['@component', '@known-bug'] }, () => {
    cy.mount(
      <SizePicker sizes={[{ label: 'L', priceDelta: 0.5 }]} value="L" onChange={cy.spy()} />,
    );

    cy.findByText('+$0.50');
  });

  it('SZ-07 exposes Size fieldset name, radio names, and visible focus', { tags: '@component' }, () => {
    cy.mount(<SizePicker sizes={SML} value="S" onChange={cy.spy()} />);

    cy.findByRole('group', { name: 'Size' });
    cy.findByRole('radio', { name: /Small/ });
    cy.findByRole('radio', { name: /Medium/ });
    cy.findByRole('radio', { name: /Large/ });

    cy.findByRole('radio', { name: /Small/ }).focus();
    cy.findByRole('radio', { name: /Small/ }).then(($radio) => {
      expect($radio[0], 'Small radio has keyboard focus').to.equal(document.activeElement);
      const option = $radio[0].closest('label');
      expect(option, 'radio is inside a label').to.not.equal(null);
      const style = window.getComputedStyle(option!);
      expect(style.outlineStyle, 'option outline style').to.not.equal('none');
      expect(parseFloat(style.outlineWidth), 'option outline width').to.be.greaterThan(0);
    });
  });

  it('SZ-08 sets each radio name to plant-size', { tags: '@component' }, () => {
    cy.mount(<SizePicker sizes={SML} value="S" onChange={cy.spy()} name="plant-size" />);

    cy.findAllByRole('radio').each(($radio) => {
      expect($radio, 'radio name attribute').to.have.attr('name', 'plant-size');
    });
  });
});
