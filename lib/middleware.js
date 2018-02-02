const Express = require('express');
const fs = require('fs');
const path = require('path');
const mime = require('mime');
const through2 = require('through2');
const fileUtil = require('./service');
const paramsRoute = require('./paramsRoute');
const workPath = process.cwd();

let basePath;

const relativePath = path => {
  if (path.indexOf(basePath) < 0) {
    return '#';
  }
  let relativePath = path.substr(basePath.length);
  if (relativePath[0] === '/') {
    relativePath = relativePath.substr(1, relativePath.length);
  }
  return relativePath;
};

function extractfileName(request) {
  return decodeURIComponent(request.path);
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
  "'": '&#39;',
};

function escapeRegExp(string) {
  return string && reHasUnescapedHtml.test(string)
    ? string.replace(reUnescapedHtml, key => htmlEscapes[key])
    : string;
}

/**
 * 得到文件内容
 * @param  {[boolean]} raw [is raw content]
 */
const getFileConent = ({ raw = true, dirProcesser }) => (req, res, next) => {
  fileUtil
    .getFileStats(req.custom.filename)
    .then(
      stat => {
        if (stat.directory) {
          if (!dirProcesser) {
            next(new Error('文件类型不正确'));
          } else {
            fileUtil.getDirFileStats(stat).then(dirStat => {
              const children = dirStat.children.map(file =>
                Object.assign({}, file, {
                  queryPath: `${relativePath(file.fullname)}`,
                })
              );
              dirProcesser(
                req,
                res,
                next,
                Object.assign({}, dirStat, {
                  children,
                })
              );
            });
          }
        } else {
          const readStream = fs.createReadStream(stat.fullname);
          if (!raw) {
            // don't do anything, let Express.static do the rest.
            return next();
          }

          res.write('<pre>');
          readStream
            .pipe(
              through2(
                function(chunk, enc, callback) {
                  this.push(escapeRegExp(chunk.toString()));
                  callback();
                },
                function(cb) {
                  // flush function
                  this.push('</pre>');
                  cb();
                }
              )
            )
            .pipe(res);
        }
      },
      err => res.status(404).send('file not exist!')
    )
    .catch(err => next(err));
};

function downLoadFile(req, res, next) {
  fileUtil
    .getFileStats(req.custom.filename)
    .then(
      stat => {
        if (stat.directory) {
          try {
            const zip = fileUtil.zipDirectory(stat.fullname);
            res.set('Content-Type', 'application/zip');
            res.set('Content-Disposition', `attachment; filename=${stat.name}.zip`);
            zip.pipe(res);
          } catch (error) {
            next(error);
          }
        } else {
          res.set('Content-Type', mime.lookup(stat.fullname));
          res.set('Content-Length', stat.size);
          res.set('Content-Disposition', `attachment; filename=${encodeURIComponent(stat.name)}`);
          const readStream = fs.createReadStream(stat.fullname);
          readStream.pipe(res);
        }
      },
      err => res.status(404).send('file not exist!')
    )
    .catch(err => next(err));
}

const creator = ({ dirProcesser, dir = process.cwd() } = {}) => {
  if (path.isAbsolute(dir)) {
    basePath = dir;
  } else {
    basePath = path.join(workPath, dir);
  }

  const router = new Express.Router();
  router.use(processFilepath);

  const richRoute = new paramsRoute(getFileConent({ raw: false, dirProcesser }));
  richRoute.add('format=raw', getFileConent({ raw: true, dirProcesser }));
  richRoute.add('format=file', downLoadFile);

  router.use(richRoute.route());
  router.use(Express.static(basePath));
  return router;
};

module.exports = creator;
