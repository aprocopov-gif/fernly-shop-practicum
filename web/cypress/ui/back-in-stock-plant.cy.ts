function stubPlantNames() {
  cy.intercept('GET', '/api/plants?pageSize=*', { fixture: 'plants/plant-list-similar.json' }).as('plantNames');
}

function stubReviews(plantId: string) {
  cy.intercept('GET', `/api/plants/${plantId}/reviews`, {
    body: { plantId, average: 0, count: 0, reviews: [] },
  }).as('reviews');
}

function openPlant(fixture: string, plantId: string) {
  stubPlantNames();
  stubReviews(plantId);
  cy.intercept('GET', `/api/plants/${plantId}`, { fixture }).as('plant');
  cy.visit(`/plants/${plantId}`, {
    onBeforeLoad(win) {
      win.localStorage.removeItem('fernly_token');
    },
  });
  cy.wait('@plant');
}

describe('Plant page back-in-stock notify', () => {
  it('U2 shows notify only when out of stock; confirms success; surfaces API refusals signed out', {
    tags: '@ui',
  }, () => {
    openPlant('plants/plant-out-of-stock.json', 'pl-pilea');

    cy.findByLabelText("Email me when it's back");
    cy.findByRole('button', { name: 'Notify me' });

    cy.intercept('POST', '/api/plants/pl-pilea/notify', {
      statusCode: 201,
      body: { status: 'subscribed', plantId: 'pl-pilea', email: 'ava@fernly.test' },
    }).as('notifyOk');

    cy.findByLabelText("Email me when it's back").type('ava@fernly.test');
    cy.findByRole('button', { name: 'Notify me' }).click();
    cy.wait('@notifyOk');
    cy.findByRole('status', {
      name: (_accessibleName, el) => /We'll email ava@fernly\.test/i.test(el.textContent ?? ''),
    });
    cy.url().should('include', '/plants/pl-pilea');
    cy.url().should('not.include', '/login');

    openPlant('plants/plant-pothos.json', 'pl-pothos');
    cy.findByRole('heading', { name: /Pothos/ });
    cy.findByLabelText("Email me when it's back").should('not.exist');
    cy.findByRole('button', { name: 'Notify me' }).should('not.exist');

    openPlant('plants/plant-out-of-stock.json', 'pl-pilea');
    cy.intercept('POST', '/api/plants/pl-pilea/notify', {
      statusCode: 409,
      body: { detail: "You're already on the list", rule: 'already_subscribed' },
    }).as('notifyDup');
    cy.findByLabelText("Email me when it's back").type('ava@fernly.test');
    cy.findByRole('button', { name: 'Notify me' }).click();
    cy.wait('@notifyDup');
    cy.findByRole('alert').within(() => {
      cy.findByText("You're already on the list");
    });
    cy.findByText(/We'll email/).should('not.exist');

    cy.intercept('POST', '/api/plants/pl-pilea/notify', {
      statusCode: 400,
      body: { detail: 'Enter a full email address.', rule: 'validation_error' },
    }).as('notifyBad');
    cy.findByLabelText("Email me when it's back").clear().type('a@b');
    cy.findByRole('button', { name: 'Notify me' }).click();
    cy.wait('@notifyBad');
    cy.findByRole('alert');
    cy.findByText(/We'll email/).should('not.exist');
  });
});
