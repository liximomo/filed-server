const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

/**
 * 检测是否存
 * @param  {[string]} filename [full filename]
 * @return {[Promise]}
 */
function isFileExist(filename) {
  return new Promise((resolve, reject) => {
    fs.stat(filename, function(err, stat) {
      if (err) resolve(false);
      resolve(true);
    });
  });
}

/**
 * 检测是否存在并且是 folder
 * @param  {[string]} filename [full filename]
 * @return {[Promise]}
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
 * @param  {[string]}   file [full filename]
 * @return {[Promise]}
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

function getDirFileStats(dir) {
  const dirPath = dir.fullname;
  return new Promise((resolve, reject) => {
    fs.readdir(dirPath, function(err, list) {
      if (err) return done(err);
      const readStats = list.map(file => {
        const filePath = path.resolve(dirPath, file);
        return getFileStats(filePath);
      });
      const parentDir = {
        name: '..',
        fullname: path.join(dirPath, '..')
      };
      return Promise
        .all([parentDir].concat(readStats))  
        .then(results => 
          Object.assign({}, dir, {
            children: results
          })
        )
        .then(resolve, reject);
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
  getDirFileStats,
  getFileContent,
  zipDirectory,
}
