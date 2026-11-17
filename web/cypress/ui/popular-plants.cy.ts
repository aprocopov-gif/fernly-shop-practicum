function stubPlantNames(fixture = 'plants/plant-list-similar.json') {
  cy.intercept('GET', '/api/plants?pageSize=*', { fixture }).as('plantNames');
}

function stubPlant(fixture: string, plantId: string) {
  cy.intercept('GET', `/api/plants/${plantId}`, { fixture }).as('plant');
}

function stubPopular(fixture = 'popular/limit-5.json') {
  cy.intercept('GET', '/api/popular?limit=5', { fixture }).as('popular');
}

function visitPlant(path: string) {
  cy.visit(path, {
    onBeforeLoad(win) {
      win.localStorage.removeItem('fernly_token');
    },
  });
}

describe('Plant page Popular right now', () => {
  it('U1 shows Popular right now under the description from limit=5', { tags: '@ui' }, () => {
    stubPlantNames();
    stubPlant('plants/plant-aloe.json', 'pl-aloe');
    stubPopular();
    visitPlant('/plants/pl-aloe');
    cy.wait('@plant');
    cy.wait('@popular').its('request.url').should('include', 'limit=5');

    cy.findByRole('heading', { name: 'Aloe Vera' });
    cy.findByText('Gel-filled leaves that love a sunny sill. Water sparingly.');

    cy.findByRole('region', { name: 'Popular right now' }).within(() => {
      cy.findByRole('heading', { name: 'Popular right now' });
      cy.findAllByRole('link').should('have.length', 4);
      cy.findByRole('link', { name: 'Monstera Deliciosa' }).should(
        'have.attr',
        'href',
        '/plants/pl-monstera',
      );
      cy.findByRole('link', { name: 'Snake Plant' });
      cy.findByRole('link', { name: "Pothos 'Golden'" });
      cy.findByRole('link', { name: 'ZZ Plant' });
      cy.findByText('128 sold this month');
      cy.findByText('97 sold this month');
      cy.findByText('80 sold this month');
      cy.findByText('61 sold this month');
      cy.findByRole('link', { name: 'Spider Plant' }).should('not.exist');
    });
  });
});
