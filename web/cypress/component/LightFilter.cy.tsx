import { LightFilter } from '../../src/components/LightFilter';

function assertKeyboardFocusVisible($el: JQuery<HTMLElement>, label: string) {
  expect($el[0], `${label} has keyboard focus`).to.equal(document.activeElement);
  const style = window.getComputedStyle($el[0]);
  expect(style.outlineStyle, `${label} outline style`).to.not.equal('none');
  expect(parseFloat(style.outlineWidth), `${label} outline width`).to.be.greaterThan(0);
}

describe('LightFilter', () => {
  it('LF-01 shows Light fieldset with all three checkboxes unchecked', { tags: '@component' }, () => {
    cy.mount(<LightFilter value={[]} onChange={cy.spy()} />);

    cy.findByRole('group', { name: 'Light' });
    cy.findByRole('checkbox', { name: 'Low light' }).then(($el) =>
      expect($el, 'Low light with empty value').to.not.be.checked,
    );
    cy.findByRole('checkbox', { name: 'Medium light' }).then(($el) =>
      expect($el, 'Medium light with empty value').to.not.be.checked,
    );
    cy.findByRole('checkbox', { name: 'Bright light' }).then(($el) =>
      expect($el, 'Bright light with empty value').to.not.be.checked,
    );
  });

  it('LF-02 checks Low and Bright when both are selected', { tags: '@component' }, () => {
    cy.mount(<LightFilter value={['low', 'bright']} onChange={cy.spy()} />);

    cy.findByRole('checkbox', { name: 'Low light' }).then(($el) =>
      expect($el, 'Low light when low and bright selected').to.be.checked,
    );
    cy.findByRole('checkbox', { name: 'Bright light' }).then(($el) =>
      expect($el, 'Bright light when low and bright selected').to.be.checked,
    );
    cy.findByRole('checkbox', { name: 'Medium light' }).then(($el) =>
      expect($el, 'Medium light when low and bright selected').to.not.be.checked,
    );
  });

  it('LF-03 calls onChange with [low] when Low light is checked', { tags: '@component' }, () => {
    const onChange = cy.spy().as('onChange');
    cy.mount(<LightFilter value={[]} onChange={onChange} />);

    cy.findByRole('checkbox', { name: 'Low light' }).check();

    cy.get('@onChange').should('have.been.calledOnceWithExactly', ['low']);
  });

  it('LF-04 calls onChange with [low, bright] when Bright is added', { tags: '@component' }, () => {
    const onChange = cy.spy().as('onChange');
    cy.mount(<LightFilter value={['low']} onChange={onChange} />);

    cy.findByRole('checkbox', { name: 'Bright light' }).check();

    cy.get('@onChange').should('have.been.calledOnceWithExactly', ['low', 'bright']);
  });

  it('LF-05 calls onChange with [bright] when Low light is unchecked', { tags: '@component' }, () => {
    const onChange = cy.spy().as('onChange');
    cy.mount(<LightFilter value={['low', 'bright']} onChange={onChange} />);

    cy.findByRole('checkbox', { name: 'Low light' }).uncheck();

    cy.get('@onChange').should('have.been.calledOnceWithExactly', ['bright']);
  });

  it('LF-06 calls onChange with [] when the last filter is cleared', { tags: '@component' }, () => {
    const onChange = cy.spy().as('onChange');
    cy.mount(<LightFilter value={['medium']} onChange={onChange} />);

    cy.findByRole('checkbox', { name: 'Medium light' }).uncheck();

    cy.get('@onChange').should('have.been.calledOnceWithExactly', []);
  });

  it('LF-07 names the fieldset and checkboxes and shows keyboard focus', { tags: '@component' }, () => {
    cy.mount(<LightFilter value={[]} onChange={cy.spy()} />);

    cy.findByRole('group', { name: 'Light' });
    cy.findByRole('checkbox', { name: 'Low light' });
    cy.findByRole('checkbox', { name: 'Medium light' });
    cy.findByRole('checkbox', { name: 'Bright light' });

    cy.press(Cypress.Keyboard.Keys.TAB);
    cy.findByRole('checkbox', { name: 'Low light' }).then(($el) => {
      assertKeyboardFocusVisible($el, 'Low light');
    });

    cy.press(Cypress.Keyboard.Keys.TAB);
    cy.findByRole('checkbox', { name: 'Medium light' }).then(($el) => {
      assertKeyboardFocusVisible($el, 'Medium light');
    });

    cy.press(Cypress.Keyboard.Keys.TAB);
    cy.findByRole('checkbox', { name: 'Bright light' }).then(($el) => {
      assertKeyboardFocusVisible($el, 'Bright light');
    });
  });
});
