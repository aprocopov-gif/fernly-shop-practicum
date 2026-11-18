import { SortSelect } from '../../src/components/SortSelect';

describe('SortSelect', () => {
  it('SS-01 labelled Sort by with Featured selected and all sort options', { tags: '@component' }, () => {
    cy.mount(<SortSelect value="featured" onChange={cy.spy()} />);

    cy.findByText('Sort by');
    cy.findByRole('combobox', { name: 'Sort by' }).then(($select) => {
      expect($select.find('option:selected').text(), 'selected visible text').to.equal('Featured');
    });

    cy.findByRole('option', { name: 'Featured' });
    cy.findByRole('option', { name: 'Price: low to high' });
    cy.findByRole('option', { name: 'Price: high to low' });
    cy.findByRole('option', { name: 'Name: A to Z' });
    cy.findByRole('option', { name: 'Best rated' });
  });

  it('SS-02 selected visible text is Price: high to low when value is price-desc', { tags: '@component' }, () => {
    cy.mount(<SortSelect value="price-desc" onChange={cy.spy()} />);

    cy.findByRole('combobox', { name: 'Sort by' }).then(($select) => {
      expect($select.find('option:selected').text(), 'selected visible text').to.equal(
        'Price: high to low',
      );
    });
  });

  it('SS-03 onChange called once with price-asc when choosing Price: low to high', { tags: '@component' }, () => {
    const onChange = cy.spy().as('onChange');
    cy.mount(<SortSelect value="featured" onChange={onChange} />);

    cy.findByRole('combobox', { name: 'Sort by' }).select('Price: low to high');

    cy.get('@onChange').should('have.been.calledOnceWithExactly', 'price-asc');
  });

  it('SS-04 onChange called once with price-desc when choosing Price: high to low', { tags: '@component' }, () => {
    const onChange = cy.spy().as('onChange');
    cy.mount(<SortSelect value="featured" onChange={onChange} />);

    cy.findByRole('combobox', { name: 'Sort by' }).select('Price: high to low');

    cy.get('@onChange').should('have.been.calledOnceWithExactly', 'price-desc');
  });

  it('SS-05 onChange called once with name when choosing Name: A to Z', { tags: '@component' }, () => {
    const onChange = cy.spy().as('onChange');
    cy.mount(<SortSelect value="featured" onChange={onChange} />);

    cy.findByRole('combobox', { name: 'Sort by' }).select('Name: A to Z');

    cy.get('@onChange').should('have.been.calledOnceWithExactly', 'name');
  });

  it('SS-06 onChange called once with rating when choosing Best rated', { tags: '@component' }, () => {
    const onChange = cy.spy().as('onChange');
    cy.mount(<SortSelect value="featured" onChange={onChange} />);

    cy.findByRole('combobox', { name: 'Sort by' }).select('Best rated');

    cy.get('@onChange').should('have.been.calledOnceWithExactly', 'rating');
  });

  it('SS-07 select has accessible name Sort by and can be changed with the keyboard', { tags: '@component' }, () => {
    const onChange = cy.spy().as('onChange');
    cy.mount(<SortSelect value="featured" onChange={onChange} />);

    cy.findByRole('combobox', { name: 'Sort by' });

    // Cypress cannot .type() into a native <select>; Tab onto it, then change while focused.
    cy.press(Cypress.Keyboard.Keys.TAB);
    cy.findByRole('combobox', { name: 'Sort by' }).then(($select) => {
      expect($select[0], 'Sort by has keyboard focus').to.equal(document.activeElement);
    });
    cy.focused().select('Price: low to high');

    cy.get('@onChange').should('have.been.calledOnceWithExactly', 'price-asc');
  });
});
