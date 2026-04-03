const { __testables } = require('../controllers/viewsController');

describe('buildPublicServiceReviews', () => {
  test('removes personal identity details from public service reviews', () => {
    const reviews = [
      {
        toObject: () => ({
          review: 'Very helpful for my research.',
          rating: 5,
          user: {
            name: 'Real User Name',
            photo: 'private-photo.jpg',
          },
        }),
      },
    ];

    const result = __testables.buildPublicServiceReviews(reviews);

    expect(result).toEqual([
      expect.objectContaining({
        review: 'Very helpful for my research.',
        rating: 5,
        user: {
          name: 'Verified reader 1',
          photo: 'default.jpg',
        },
      }),
    ]);
  });
});
