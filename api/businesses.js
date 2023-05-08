const router = require('express').Router();
const { validateAgainstSchema, extractValidFields } = require('../lib/validation');

exports.router = router;
const mysqlPool = require('../lib/mysqlpool');
/*
 * Schema describing required/optional fields of a business object.
 */
const businessSchema = {
  ownerid: { required: true },
  name: { required: true },
  address: { required: true },
  city: { required: true },
  state: { required: true },
  zip: { required: true },
  phone: { required: true },
  category: { required: true },
  subcategory: { required: true },
  website: { required: false },
  email: { required: false }
};

/*
 * Route to return a list of businesses.
 */
async function getBusinessesCount() {
  const [ results ] = await mysqlPool.query(
    "SELECT COUNT(*) AS count FROM businesses"
  );
  return results[0].count;
}

async function insertNewBusiness(business) {
  const validatedBusiness = extractValidFields(
    business,
    businessSchema
  );
  const [ result ] = await mysqlPool.query(
    'INSERT INTO businesses SET ?',
    validatedBusiness
  );
  return result.insertId;
}

async function getBusinessById(businessId) {
  const [ results ] = await mysqlPool.query(
    'SELECT * FROM businesses WHERE id = ?',
    [ businessId ],
  );
  return results[0];
}

async function updateBusinessById(businessid, business) {
  const validatedBusiness = extractValidFields(
    business,
    businessSchema
  );
  const [ result ] = await mysqlPool.query(
    'UPDATE businesses SET ? WHERE id = ?',
    [ validatedBusiness, businessid ]
  );
  return result.affectedRows > 0;
}

async function deleteBusinessById(businessid) {
  const [ result ] = await mysqlPool.query(
    'DELETE FROM businesses WHERE id = ?',
    [ businessid ]
  );
  return result.affectedRows > 0;
}



router.get('/', async function (req, res) {
  try {
    businessesLength = await getBusinessesCount()
    let page = parseInt(req.query.page) || 1;
    const numPerPage = 10;
    const lastPage = Math.ceil(businessesLength / numPerPage);
    page = page > lastPage ? lastPage : page;
    page = page < 1 ? 1 : page;
    pageBusinesses = await getBusinessesPage(page);
    const links = {};
    if (page < lastPage) {
      links.nextPage = `/businesses?page=${page + 1}`;
      links.lastPage = `/businesses?page=${lastPage}`;
    }
    if (page > 1) {
      links.prevPage = `/businesses?page=${page - 1}`;
      links.firstPage = '/businesses?page=1';
    }
    res.status(200).json({
      businesses: pageBusinesses,
      pageNumber: page,
      totalPages: lastPage,
      pageSize: numPerPage,
      totalCount: businessesLength,
      links: links
    });

  } catch (err) {
    res.status(500).json({
      error: "Error fetching businesses list. Try again later."
    });
  }
});

/*
 * Route to create a new business.
 */

router.post('/', async function (req, res, next) {
  if (validateAgainstSchema(req.body, businessSchema)) {
    try {
      const id = await insertNewBusiness(req.body)
      res.status(201).send({ id: id });
    } catch (err) {
      res.status(500).send({
        error: "Error inserting business into DB."
      });
    }
  } else {
    res.status(400).json({
      error: "Request body is not a valid business object"
    });
  }
});

/*
 * Route to fetch info about a specific business.
 */

router.get('/:businessid', async function (req, res, next) {
  try {
    const business = await getBusinessById(parseInt(req.params.businessid));
    if (business) {
      res.status(200).send(business);
    } else {
      next();
    }
  } catch (err) {
    res.status(500).send({
      error: "Unable to fetch business."
    });
  }
});

/*
 * Route to replace data for a business.
 */

router.put('/:businessid', async function (req, res, next) {
  if (validateAgainstSchema(req.body, businessSchema)) {
    try {
      const updateSuccessful = await
        updateBusinessById(parseInt(req.params.id), req.body);
      if (updateSuccessful) {
        res.status(200).send({
          links: {
            business: `/businesses/${businessid}`
          }
        });
      } else {
        next();
      }
    } catch (err) {
      res.status(500).send({error: "Unable to update business."});
    }
  } else {
    res.status(400).json({
      error: "Request body does not contain a valid business."
    });
  }
});

/*
 * Route to delete a business.
 */

router.delete('/:businessid', async function (req, res, next) {
  try {
    const deleteSuccessful = await deleteBusinessById(parseInt(req.params.id));
    if (deleteSuccessful) {
            res.status(204).end();
    } else {
        next();
    }
} catch (err) {
    res.status(500).send({
        error: "Unable to delete business."
    });
  }
});