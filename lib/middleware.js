const fileUtil = require('./service');
const Express = require('express');
const paramsRoute = require('./paramsRoute');
const path = require('path');
const mime = require('mime');

const basePath = process.cwd();

function processFilepath(req, res, next, filename) {
  req.params.filename = path.join(basePath, filename);
  next();
}

/**
 * 得到文件内容
 * @param  {[type]} req [description]
 * @param  {[type]} res [description]
 * @return {[type]}     [description]
 */
function getFileConent(req, res, next) {
  fileUtil
    .getFileStats(req.params.filename)
    .then(stat => {
      if (stat.directory) {
        next(new Error('文件类型不正确'));
      } else {
        fileUtil.getFileContent(stat.fullname)
          .then(data =>
            res.send(`<pre>${data}</pre>`)
          );
      }
    }, err => res.status(404).send("file not exist!"))
    .catch(err => next(err));
}

function downLoadFile(req, res, next) {
  fileUtil
    .getFileStats(req.params.filename)
    .then(stat => {
      if (stat.directory) {
        try {
          const zip = fileUtil.zipDirectory(stat.fullname)
          res.set('Content-Type', 'application/zip')
          res.set('Content-Disposition', `attachment; filename=${stat.name}.zip`);
          zip.pipe(res);
        } catch (error) {
          next(error)
        } 
      } else {
        res.set('Content-Type', mime.lookup(stat.fullname))
        res.set('Content-Disposition', `attachment; filename=${stat.name}`);
        res.sendFile(stat.fullname)
      }
    }, err => res.status(404).send("file not exist!"))
    .catch(err => next(err));
}

const router = new Express.Router();
router.param('filename', processFilepath);

const richRoute = new paramsRoute(getFileConent);
richRoute.add('format=file', downLoadFile);

router.route('/:filename')
  .get(richRoute.route())

module.exports = router;
