const router = require('express').Router();
const { validateAgainstSchema, extractValidFields } = require('../lib/validation');

exports.router = router;
const mysqlPool = require('../lib/mysqlpool');

/*
 * Schema describing required/optional fields of a photo object.
 */
const photoSchema = {
  userid: { required: true },
  businessid: { required: true },
  caption: { required: false }
};

async function insertNewPhoto(photo) {
  const validatedPhoto = extractValidFields(
    photo,
    photoSchema
  );
  const [ result ] = await mysqlPool.query(
    'INSERT INTO photos SET ?',
    validatedPhoto
  );
  return result.insertId;
}

async function getPhotoById(photoID) {
  const [ results ] = await mysqlPool.query(
    'SELECT * FROM photos WHERE id = ?',
    [ photoID ],
  );
  return results[0];
}

async function updatePhotoById(photoId, photo) {
  const validatedPhoto = extractValidFields(
    photo,
    photoSchema
  );
  const [ result ] = await mysqlPool.query(
      'UPDATE photos SET ? WHERE id = ?',
      [ validatedPhoto, photoId ]
  );
  return result.affectedRows > 0;
}

async function deletePhotoByID(photoId) {
  const [ result ] = await mysqlPool.query(
      'DELETE FROM photos WHERE id = ?',
      [ photoId ]
  );
  return result.affectedRows > 0;
}

/*
 * Route to create a new photo.
 */

router.post('/', async function(req, res, next){
  if (validateAgainstSchema(req.body, photoSchema)) {
    try {
      const id = await insertNewPhoto(req.body);
      res.status(201).send({
      id: id,
      links: { photo: `/photos/${id}`, business: `/businesses/${id}`} });
      } catch (err) {
        res.status(500).send({
        error: "Error inserting photo into DB."
      });
    }
  } else {
    res.status(400).json({
      error: "Request body is not a valid photo object"
    });
  }
});

/*
 * Route to fetch info about a specific photo.
 */

router.get('/:photoID', async function (req, res, next){
  try {
    const photo = await getPhotoById(parseInt(req.params.id));
    if (photo) {
      res.status(200).send(photo);
    } else {
      next();
    }
  } catch (err) {
    res.status(500).send({
      error: "Unable to fetch photo."
    });
  }
});

/*
 * Route to update a photo.
 */

router.put('/:photoID', async function (req, res, next) {
  const photoID = parseInt(req.params.photoID);
  try {
    if (validateAgainstSchema(req.body, photoSchema)) {
      const updatedPhoto = extractValidFields(req.body, photoSchema);
      const existingPhoto = await getPhotoById(photoID)
      if (existingPhoto && updatedPhoto.businessid === existingPhoto.businessid && updatedPhoto.userid === existingPhoto.userid) {
        await updatePhotoById(photoID, req.body);
        res.status(200).send({});
      } else {
        res.status(403).json({
          error: "Updated photo cannot modify businessid or userid"
        });
      }
    } else {
      res.status(400).json({
        error: "Request body is not a valid photo object"
      });
    }
  } catch (err) {
    res.status(500).json({
      error: "Unable to update photo"
    })
  }
});

/*
 * Route to delete a photo.
 */

router.delete('/:photoID', async function (req, res, next) {
  try {
    const deleteSuccessful = await deletePhotoByID(parseInt(req.params.id));
    if (deleteSuccessful) {
            res.status(204).end();
    } else {
        next();
    }
} catch (err) {
    res.status(500).send({
        error: "Unable to delete photo."
    });
  }
});