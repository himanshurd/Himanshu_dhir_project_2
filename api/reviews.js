const router = require('express').Router();
const { validateAgainstSchema, extractValidFields } = require('../lib/validation');

const mysqlPool = require('../lib/mysqlpool');
exports.router = router;

/*
 * Schema describing required/optional fields of a review object.
 */
const reviewSchema = {
  userid: { required: true },
  businessid: { required: true },
  dollars: { required: true },
  stars: { required: true },
  review: { required: false }
};

async function insertNewReview(review) {
  const validatedReview = extractValidFields(
    review,
    reviewSchema
  );
  const [ result ] = await mysqlPool.query(
    'INSERT INTO reviews SET ?',
    validatedReview
  );
  return result.insertId;
}

async function existingReview(userid, businessid) {
  const [results] = await mysqlPool.query(
    'SELECT * FROM reviews WHERE userid=? AND businessid=?',
    [ userid, businessid ],
  );
  return (results.length > 0);
}

async function getReviewById(reviewId) {
  const [ results ] = await mysqlPool.query(
    'SELECT * FROM reviews WHERE id = ?',
    [ reviewId ],
  );
  return results[0];
}

async function updateReviewById(reviewId, review) {
  const validatedReview = extractValidFields(
    review,
    reviewSchema
  );
  const [ result ] = await mysqlPool.query(
      'UPDATE reviews SET ? WHERE id = ?',
      [ validatedReview, reviewId ]
  );
  return result.affectedRows > 0;
}

async function deleteReviewByID(reviewId) {
  const [ result ] = await mysqlPool.query(
      'DELETE FROM reviews WHERE id = ?',
      [ reviewId ]
  );
  return result.affectedRows > 0;
}

/*
 * Route to create a new review.
 */

router.post('/', async function (req, res, next) {
  try {
    if (validateAgainstSchema(req.body, reviewSchema)) {
      const hasreview = await existingReview(req.body.userid, req.body.businessid);
      if (hasreview) {
        res.status(403).json({
          error: "User has already posted a review of this business"
        });
      } else {
        id = await insertNewReview(req.body);
        res.status(201).json({ id: id });
      }
    } else {
      res.status(400).json({
        error: "Request body is not a valid review object"
      });
    }
  } catch (err) {
    res.status(500).send({
      error: "Unable to add review."
    });
  }
});

/*
 * Route to fetch info about a specific review.
 */

router.get('/:reviewID', async function (req, res, next) {
  try {
    const review = await getReviewById(parseInt(req.params.reviewID));
    if (review) {
      res.status(200).send(review);
    } else {
      next();
    }
  } catch (err) {
    res.status(500).send({
      error: "Unable to fetch review."
    });
  }
});
/*
 * Route to update a review.
 */

router.put('/:reviewID', async function (req, res, next) {
  const reviewID = parseInt(req.params.reviewID);
  try {
    if (validateAgainstSchema(req.body, reviewSchema)) {
      let updatedReview = extractValidFields(req.body, reviewSchema);
      let existingReview = await getReviewById(reviewID);
      if (updatedReview.businessid === existingReview.businessid && updatedReview.userid === existingReview.userid) {
        await updateReviewById(reviewID, req.body);
        res.status(200).send({});
      } else {
        res.status(403).json({
          error: "Updated review cannot modify businessid or userid"
        });
      }
    } else {
      res.status(400).json({
        error: "Request body is not a valid review object"
      });
    }
  } catch (err) {
    res.status(500).json({
      error: "Unable to update review"
    })
  }
});


/*
 * Route to delete a review.
 */

router.delete('/:reviewID', async function (req, res, next) {
  try {
    const deleteSuccessful = await deleteReviewByID(parseInt(req.params.reviewID))
    if (deleteSuccessful) {
      res.status(204).end();
    } else {
      next();
    }
  } catch (err) {
    res.status(500).send({
      error: "Unable to delete review."
    });
  }
});