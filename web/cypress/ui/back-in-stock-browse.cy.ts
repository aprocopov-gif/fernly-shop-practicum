/** Loads Browse with a stubbed catalog that covers stock 0–4+. */
function openBrowse(fixture: string) {
  cy.intercept('GET', '/api/plants?*', { fixture }).as('plants');
  cy.visit('/', {
    onBeforeLoad(win) {
      win.localStorage.removeItem('fernly_token');
    },
  });
  cy.wait('@plants');
}

function withinCard(name: string, assertFn: () => void) {
  cy.findByRole('heading', { level: 3, name }).closest('article').within(assertFn);
}

function assertBadgeDoesNotCoverPhotoOrSave(name: string, badgeText: string) {
  cy.findByRole('heading', { level: 3, name })
    .closest('article')
    .then(($card) => {
      const card = $card[0];
      const badge = Array.from(card.querySelectorAll('*')).find(
        (el) => el.textContent?.trim() === badgeText && el.children.length === 0,
      );
      expect(badge, `${name} shows ${badgeText}`).to.exist;
      const save = card.querySelector('button');
      const img = card.querySelector('img');
      expect(save, `${name} save button`).to.exist;
      expect(img, `${name} image`).to.exist;
      const badgeRect = badge!.getBoundingClientRect();
      const imgRect = img!.getBoundingClientRect();
      const saveRect = save!.getBoundingClientRect();
      const overlaps = (a: DOMRect, b: DOMRect) =>
        a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      expect(overlaps(badgeRect, imgRect), `${name}: badge must not overlap image`).to.eq(false);
      expect(overlaps(badgeRect, saveRect), `${name}: badge must not overlap save`).to.eq(false);
    });
}

describe('Browse back-in-stock badge', () => {
  it('U1 low-stock badges sit with tags; out-of-stock has no Only 0 left; no photo/save overlap', {
    tags: '@ui',
  }, () => {
    openBrowse('plants/browse-stock-badge.json');

    withinCard('String of Pearls', () => {
      cy.findByText('Only 1 left');
      cy.findByText(/care/i);
    });
    withinCard('Thai Constellation', () => {
      cy.findByText('Only 2 left');
    });
    withinCard('Hoya Carnosa', () => {
      cy.findByText('Only 3 left');
    });

    withinCard("Pothos 'Golden'", () => {
      cy.findByText(/Only .+ left/).should('not.exist');
    });
    withinCard('Fiddle Leaf Fig', () => {
      cy.findByText(/Only .+ left/).should('not.exist');
    });

    assertBadgeDoesNotCoverPhotoOrSave('String of Pearls', 'Only 1 left');
    assertBadgeDoesNotCoverPhotoOrSave('Thai Constellation', 'Only 2 left');
    assertBadgeDoesNotCoverPhotoOrSave('Hoya Carnosa', 'Only 3 left');

    withinCard('Chinese Money Plant', () => {
      cy.findByText('Out of stock');
      cy.findByText('Only 0 left').should('not.exist');
    });
  });
});
