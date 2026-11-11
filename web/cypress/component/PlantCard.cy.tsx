import { Route, Routes } from 'react-router';
import { PlantCard } from '../../src/components/PlantCard';
import type { PlantSummary } from '../../src/types';

const basePlant: PlantSummary = {
  id: 'pl-pothos',
  name: 'Pothos',
  latinName: 'Epipremnum aureum',
  price: 12.5,
  light: 'medium',
  careLevel: 1,
  petSafe: true,
  stock: 10,
  rating: 4.7,
  imageUrl: '/pothos.jpg',
};

describe('PlantCard', () => {
  it('PC-01 shows name, Latin, Easy care, Pet safe, $12.50, rating, alt; no save', { tags: '@component' }, () => {
    cy.mount(<PlantCard plant={basePlant} />);

    cy.findByRole('article');
    cy.findByRole('heading', { name: 'Pothos' }).findByRole('link', { name: 'Pothos' });
    cy.findByText('Epipremnum aureum');
    cy.findByText(/Easy care/);
    cy.findByText(/Pet safe/);
    cy.findByText('$12.50');
    cy.findByText(/4\.7/);
    cy.findByText(/out of 5/).should('not.be.visible');
    cy.findByRole('img', { name: 'Pothos' });
    cy.findByRole('button').should('not.exist');
  });

  it('PC-02 shows Out of stock overlay when stock is 0', { tags: '@component' }, () => {
    cy.mount(<PlantCard plant={{ ...basePlant, stock: 0 }} />);

    cy.findByText('Out of stock');
  });

  it('PC-03 hides Out of stock overlay when stock is 1', { tags: '@component' }, () => {
    cy.mount(<PlantCard plant={{ ...basePlant, stock: 1 }} />);

    cy.findByText('Out of stock').should('not.exist');
  });

  it('PC-04 shows Not pet safe and Expert care', { tags: '@component' }, () => {
    cy.mount(<PlantCard plant={{ ...basePlant, petSafe: false, careLevel: 3 }} />);

    cy.findByText(/Not pet safe/);
    cy.findByText(/Expert care/);
  });

  it('PC-05 calls onToggleSave with plant id; aria-pressed false before click', { tags: '@component' }, () => {
    const onToggleSave = cy.spy().as('onToggleSave');
    cy.mount(<PlantCard plant={basePlant} saved={false} onToggleSave={onToggleSave} />);

    cy.findByRole('button').then(($btn) => {
      expect($btn.attr('aria-pressed'), 'aria-pressed before click').to.eq('false');
    });
    cy.findByRole('button').click();

    cy.get('@onToggleSave').should('have.been.calledOnceWithExactly', 'pl-pothos');
  });

  it('PC-06 sets aria-pressed true when saved', { tags: '@component' }, () => {
    cy.mount(<PlantCard plant={basePlant} saved onToggleSave={cy.spy()} />);

    cy.findByRole('button').then(($btn) => {
      expect($btn.attr('aria-pressed'), 'saved aria-pressed').to.eq('true');
    });
  });

  it('PC-07 omits save button when onToggleSave is absent', { tags: '@component' }, () => {
    cy.mount(<PlantCard plant={basePlant} />);

    cy.findByRole('button').should('not.exist');
  });

  it('PC-08 navigates toward /plants/pl-pothos when the name link is activated', { tags: '@component' }, () => {
    cy.mount(
      <Routes>
        <Route path="/" element={<PlantCard plant={basePlant} />} />
        <Route path="/plants/:plantId" element={<p>Plant detail for pl-pothos</p>} />
      </Routes>,
    );

    cy.findByRole('heading', { name: 'Pothos' }).findByRole('link').click();

    cy.findByText('Plant detail for pl-pothos');
  });

  it('PC-09 gives the save button an accessible name', { tags: '@component' }, () => {
    cy.mount(<PlantCard plant={basePlant} onToggleSave={cy.spy()} />);

    cy.findByRole('button', { name: /.+/ });
  });

  it('PC-10 gives the image alt equal to the plant name', { tags: '@component' }, () => {
    cy.mount(<PlantCard plant={basePlant} />);

    cy.findByRole('img', { name: 'Pothos' }).then(($img) => {
      expect($img.attr('alt'), 'image alt').to.eq('Pothos');
    });
  });

  it('PC-11 shows rating 5.0 and price $0.00', { tags: '@component' }, () => {
    cy.mount(<PlantCard plant={{ ...basePlant, rating: 5, price: 0 }} />);

    cy.findByText(/5\.0/);
    cy.findByText('$0.00');
  });

  it('PC-12 shows rating 0.0', { tags: '@component' }, () => {
    cy.mount(<PlantCard plant={{ ...basePlant, rating: 0 }} />);

    cy.findByText(/0\.0/);
  });
});
