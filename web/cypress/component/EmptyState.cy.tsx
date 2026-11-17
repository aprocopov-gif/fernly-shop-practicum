import { EmptyState } from '../../src/components/Feedback';

describe('EmptyState', () => {
  it('ES-01 shows level-2 heading and hides decorative seedling', { tags: '@component' }, () => {
    cy.mount(<EmptyState title="Your cart is empty" />);

    cy.findByRole('heading', { level: 2, name: 'Your cart is empty' });
    cy.contains('🌱').then(($icon) => {
      expect($icon.attr('aria-hidden'), 'decorative 🌱 is aria-hidden').to.eq('true');
    });
  });

  it('ES-02 shows heading plus message paragraph', { tags: '@component' }, () => {
    cy.mount(
      <EmptyState
        title="No plants match your filters"
        message="Try another search or clear a filter."
      />,
    );

    cy.findByRole('heading', { level: 2, name: 'No plants match your filters' });
    cy.findByText('Try another search or clear a filter.');
  });

  it('ES-03 shows usable Browse plants action link', { tags: '@component' }, () => {
    cy.mount(
      <EmptyState title="Your cart is empty" action={<a href="/">Browse plants</a>} />,
    );

    cy.findByRole('link', { name: 'Browse plants' }).then(($link) => {
      expect($link.attr('href'), 'Browse plants href').to.eq('/');
    });
  });

  it('ES-04 omits message paragraph and action when only title is given', { tags: '@component' }, () => {
    cy.mount(<EmptyState title="Your cart is empty" />);

    cy.findByRole('heading', { level: 2, name: 'Your cart is empty' })
      .parent()
      .should(($root) => {
        expect($root.text().replace(/\s+/g, ' ').trim(), 'only title text').to.match(/^🌱?\s*Your cart is empty$/);
        expect($root.find('p').length, 'no message paragraph').to.eq(0);
      });
    cy.findByRole('link').should('not.exist');
    cy.findByRole('button').should('not.exist');
  });

  it('ES-05 uses h2 heading and does not announce the icon', { tags: '@component' }, () => {
    cy.mount(
      <EmptyState
        title="No plants match your filters"
        message="Try another search or clear a filter."
      />,
    );

    cy.findByRole('heading', { level: 2, name: 'No plants match your filters' }).then(($h) => {
      expect($h.prop('tagName'), 'heading tag').to.eq('H2');
    });
    cy.contains('🌱').then(($icon) => {
      expect($icon.attr('aria-hidden'), 'icon not announced').to.eq('true');
    });
  });
});
