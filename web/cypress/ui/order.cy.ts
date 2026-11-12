const LONG_NAME =
  "Variegated Thai Constellation Monstera (Collector's Edition, Limited Greenhouse Batch, Greenhouse Row Twelve, North Bench)";

function stubSignedIn() {
  cy.intercept('GET', '/api/auth/me', { fixture: 'cart/me-user.json' }).as('authMe');
}

function stubCartGet(fixture = 'cart/empty.json') {
  cy.intercept('GET', '/api/cart', { fixture }).as('cart');
}

function stubOrderGet(
  orderId: string,
  fixtureOrOptions:
    | string
    | { statusCode?: number; delay?: number; fixture?: string; body?: unknown },
) {
  const url = `/api/orders/${orderId}`;
  if (typeof fixtureOrOptions === 'string') {
    cy.intercept('GET', url, { fixture: fixtureOrOptions }).as('order');
    return;
  }
  const { statusCode, delay, fixture, body } = fixtureOrOptions;
  if (statusCode) {
    cy.intercept('GET', url, {
      statusCode,
      body: body ?? { detail: 'Server error' },
      ...(delay ? { delay } : {}),
    }).as('order');
    return;
  }
  if (delay && fixture) {
    cy.intercept('GET', url, { delay, fixture }).as('order');
    return;
  }
  if (fixture) {
    cy.intercept('GET', url, { fixture }).as('order');
  }
}

function visitOrderSignedIn(path: string) {
  cy.visit(path, {
    onBeforeLoad(win) {
      win.localStorage.setItem('fernly_token', 'cypress-test-token');
    },
  });
}

/** Signed-in visit with stubbed auth, cart badge, and order detail. Waits for auth, cart, and order. */
function openOrder(
  orderId: string,
  orderFixture: string,
  orderOptions: { statusCode?: number; delay?: number; path?: string } = {},
) {
  stubSignedIn();
  stubCartGet();
  if (orderOptions.statusCode) {
    stubOrderGet(orderId, { statusCode: orderOptions.statusCode, delay: orderOptions.delay });
  } else if (orderOptions.delay) {
    stubOrderGet(orderId, { delay: orderOptions.delay, fixture: orderFixture });
  } else {
    stubOrderGet(orderId, orderFixture);
  }
  visitOrderSignedIn(orderOptions.path ?? `/orders/${orderId}`);
  cy.wait('@authMe');
  cy.wait('@cart');
  if (!orderOptions.delay) {
    cy.wait('@order');
  }
}

function assertPlainOrderContent() {
  cy.findByRole('heading', { name: 'Order ord-plain' });
  cy.findByText('Placed Nov 1, 2026 · Ships to Ava Green, Portland');
  cy.findByText("1 × Pothos 'Golden' (size S)");
  cy.findByText('$12.50');
  cy.findByRole('region', { name: 'Paid' }).within(() => {
    cy.findByRole('heading', { name: 'Paid' });
    cy.findByText('Subtotal (1 item)');
    cy.findByText('$12.50');
    cy.findByText('Shipping');
    cy.findByText('$6.95');
    cy.findByText('Total');
    cy.findByText('$19.45');
    cy.findByText(/Discount/).should('not.exist');
  });
}

describe('Order page', () => {
  it('OD-01 shows a placed order with lines, ships-to, and Paid summary without Discount', { tags: ['@ui', '@known-bug'] }, () => {
    openOrder('ord-plain', 'orders/order-plain.json');
    assertPlainOrderContent();
  });

  it('OD-02 shows Order not found with Back to your orders', { tags: '@ui' }, () => {
    openOrder('ord-missing', 'orders/order-plain.json', { statusCode: 404 });

    cy.findByRole('heading', { name: 'Order not found' });
    cy.findByRole('link', { name: 'Back to your orders' }).should('have.attr', 'href', '/orders');
  });

  it('OD-03 shows Try again when the order cannot load and refetches on retry', { tags: '@ui' }, () => {
    stubSignedIn();
    stubCartGet();
    let orderLoads = 0;
    cy.intercept('GET', '/api/orders/ord-plain', (req) => {
      orderLoads += 1;
      if (orderLoads === 1) {
        req.reply({ statusCode: 500, body: { detail: 'Server error' } });
        return;
      }
      req.reply({ fixture: 'orders/order-plain.json' });
    }).as('order');

    visitOrderSignedIn('/orders/ord-plain');
    cy.wait('@authMe');
    cy.wait('@cart');
    cy.wait('@order');

    cy.findByRole('alert').within(() => {
      cy.findByText("The order couldn't be loaded.");
      cy.findByRole('button', { name: 'Try again' }).click();
    });

    cy.wait('@order');
    cy.findByRole('heading', { name: 'Order ord-plain' });
  });

  it('OD-04 sends signed-out customers to sign in with return to the order', { tags: '@ui' }, () => {
    cy.visit('/orders/ord-plain', {
      onBeforeLoad(win) {
        win.localStorage.removeItem('fernly_token');
      },
    });

    cy.url().should('include', '/login?next=/orders/ord-plain');
  });

  it('OD-05 keeps a very long plant name inside the order line layout', { tags: '@ui' }, () => {
    openOrder('ord-long', 'orders/order-long-name.json');

    cy.findByRole('listitem').then(($line) => {
      cy.findByText(LONG_NAME, { exact: false }).then(($name) => {
        const line = $line[0].getBoundingClientRect();
        const name = $name[0].getBoundingClientRect();
        expect(name.left, 'plant name left edge').to.be.at.least(line.left);
        expect(name.right, 'plant name right edge').to.be.at.most(line.right);
        expect($name[0].scrollWidth, 'plant name stays inside its line').to.be.at.most(
          $name[0].clientWidth + 1,
        );
      });
    });
  });

  it('OD-06 shows $0.00 for a zero-total order', { tags: ['@ui', '@known-bug'] }, () => {
    openOrder('ord-zero', 'orders/order-zero-total.json');

    cy.findByRole('region', { name: 'Paid' }).within(() => {
      cy.findByText('$0.00');
    });
  });

  it('OD-07 shows loading copy until a slow order response arrives', { tags: '@ui' }, () => {
    stubSignedIn();
    stubCartGet();
    stubOrderGet('ord-plain', { delay: 1500, fixture: 'orders/order-plain.json' });
    visitOrderSignedIn('/orders/ord-plain');
    cy.wait('@authMe');
    cy.wait('@cart');

    cy.findByText('Loading order…');
    cy.wait('@order');
    cy.findByRole('heading', { name: 'Order ord-plain' });
  });

  it('OD-08 shows the thank-you status when opened with ?placed=1', { tags: ['@ui', '@known-bug'] }, () => {
    openOrder('ord-plain', 'orders/order-plain.json', { path: '/orders/ord-plain?placed=1' });

    cy.findByRole('status').within(() => {
      cy.findByText('Thank you! Your order is placed.');
    });
    assertPlainOrderContent();
  });

  it('OD-09 shows Free shipping on the Paid summary', { tags: '@ui' }, () => {
    openOrder('ord-free-ship', 'orders/order-free-shipping.json');

    cy.findByRole('region', { name: 'Paid' }).within(() => {
      cy.findByText('Shipping');
      cy.findByText('Free');
    });
  });

  it('OD-10 navigates to orders from Back to your orders', { tags: '@ui' }, () => {
    stubSignedIn();
    stubCartGet();
    stubOrderGet('ord-missing', { statusCode: 404, body: { detail: 'Not found' } });
    cy.intercept('GET', /\/api\/orders$/, { fixture: 'orders/empty.json' }).as('orders');

    visitOrderSignedIn('/orders/ord-missing');
    cy.wait('@authMe');
    cy.wait('@cart');
    cy.wait('@order');

    cy.findByRole('link', { name: 'Back to your orders' }).click();
    cy.url().should('include', '/orders');
    cy.wait('@orders');
    cy.findByRole('heading', { name: 'No orders yet' });
  });

  it('OD-11 exposes the order heading, Paid region, and line totals', { tags: ['@ui', '@known-bug'] }, () => {
    openOrder('ord-plain', 'orders/order-plain.json');

    cy.findByRole('heading', { name: 'Order ord-plain' });
    cy.findByRole('region', { name: 'Paid' }).within(() => {
      cy.findByRole('heading', { name: 'Paid' });
    });

    cy.findByRole('listitem').within(() => {
      cy.findByText(/Line total:/);
      cy.findByText('$12.50');
    });
  });
});
