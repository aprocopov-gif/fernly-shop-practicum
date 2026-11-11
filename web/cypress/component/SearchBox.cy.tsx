import { useState } from 'react';
import { SearchBox } from '../../src/components/SearchBox';

function assertKeyboardFocusVisible($el: JQuery<HTMLElement>, label: string) {
  expect($el[0], `${label} has keyboard focus`).to.equal(document.activeElement);
  const style = window.getComputedStyle($el[0]);
  expect(style.outlineStyle, `${label} outline style`).to.not.equal('none');
  expect(parseFloat(style.outlineWidth), `${label} outline width`).to.be.greaterThan(0);
}

/** Lets the parent update `value` after mount so SB-06 can exercise the sync effect. */
function SearchBoxWithValueControl({
  initialValue,
  onSearch,
}: {
  initialValue: string;
  onSearch: (value: string) => void;
}) {
  const [value, setValue] = useState(initialValue);
  return (
    <div>
      <SearchBox value={value} onSearch={onSearch} />
      <button type="button" onClick={() => setValue('')}>
        Clear value prop
      </button>
    </div>
  );
}

describe('SearchBox', () => {
  it('SB-01 shows search form, Search plants hint, Search button, and no Clear search', { tags: '@component' }, () => {
    cy.mount(<SearchBox value="" onSearch={cy.spy()} />);

    cy.findByRole('search');
    cy.findByText('Search plants');
    cy.findByRole('button', { name: 'Search' });
    cy.findByRole('button', { name: 'Clear search' }).should('not.exist');
  });

  it('SB-02 shows value, Clear search, and hides the hint when non-empty', { tags: '@component' }, () => {
    cy.mount(<SearchBox value="pothos" onSearch={cy.spy()} />);

    cy.findByRole('searchbox').should('have.value', 'pothos');
    cy.findByRole('button', { name: 'Clear search' });
    cy.findByText('Search plants').should('not.exist');
  });

  it('SB-03 calls onSearch with Monstera on submit', { tags: '@component' }, () => {
    const onSearch = cy.spy().as('onSearch');
    cy.mount(<SearchBox value="" onSearch={onSearch} />);

    cy.findByRole('searchbox').type('Monstera');
    cy.findByRole('button', { name: 'Search' }).click();

    cy.get('@onSearch').should('have.been.calledOnceWithExactly', 'Monstera');
  });

  it('SB-04 trims surrounding whitespace before calling onSearch', { tags: '@component' }, () => {
    const onSearch = cy.spy().as('onSearch');
    cy.mount(<SearchBox value="" onSearch={onSearch} />);

    cy.findByRole('searchbox').type('  pothos  ');
    cy.findByRole('button', { name: 'Search' }).click();

    cy.get('@onSearch').should('have.been.calledOnceWithExactly', 'pothos');
  });

  it('SB-05 clears the draft and calls onSearch with empty string', { tags: '@component' }, () => {
    const onSearch = cy.spy().as('onSearch');
    cy.mount(<SearchBox value="pothos" onSearch={onSearch} />);

    cy.findByRole('button', { name: 'Clear search' }).click();

    cy.findByRole('searchbox').should('have.value', '');
    cy.get('@onSearch').should('have.been.calledOnceWithExactly', '');
  });

  it('SB-06 syncs the input to empty when the value prop becomes empty', { tags: '@component' }, () => {
    cy.mount(<SearchBoxWithValueControl initialValue="fern" onSearch={cy.spy()} />);

    cy.findByRole('searchbox').should('have.value', 'fern');
    cy.findByRole('button', { name: 'Clear value prop' }).click();
    cy.findByRole('searchbox').should('have.value', '');
  });

  it('SB-07 does not call onSearch while typing without submit', { tags: '@component' }, () => {
    const onSearch = cy.spy().as('onSearch');
    cy.mount(<SearchBox value="" onSearch={onSearch} />);

    cy.findByRole('searchbox').type('snake');

    cy.get('@onSearch').should('not.have.been.called');
  });

  it('SB-08 gives the search input an accessible name', { tags: '@component' }, () => {
    cy.mount(<SearchBox value="" onSearch={cy.spy()} />);

    cy.findByRole('searchbox', { name: /search plants/i });
  });

  it('SB-09 shows a visible focus outline on the search input', { tags: '@component' }, () => {
    cy.mount(<SearchBox value="" onSearch={cy.spy()} />);

    cy.press(Cypress.Keyboard.Keys.TAB);
    cy.findByRole('searchbox').then(($input) => {
      assertKeyboardFocusVisible($input, 'search input');
    });
  });

  it('SB-10 gives Clear search and Search accessible names', { tags: '@component' }, () => {
    cy.mount(<SearchBox value="x" onSearch={cy.spy()} />);

    cy.findByRole('button', { name: 'Clear search' });
    cy.findByRole('button', { name: 'Search' });
  });
});
