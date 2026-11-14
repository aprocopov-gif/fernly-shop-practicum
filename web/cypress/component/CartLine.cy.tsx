import { CartLine } from '../../src/components/CartLine';
import type { CartLine as CartLineData } from '../../src/types';

const defaultLine: CartLineData = {
  id: 'line-1',
  plantId: 'pl-pothos',
  name: 'Pothos',
  size: 'S',
  unitPrice: 12.5,
  quantity: 2,
  lineTotal: 25,
  stock: 10,
  imageUrl: '/pothos.jpg',
};

describe('CartLine', () => {
  it('CA-01 shows name, Size S meta, $12.50 each, $25.00 total, and decorative image', { tags: ['@component', '@known-bug'] }, () => {
    cy.mount(
      <CartLine line={defaultLine} onQuantityChange={cy.spy()} onRemove={cy.spy()} />,
    );

    cy.findByText('Pothos');
    cy.findByText(/Size S/);
    cy.findByText('$12.50');
    cy.findByText(/each/);
    cy.findByText('$25.00');
    cy.findByAltText('').should('have.attr', 'src', '/pothos.jpg');
  });

  it('CA-02 calls onQuantityChange with line-1 and 3 when Increase is clicked', { tags: '@component' }, () => {
    const onQuantityChange = cy.spy().as('onQuantityChange');
    cy.mount(
      <CartLine line={defaultLine} onQuantityChange={onQuantityChange} onRemove={cy.spy()} />,
    );

    cy.findByRole('button', { name: 'Increase quantity' }).click();

    cy.get('@onQuantityChange').should('have.been.calledOnceWithExactly', 'line-1', 3);
  });

  it('CA-03 calls onQuantityChange with line-1 and 1 when Decrease is clicked', { tags: '@component' }, () => {
    const onQuantityChange = cy.spy().as('onQuantityChange');
    cy.mount(
      <CartLine line={defaultLine} onQuantityChange={onQuantityChange} onRemove={cy.spy()} />,
    );

    cy.findByRole('button', { name: 'Decrease quantity' }).click();

    cy.get('@onQuantityChange').should('have.been.calledOnceWithExactly', 'line-1', 1);
  });

  it('CA-04 calls onRemove with line-1 when Remove is clicked', { tags: '@component' }, () => {
    const onRemove = cy.spy().as('onRemove');
    cy.mount(
      <CartLine line={defaultLine} onQuantityChange={cy.spy()} onRemove={onRemove} />,
    );

    cy.findByRole('button', { name: 'Remove Pothos' }).click();

    cy.get('@onRemove').should('have.been.calledOnceWithExactly', 'line-1');
  });

  it('CA-05 disables Decrease at quantity 1 and leaves Increase enabled', { tags: '@component' }, () => {
    cy.mount(
      <CartLine
        line={{ ...defaultLine, quantity: 1, lineTotal: 12.5 }}
        onQuantityChange={cy.spy()}
        onRemove={cy.spy()}
      />,
    );

    cy.findByRole('button', { name: 'Decrease quantity' }).then(($el) =>
      expect($el, 'Decrease at min quantity').to.be.disabled,
    );
    cy.findByRole('button', { name: 'Increase quantity' }).then(($el) =>
      expect($el, 'Increase above min').to.not.be.disabled,
    );
  });

  it('CA-06 disables Increase when quantity equals stock', { tags: ['@component', '@known-bug'] }, () => {
    cy.mount(
      <CartLine
        line={{ ...defaultLine, quantity: 5, stock: 5, lineTotal: 62.5 }}
        onQuantityChange={cy.spy()}
        onRemove={cy.spy()}
      />,
    );

    cy.findByRole('button', { name: 'Increase quantity' }).then(($el) =>
      expect($el, 'Increase at stock limit').to.be.disabled,
    );
  });

  it('CA-07 disables stepper buttons and Remove while busy', { tags: '@component' }, () => {
    cy.mount(
      <CartLine line={defaultLine} onQuantityChange={cy.spy()} onRemove={cy.spy()} busy />,
    );

    cy.findByRole('button', { name: 'Decrease quantity' }).then(($el) =>
      expect($el, 'Decrease while busy').to.be.disabled,
    );
    cy.findByRole('button', { name: 'Increase quantity' }).then(($el) =>
      expect($el, 'Increase while busy').to.be.disabled,
    );
    cy.findByRole('button', { name: 'Remove Pothos' }).then(($el) =>
      expect($el, 'Remove while busy').to.be.disabled,
    );
  });

  it('CA-08 exposes Quantity of Pothos, Remove Pothos, Price each, and Line total names', { tags: '@component' }, () => {
    cy.mount(
      <CartLine line={defaultLine} onQuantityChange={cy.spy()} onRemove={cy.spy()} />,
    );

    cy.findByRole('group', { name: 'Quantity of Pothos' });
    cy.findByRole('button', { name: 'Remove Pothos' });
    cy.findByText(/Price each/);
    cy.findByText(/Line total/);
  });

  it('CA-09 shows Size L and $24.99 in meta', { tags: '@component' }, () => {
    cy.mount(
      <CartLine
        line={{ ...defaultLine, size: 'L', unitPrice: 24.99, lineTotal: 49.98 }}
        onQuantityChange={cy.spy()}
        onRemove={cy.spy()}
      />,
    );

    cy.findByText(/Size L/);
    cy.findByText('$24.99');
  });
});
