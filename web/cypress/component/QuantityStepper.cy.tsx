import { QuantityStepper } from '../../src/components/QuantityStepper';

describe('QuantityStepper', () => {
  it('QS-01 shows a Quantity group with visible value 2', { tags: '@component' }, () => {
    cy.mount(<QuantityStepper value={2} max={5} onChange={cy.spy()} />);

    cy.findByRole('group', { name: 'Quantity' });
    cy.findByText('2');
  });

  it('QS-02 uses the custom label as the group name', { tags: '@component' }, () => {
    cy.mount(
      <QuantityStepper label="Quantity of Pothos" value={1} max={5} onChange={cy.spy()} />,
    );

    cy.findByRole('group', { name: 'Quantity of Pothos' });
  });

  it('QS-03 calls onChange with value + 1 when Increase is clicked', { tags: '@component' }, () => {
    const onChange = cy.spy().as('onChange');
    cy.mount(<QuantityStepper value={2} max={5} onChange={onChange} />);

    cy.findByRole('button', { name: 'Increase quantity' }).click();

    cy.get('@onChange').should('have.been.calledOnceWithExactly', 3);
  });

  it('QS-04 calls onChange with value − 1 when Decrease is clicked', { tags: '@component' }, () => {
    const onChange = cy.spy().as('onChange');
    cy.mount(<QuantityStepper value={2} max={5} onChange={onChange} />);

    cy.findByRole('button', { name: 'Decrease quantity' }).click();

    cy.get('@onChange').should('have.been.calledOnceWithExactly', 1);
  });

  it('QS-05 disables Decrease at the minimum and leaves Increase enabled', { tags: '@component' }, () => {
    cy.mount(<QuantityStepper value={1} min={1} max={5} onChange={cy.spy()} />);

    cy.findByRole('button', { name: 'Decrease quantity' }).then(($el) =>
      expect($el, 'Decrease quantity at min').to.be.disabled,
    );
    cy.findByRole('button', { name: 'Increase quantity' }).then(($el) =>
      expect($el, 'Increase quantity above min').to.not.be.disabled,
    );
  });

  it('QS-06 disables Increase at the stock limit', { tags: ['@component', '@known-bug'] }, () => {
    cy.mount(<QuantityStepper value={3} max={3} onChange={cy.spy()} />);

    cy.findByRole('button', { name: 'Increase quantity' }).then(($el) =>
      expect($el, 'Increase quantity at stock limit').to.be.disabled,
    );
  });

  it('QS-07 disables both buttons when min equals max', { tags: ['@component', '@known-bug'] }, () => {
    cy.mount(<QuantityStepper value={1} max={1} onChange={cy.spy()} />);

    cy.findByRole('button', { name: 'Decrease quantity' }).then(($el) =>
      expect($el, 'Decrease when min equals max').to.be.disabled,
    );
    cy.findByRole('button', { name: 'Increase quantity' }).then(($el) =>
      expect($el, 'Increase when min equals max').to.be.disabled,
    );
  });

  it('QS-08 disables both buttons when disabled is true', { tags: '@component' }, () => {
    cy.mount(<QuantityStepper value={2} max={5} disabled onChange={cy.spy()} />);

    cy.findByRole('button', { name: 'Decrease quantity' }).then(($el) =>
      expect($el, 'Decrease when stepper disabled').to.be.disabled,
    );
    cy.findByRole('button', { name: 'Increase quantity' }).then(($el) =>
      expect($el, 'Increase when stepper disabled').to.be.disabled,
    );
  });

  it('QS-09 does not call onChange when Increase is clicked while disabled', { tags: '@component' }, () => {
    const onChange = cy.spy().as('onChange');
    cy.mount(<QuantityStepper value={2} max={5} disabled onChange={onChange} />);

    cy.findByRole('button', { name: 'Increase quantity' }).click({ force: true });

    cy.get('@onChange').should('not.have.been.called');
  });

  it('QS-10 exposes Decrease/Increase names and a polite live value', { tags: '@component' }, () => {
    cy.mount(<QuantityStepper value={2} max={5} onChange={cy.spy()} />);

    cy.findByRole('button', { name: 'Decrease quantity' });
    cy.findByRole('button', { name: 'Increase quantity' });
    cy.findByRole('status').should(($el) => {
      expect($el, 'quantity value').to.have.text('2');
      expect($el, 'quantity live region').to.have.attr('aria-live', 'polite');
      expect($el[0].tagName, 'quantity output element').to.equal('OUTPUT');
    });
  });
});
