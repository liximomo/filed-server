const fileUtil = require('./service');
const Express = require('express');
const paramsRoute = require('./paramsRoute');
const path = require('path');
const mime = require('mime');

const basePath = process.cwd();

function extractfileName(request) {
  return request.path;
}

function processFilepath(req, res, next) {
  req.custom = req.custom || {};
  req.custom.filename = path.join(basePath, extractfileName(req));
  next();
}

const reUnescapedHtml = /[&<>"']/g;
const reHasUnescapedHtml = RegExp(reUnescapedHtml.source);
const htmlEscapes = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

function escapeRegExp(string) {
  return (string && reHasUnescapedHtml.test(string))
    ? string.replace(reUnescapedHtml, key => htmlEscapes[key])
    : string;
}

/**
 * 得到文件内容
 * @param  {[boolean]} raw [is raw content]
 */
const getFileConent = (raw = true) =>
 (req, res, next) => {
  fileUtil
    .getFileStats(req.custom.filename)
    .then(stat => {
      if (stat.directory) {
        next(new Error('文件类型不正确'));
      } else {
        fileUtil.getFileContent(stat.fullname)
          .then(data => {
              if (raw) {
                res.send(`<pre>${escapeRegExp(data)}</pre>`);
              } else {
                res.send(data);
              }
          });
      }
    }, err => res.status(404).send("file not exist!"))
    .catch(err => next(err));
};

function downLoadFile(req, res, next) {
  fileUtil
    .getFileStats(req.custom.filename)
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
router.use(processFilepath);

const richRoute = new paramsRoute(getFileConent(false));
richRoute.add('format=raw', getFileConent(true));
richRoute.add('format=file', downLoadFile);

router.use(richRoute.route());

module.exports = router;
