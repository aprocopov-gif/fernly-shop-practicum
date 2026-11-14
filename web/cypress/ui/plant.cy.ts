const LONG_NAME =
  "Variegated Thai Constellation Monstera (Collector's Edition, Limited Greenhouse Batch, Greenhouse Row Twelve, North Bench)";

function stubPlantNames(fixture = 'plants/plant-list-similar.json') {
  cy.intercept('GET', '/api/plants?pageSize=*', { fixture }).as('plantNames');
}

function stubPlant(
  fixture: string,
  options: { plantId?: string; statusCode?: number; delay?: number } = {},
) {
  const plantId = options.plantId ?? 'pl-pothos';
  const statusCode = options.statusCode ?? 200;
  if (options.delay) {
    cy.intercept('GET', `/api/plants/${plantId}`, {
      statusCode,
      delay: options.delay,
      fixture,
    }).as('plant');
    return;
  }
  cy.intercept('GET', `/api/plants/${plantId}`, { statusCode, fixture }).as('plant');
}

function visitPlant(path: string) {
  cy.visit(path, {
    onBeforeLoad(win) {
      win.localStorage.removeItem('fernly_token');
    },
  });
}

/** Signed-out plant detail with stubbed plant + similar names. Waits for the plant response. */
function openPlant(
  plantFixture: string,
  options: { plantId?: string; path?: string; statusCode?: number } = {},
) {
  const plantId = options.plantId ?? 'pl-pothos';
  stubPlantNames();
  stubPlant(plantFixture, { plantId, statusCode: options.statusCode });
  visitPlant(options.path ?? `/plants/${plantId}`);
  cy.wait('@plant');
}

function stubSignedIn() {
  cy.intercept('GET', '/api/auth/me', { fixture: 'cart/me-user.json' }).as('authMe');
}

function stubCartGet(fixture: string) {
  cy.intercept('GET', '/api/cart', { fixture }).as('cart');
}

describe('Plant page', () => {
  it('PL-01 shows in-stock plant detail, sizes, quantity, and similar links', { tags: ['@ui', '@known-bug'] }, () => {
    openPlant('plants/plant-pothos.json');
    cy.wait('@plantNames');

    cy.findByRole('heading', { name: "Pothos 'Golden'" });
    cy.findByText('Epipremnum aureum');
    cy.findByText('Easy care');
    cy.findByText('Not pet safe');
    cy.findByText(/☀\s*Low light/);
    cy.findByText('$12.50');

    cy.findByRole('group', { name: 'Size' });
    cy.findByRole('radio', { name: /Small/ }).then(($el) => expect($el, 'Small selected').to.be.checked);
    cy.findByRole('radio', { name: /Medium/ });
    cy.findByRole('radio', { name: /Large/ });

    cy.findByRole('group', { name: 'Quantity' }).within(() => {
      cy.findByText('1');
    });
    cy.findByRole('button', { name: 'Add to cart' });
    cy.findByText('30 in stock');

    cy.findByRole('heading', { name: 'Likes the same light' });
    cy.findByRole('link', { name: 'Snake Plant' }).should('have.attr', 'href', '/plants/pl-snake');
    cy.findByRole('link', { name: 'ZZ Plant' }).should('have.attr', 'href', '/plants/pl-zz');
    cy.findByRole('link', { name: 'Parlor Palm' }).should('have.attr', 'href', '/plants/pl-parlor');
  });

  it('PL-02 shows not-found empty state with Back to the shop', { tags: '@ui' }, () => {
    openPlant('plants/plant-404.json', {
      plantId: 'pl-missing',
      path: '/plants/pl-missing',
      statusCode: 404,
    });

    cy.findByRole('heading', { name: "We couldn't find that plant" });
    cy.findByRole('link', { name: 'Back to the shop' }).should('have.attr', 'href', '/');
  });

  it('PL-03 shows load error with Try again and refetches the plant', { tags: '@ui' }, () => {
    stubPlantNames();
    let plantLoads = 0;
    cy.intercept('GET', '/api/plants/pl-pothos', (req) => {
      plantLoads += 1;
      if (plantLoads === 1) {
        req.reply({ statusCode: 500, fixture: 'plants/plant-server-error.json' });
        return;
      }
      req.reply({ fixture: 'plants/plant-pothos.json' });
    }).as('plant');

    visitPlant('/plants/pl-pothos');
    cy.wait('@plant');

    cy.findByRole('alert').within(() => {
      cy.findByText("The plant couldn't be loaded.");
      cy.findByRole('button', { name: 'Try again' }).click();
    });

    cy.wait('@plant');
    cy.findByRole('heading', { name: "Pothos 'Golden'" });
  });

  it('PL-04 sends signed-out Add to cart to login without posting lines', { tags: '@ui' }, () => {
    openPlant('plants/plant-pothos.json');
    cy.intercept('POST', '/api/cart/lines').as('addLine');

    cy.findByRole('button', { name: 'Add to cart' }).click();

    cy.url().should('include', '/login?next=/plants/pl-pothos');
    cy.get('@addLine.all').should('have.length', 0);
  });

  it('PL-05 keeps a very long plant name inside the plant info column', { tags: '@ui' }, () => {
    openPlant('plants/plant-long-name.json', { plantId: 'pl-thai', path: '/plants/pl-thai' });

    cy.findByRole('heading', { name: LONG_NAME }).then(($name) => {
      const info = $name[0].parentElement;
      expect(info, 'plant info parent').to.exist;
      const column = info!.getBoundingClientRect();
      const name = $name[0].getBoundingClientRect();
      expect(name.left, 'plant name left edge').to.be.at.least(column.left);
      expect(name.right, 'plant name right edge').to.be.at.most(column.right);
      expect($name[0].scrollWidth, 'plant name stays inside its column').to.be.at.most($name[0].clientWidth);
    });
  });

  it('PL-06 shows $0.00 for a zero-priced plant', { tags: ['@ui', '@known-bug'] }, () => {
    openPlant('plants/plant-zero-price.json', { plantId: 'pl-cutting', path: '/plants/pl-cutting' });

    cy.findByText('$0.00');
  });

  it('PL-07 disables steppers and shows Out of stock when stock is 0', { tags: '@ui' }, () => {
    openPlant('plants/plant-out-of-stock.json', { plantId: 'pl-pilea', path: '/plants/pl-pilea' });

    cy.findByRole('button', { name: 'Decrease quantity' }).then(($el) =>
      expect($el, 'Decrease when out of stock').to.be.disabled,
    );
    cy.findByRole('button', { name: 'Increase quantity' }).then(($el) =>
      expect($el, 'Increase when out of stock').to.be.disabled,
    );
    cy.findByRole('button', { name: 'Out of stock' }).then(($el) =>
      expect($el, 'Out of stock primary').to.be.disabled,
    );
    cy.findByText('Out of stock right now.');
  });

  it('PL-08 posts Add to cart when signed in and shows a success toast', { tags: '@ui' }, () => {
    stubSignedIn();
    stubCartGet('cart/empty.json');
    stubPlantNames();
    stubPlant('plants/plant-pothos.json');
    cy.intercept('POST', '/api/cart/lines', { fixture: 'promo/cart-pothos.json' }).as('addLine');

    cy.visit('/plants/pl-pothos', {
      onBeforeLoad(win) {
        win.localStorage.setItem('fernly_token', 'cypress-test-token');
      },
    });
    cy.wait('@authMe');
    cy.wait('@cart');
    cy.wait('@plant');

    cy.findByRole('button', { name: 'Add to cart' }).click();
    cy.wait('@addLine');

    cy.findByText("Added 1 × Pothos 'Golden' to your cart.");
    cy.url().should('include', '/plants/pl-pothos');
  });

  it('PL-09 shows Loading plant… until a slow plant response arrives', { tags: '@ui' }, () => {
    stubPlantNames();
    stubPlant('plants/plant-pothos.json', { delay: 1500 });
    visitPlant('/plants/pl-pothos');

    cy.findByText('Loading plant…');
    cy.wait('@plant');
    cy.findByRole('heading', { name: "Pothos 'Golden'" });
  });

  it('PL-10 exposes accessible names on size radios, quantity, and Add to cart', { tags: '@ui' }, () => {
    openPlant('plants/plant-pothos.json');

    cy.findByRole('group', { name: 'Size' });
    cy.findByRole('radio', { name: /Small/ });
    cy.findByRole('radio', { name: /Medium/ });
    cy.findByRole('radio', { name: /Large/ });

    cy.findByRole('group', { name: 'Quantity' }).within(() => {
      cy.findByRole('button', { name: 'Decrease quantity' });
      cy.findByRole('button', { name: 'Increase quantity' });
    });

    cy.findByRole('button', { name: 'Add to cart' });
  });
});
