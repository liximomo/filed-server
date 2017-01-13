const fileUtil = require('./service');
const Express = require('express');
const paramsRoute = require('./paramsRoute');
const path = require('path');
const mime = require('mime');
const inspect = require('util').inspect;
 
const basePath = process.cwd();

const relativePath = (path) => {
  if (path.indexOf(basePath) < 0) {
    return '#';
  }
  return path.substr(basePath.length + 1);
};

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
const getFileConent = ({
  raw = true,
  dirProcesser
}) =>
 (req, res, next) => {
  fileUtil
    .getFileStats(req.custom.filename)
    .then(stat => {
      if (stat.directory) {
        if (!dirProcesser) {
          next(new Error('文件类型不正确'));
        } else {
          fileUtil.getDirFileStats(stat)
            .then(dirStat => {
              const children = dirStat.children.map(file =>
                Object.assign({}, file, {
                  queryPath: `${relativePath(file.fullname)}`
                })
              )
              dirProcesser(req, res, next, Object.assign({}, dirStat, {
                children,
              }))
            });
        }
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

const creator = ({ dirProcesser } = {}) => {
  const router = new Express.Router();
  router.use(processFilepath);

  const richRoute = new paramsRoute(getFileConent({ raw: false, dirProcesser }));
  richRoute.add('format=raw', getFileConent({ raw: true, dirProcesser }));
  richRoute.add('format=file', downLoadFile);

  router.use(richRoute.route());
  return router;
};

module.exports = creator;
