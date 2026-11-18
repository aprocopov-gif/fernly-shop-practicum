const PLANT_PATH = '/plants/pl-snake';
const NEW_REVIEW_TEXT = 'Thrives even when I forget to water.';

function stubPlantNames() {
  cy.intercept('GET', '/api/plants?pageSize=*', { fixture: 'plants/plant-list-similar.json' }).as('plantNames');
}

function stubPlant() {
  cy.intercept('GET', '/api/plants/pl-snake', { fixture: 'reviews/plant-snake.json' }).as('plant');
}

function stubReviews(fixture: string, options: { delay?: number; statusCode?: number } = {}) {
  const statusCode = options.statusCode ?? 200;
  if (options.delay) {
    cy.intercept('GET', '/api/plants/pl-snake/reviews', {
      statusCode,
      delay: options.delay,
      fixture,
    }).as('reviews');
    return;
  }
  cy.intercept('GET', '/api/plants/pl-snake/reviews', { statusCode, fixture }).as('reviews');
}

function stubSignedIn() {
  cy.intercept('GET', '/api/auth/me', { fixture: 'cart/me-user.json' }).as('authMe');
}

function stubCartGet(fixture = 'cart/empty.json') {
  cy.intercept('GET', '/api/cart', { fixture }).as('cart');
}

function visitPlantSignedOut() {
  cy.visit(PLANT_PATH, {
    onBeforeLoad(win) {
      win.localStorage.removeItem('fernly_token');
    },
  });
}

function visitPlantSignedIn() {
  cy.visit(PLANT_PATH, {
    onBeforeLoad(win) {
      win.localStorage.setItem('fernly_token', 'cypress-test-token');
    },
  });
}

/** Signed-out plant page with plant + reviews stubs. Waits for both. */
function openPlantSignedOut(reviewsFixture = 'reviews/snake-list.json') {
  stubPlantNames();
  stubPlant();
  stubReviews(reviewsFixture);
  visitPlantSignedOut();
  cy.wait('@plant');
  cy.wait('@reviews');
}

/** Signed-in plant page with me, cart, plant, and reviews. Waits for auth, cart, plant, reviews. */
function openPlantSignedIn(reviewsFixture = 'reviews/snake-list.json') {
  stubSignedIn();
  stubCartGet();
  stubPlantNames();
  stubPlant();
  stubReviews(reviewsFixture);
  visitPlantSignedIn();
  cy.wait('@authMe');
  cy.wait('@cart');
  cy.wait('@plant');
  cy.wait('@reviews');
}

function withinReviews(assertFn: () => void) {
  cy.findByRole('heading', { name: 'Reviews' }).parent().within(assertFn);
}

function fillValidReview() {
  cy.findByRole('radio', { name: '5 stars' }).click();
  cy.findByRole('textbox', { name: 'Your review' }).type(NEW_REVIEW_TEXT);
  cy.findByRole('button', { name: 'Post review' }).click();
}

/** Toast uses role=status (name-from-author); match /thank/i in its text, not accessible name. */
function findThanksToast() {
  return cy.findByRole('status', {
    name: (_accessibleName, el) => /thank/i.test(el.textContent ?? ''),
  });
}

describe('Plant page reviews', () => {
  it('U1-01 shows Reviews summary and newest-first authors', { tags: '@ui' }, () => {
    openPlantSignedOut();

    cy.findByRole('heading', { name: 'Reviews' });
    withinReviews(() => {
      cy.findByText(/4\.7 out of 5 · 3 reviews/);
      cy.findByText('Ben Moss').then(($ben) => {
        cy.findByText('Omar K.').then(($omar) => {
          cy.findByText('Grace L.').then(($grace) => {
            expect(
              $ben[0].compareDocumentPosition($omar[0]) & Node.DOCUMENT_POSITION_FOLLOWING,
              'Ben Moss appears before Omar K.',
            ).to.be.ok;
            expect(
              $omar[0].compareDocumentPosition($grace[0]) & Node.DOCUMENT_POSITION_FOLLOWING,
              'Omar K. appears before Grace L.',
            ).to.be.ok;
          });
        });
      });
    });
  });

  it('U1-02 posts a review, shows thanks toast, and refreshes the list', { tags: '@ui' }, () => {
    stubSignedIn();
    stubCartGet();
    stubPlantNames();
    stubPlant();

    let reviewsLoads = 0;
    cy.intercept('GET', '/api/plants/pl-snake/reviews', (req) => {
      reviewsLoads += 1;
      if (reviewsLoads === 1) {
        req.reply({ fixture: 'reviews/snake-list.json' });
        return;
      }
      req.reply({ fixture: 'reviews/snake-list-after-post.json' });
    }).as('reviews');

    cy.intercept('POST', '/api/plants/pl-snake/reviews', {
      statusCode: 201,
      fixture: 'reviews/snake-post-created.json',
    }).as('postReview');

    visitPlantSignedIn();
    cy.wait('@authMe');
    cy.wait('@cart');
    cy.wait('@plant');
    cy.wait('@reviews');

    fillValidReview();
    cy.wait('@postReview');

    findThanksToast();

    cy.wait('@reviews');
    withinReviews(() => {
      cy.findByText(NEW_REVIEW_TEXT);
      cy.findByText('Ava');
    });
  });

  it('U1-03 shows Sign in to write and no Write a review form when signed out', { tags: '@ui' }, () => {
    openPlantSignedOut();

    withinReviews(() => {
      cy.findByRole('link', { name: 'Sign in' }).should(
        'have.attr',
        'href',
        '/login?next=/plants/pl-snake',
      );
      cy.findByText(/to write a review/i);
      cy.findByRole('heading', { name: 'Write a review' }).should('not.exist');
    });
  });

  it('U1-04 shows Reviews load error with Try again', { tags: '@ui' }, () => {
    stubPlantNames();
    stubPlant();
    stubReviews('reviews/empty.json', { statusCode: 500 });
    visitPlantSignedOut();
    cy.wait('@plant');
    cy.wait('@reviews');

    cy.findByRole('alert').within(() => {
      cy.findByText("Reviews couldn't be loaded.");
      cy.findByRole('button', { name: 'Try again' });
    });
  });

  it('U1-05 shows already_reviewed in an alert and no thanks toast', { tags: '@ui' }, () => {
    openPlantSignedIn();
    cy.intercept('POST', '/api/plants/pl-snake/reviews', {
      statusCode: 409,
      fixture: 'reviews/already-reviewed.json',
    }).as('postReview');

    fillValidReview();
    cy.wait('@postReview');

    cy.findByRole('alert').within(() => {
      cy.findByText(/already reviewed/i);
    });
    cy.findAllByRole('status').then(($statuses) => {
      const thanks = $statuses.toArray().filter((el) => /thank/i.test(el.textContent ?? ''));
      expect(thanks, 'no thanks toast after already_reviewed').to.have.length(0);
    });
  });

  it('U1-06 shows empty invitation without an average line', { tags: '@ui' }, () => {
    openPlantSignedOut('reviews/empty.json');

    withinReviews(() => {
      cy.findByText(/out of 5/).should('not.exist');
      cy.findByRole('list').should('not.exist');
    });
  });

  it('U1-07 shows Loading reviews… until a slow reviews response', { tags: '@ui' }, () => {
    stubPlantNames();
    stubPlant();
    stubReviews('reviews/snake-list.json', { delay: 1500 });
    visitPlantSignedOut();
    cy.wait('@plant');

    cy.findByText('Loading reviews…');
    cy.wait('@reviews');
    cy.findByText(/4\.7 out of 5 · 3 reviews/);
  });

  it('U1-08 labels the Reviews section, stars as keyboard radios, alerts, and status toast', { tags: '@ui' }, () => {
    stubSignedIn();
    stubCartGet();
    stubPlantNames();
    stubPlant();

    let reviewsLoads = 0;
    cy.intercept('GET', '/api/plants/pl-snake/reviews', (req) => {
      reviewsLoads += 1;
      if (reviewsLoads === 1) {
        req.reply({ fixture: 'reviews/snake-list.json' });
        return;
      }
      req.reply({ fixture: 'reviews/snake-list-after-post.json' });
    }).as('reviews');

    cy.intercept('POST', '/api/plants/pl-snake/reviews', {
      statusCode: 201,
      fixture: 'reviews/snake-post-created.json',
    }).as('postReview');

    visitPlantSignedIn();
    cy.wait('@authMe');
    cy.wait('@cart');
    cy.wait('@plant');
    cy.wait('@reviews');

    cy.findByRole('region', { name: 'Reviews' });
    cy.findByRole('radiogroup', { name: 'Your rating' });
    cy.findByRole('radio', { name: '1 star' });
    cy.findByRole('radio', { name: '5 stars' });

    cy.findByRole('button', { name: 'Post review' }).click();
    cy.findByRole('alert');

    fillValidReview();
    cy.wait('@postReview');
    findThanksToast();

    cy.findByRole('radio', { name: '1 star' }).then(($el) =>
      expect($el[0].tabIndex, '1 star is keyboard-focusable (C3)').to.be.at.least(0),
    );
    cy.findByRole('radio', { name: '1 star' }).focus();
    cy.findByRole('radio', { name: '1 star' }).type('{rightarrow}');
    cy.findByRole('radio', { name: '2 stars' }).then(($el) =>
      expect($el, '2 stars selected after ArrowRight').to.have.attr('aria-checked', 'true'),
    );
  });
});


