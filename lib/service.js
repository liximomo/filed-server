const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

/**
 * 检测是否存在并且是 file
 * @param  {[type]} filename [description]
 * @return {[type]}          [description]
 */
function isFileExist(filename) {
  return new Promise((resolve, reject) => {
    fs.stat(filename, function(err, stat) {
      if (err || !stat.isFile()) resolve(false);
      resolve(true);
    });
  });
}

/**
 * 检测是否存在并且是 folder
 * @param  {[type]} filename [description]
 * @return {[type]}          [description]
 */
function isFolderExist(filename) {
  return new Promise((resolve, reject) => {
    fs.stat(filename, function(err, stat) {
      if (err || !stat.isDirectory()) resolve(false);
      resolve(true);
    });
  });
}

/**
 * [getFileStats description]
 * @param  {[type]}   file [description]
 * @param  {Function} done [description]
 * @return Promise        [description]
 */
function getFileStats(file) {
  return new Promise((resolve, reject) => {
    fs.stat(file, function(err, stat) {
      if (err) {
        reject(err);
        return;
      }
      resolve(Object.assign({}, stat, {
        name: path.basename(file),
        fullname: file,
        file: stat.isFile(),
        directory: stat.isDirectory(),
      }));
    });
  });
};

function getFileContent(filename) {
  return new Promise((resolve, reject) => {
    fs.readFile(filename, (err, data) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(data.toString());
    });
  });
}

function zipDirectory(dir) {
  const archive = archiver.create('zip', {}); 

  archive.on('error', function(err){
    throw err;
  });
  archive.directory(dir, '');
  archive.finalize();
  return archive;
};

module.exports = {
  isFileExist,
  isFolderExist,
  getFileStats,
  getFileContent,
  zipDirectory,
}
