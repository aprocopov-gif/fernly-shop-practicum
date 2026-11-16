const LONG_NAME =
  "Variegated Thai Constellation Monstera (Collector's Edition, Limited Greenhouse Batch, Greenhouse Row Twelve, North Bench)";

function stubSignedIn() {
  cy.intercept('GET', '/api/auth/me', { fixture: 'cart/me-user.json' }).as('authMe');
}

function stubCartGet(fixture = 'cart/empty.json') {
  cy.intercept('GET', '/api/cart', { fixture }).as('cart');
}

function stubOrdersGet(
  fixtureOrOptions:
    | string
    | { statusCode?: number; delay?: number; fixture?: string; body?: unknown },
) {
  if (typeof fixtureOrOptions === 'string') {
    cy.intercept('GET', /\/api\/orders$/, { fixture: fixtureOrOptions }).as('orders');
    return;
  }
  const { statusCode, delay, fixture, body } = fixtureOrOptions;
  if (statusCode) {
    cy.intercept('GET', /\/api\/orders$/, {
      statusCode,
      body: body ?? { detail: 'Server error' },
      ...(delay ? { delay } : {}),
    }).as('orders');
    return;
  }
  if (delay && fixture) {
    cy.intercept('GET', /\/api\/orders$/, { delay, fixture }).as('orders');
    return;
  }
  if (fixture) {
    cy.intercept('GET', /\/api\/orders$/, { fixture }).as('orders');
  }
}

function visitOrdersSignedIn() {
  cy.visit('/orders', {
    onBeforeLoad(win) {
      win.localStorage.setItem('fernly_token', 'cypress-test-token');
    },
  });
}

/** Signed-in visit with stubbed auth, cart badge, and orders. Waits for auth, cart, and orders. */
function openOrders(
  ordersFixture: string,
  ordersOptions: { statusCode?: number; delay?: number } = {},
) {
  stubSignedIn();
  stubCartGet();
  if (ordersOptions.statusCode) {
    stubOrdersGet({ statusCode: ordersOptions.statusCode, delay: ordersOptions.delay });
  } else if (ordersOptions.delay) {
    stubOrdersGet({ delay: ordersOptions.delay, fixture: ordersFixture });
  } else {
    stubOrdersGet(ordersFixture);
  }
  visitOrdersSignedIn();
  cy.wait('@authMe');
  cy.wait('@cart');
  if (!ordersOptions.delay) {
    cy.wait('@orders');
  }
}

describe('Orders page', () => {
  it('OR-01 shows two orders newest first with dates, line counts, and two-decimal totals', { tags: '@ui' }, () => {
    openOrders('orders/two-orders.json');

    cy.findByRole('heading', { name: 'Your orders' });
    cy.findAllByRole('listitem').should('have.length', 2);

    cy.findAllByRole('listitem').eq(0).within(() => {
      cy.findByRole('link', { name: 'Order ord-newer' });
      cy.findByText('Nov 10, 2026');
      cy.findByText('2 lines');
      cy.findByText('$49.95');
    });

    cy.findAllByRole('listitem').eq(1).within(() => {
      cy.findByRole('link', { name: 'Order ord-older' });
      cy.findByText('Nov 1, 2026');
      cy.findByText('1 line');
      cy.findByText('$19.45');
    });
  });

  it('OR-02 shows the empty orders state', { tags: '@ui' }, () => {
    openOrders('orders/empty.json');

    cy.findByRole('heading', { name: 'No orders yet' });
    cy.findByText('Your orders will show up here.');
  });

  it('OR-03 shows Try again when orders cannot load and refetches on retry', { tags: '@ui' }, () => {
    stubSignedIn();
    stubCartGet();
    let orderLoads = 0;
    cy.intercept('GET', /\/api\/orders$/, (req) => {
      orderLoads += 1;
      if (orderLoads === 1) {
        req.reply({ statusCode: 500, body: { detail: 'Server error' } });
        return;
      }
      req.reply({ fixture: 'orders/two-orders.json' });
    }).as('orders');

    visitOrdersSignedIn();
    cy.wait('@authMe');
    cy.wait('@cart');
    cy.wait('@orders');

    cy.findByRole('alert').within(() => {
      cy.findByText("Your orders couldn't be loaded.");
      cy.findByRole('button', { name: 'Try again' }).click();
    });

    cy.wait('@orders');
    cy.findByRole('heading', { name: 'Your orders' });
  });

  it('OR-04 sends signed-out customers to sign in with return to orders', { tags: '@ui' }, () => {
    cy.visit('/orders', {
      onBeforeLoad(win) {
        win.localStorage.removeItem('fernly_token');
      },
    });

    cy.url().should('include', '/login?next=/orders');
  });

  it('OR-05 keeps a very long plant name / row content inside the list layout', { tags: '@ui' }, () => {
    openOrders('orders/one-long-name.json');

    cy.findByRole('list').then(($list) => {
      cy.findByRole('listitem').then(($row) => {
        const list = $list[0].getBoundingClientRect();
        const row = $row[0].getBoundingClientRect();
        expect(row.left, 'order row left edge').to.be.at.least(list.left);
        expect(row.right, 'order row right edge').to.be.at.most(list.right);
        expect($row[0].scrollWidth, 'order row stays inside its bounds').to.be.at.most(
          $row[0].clientWidth + 1,
        );
      });
    });

    // List rows do not show line names; if a long name appears, it must stay in the row.
    cy.get('body').then(($body) => {
      if ($body.text().includes(LONG_NAME)) {
        cy.findByRole('listitem').then(($row) => {
          const row = $row[0].getBoundingClientRect();
          cy.findByText(LONG_NAME).then(($name) => {
            const name = $name[0].getBoundingClientRect();
            expect(name.left, 'plant name left edge').to.be.at.least(row.left);
            expect(name.right, 'plant name right edge').to.be.at.most(row.right);
            expect($name[0].scrollWidth, 'plant name stays inside its row').to.be.at.most(
              $name[0].clientWidth,
            );
          });
        });
      }
    });
  });

  it('OR-06 shows $0.00 for a zero-total order', { tags: ['@ui', '@known-bug'] }, () => {
    openOrders('orders/zero-total.json');

    cy.findByRole('listitem').within(() => {
      cy.findByText('$0.00');
    });
  });

  it('OR-07 shows loading copy until a slow orders response arrives', { tags: '@ui' }, () => {
    stubSignedIn();
    stubCartGet();
    stubOrdersGet({ delay: 1500, fixture: 'orders/two-orders.json' });
    visitOrdersSignedIn();
    cy.wait('@authMe');
    cy.wait('@cart');

    cy.findByText('Loading your orders…');
    cy.wait('@orders');
    cy.findByRole('heading', { name: 'Your orders' });
  });

  it('OR-08 navigates to the order detail from the first row link', { tags: '@ui' }, () => {
    openOrders('orders/two-orders.json');

    cy.findByRole('link', { name: 'Order ord-newer' }).click();
    cy.url().should('include', '/orders/ord-newer');
  });

  it('OR-09 exposes accessible names on order links and totals', { tags: '@ui' }, () => {
    openOrders('orders/two-orders.json');

    cy.findByRole('link', { name: 'Order ord-newer' }).focus();
    cy.focused().should('have.attr', 'href', '/orders/ord-newer');

    cy.findByRole('link', { name: 'Order ord-older' }).focus();
    cy.focused().should('have.attr', 'href', '/orders/ord-older');

    cy.findAllByRole('listitem').eq(0).within(() => {
      cy.findByText(/Total:/);
      cy.findByText('$49.95');
    });

    cy.findAllByRole('listitem').eq(1).within(() => {
      cy.findByText(/Total:/);
      cy.findByText('$19.45');
    });
  });
});
