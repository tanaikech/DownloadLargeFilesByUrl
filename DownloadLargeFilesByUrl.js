/**
 * GitHub  https://github.com/tanaikech/DownloadLargeFilesByUrl<br>
 * download method for DownloadLargeFilesByUrl.<br>
 * @param {Object} resource Resource for downloading a file from an URL
 * @return {String} Return cfg object.
 */
function download(resource) {
    var d = new DownloadLargeFilesByUrl(resource);
    return d.download();
}

/**
 * getStatus method for DownloadLargeFilesByUrl.<br>
 * @param {Object} resource Resource for downloading a file from an URL
 * @return {String} Return cfg object.
 */
function getStatus(resource) {
    var d = new DownloadLargeFilesByUrl(resource);
    return d.getStatus();
}
;
(function(r) {
  var DownloadLargeFilesByUrl;
  DownloadLargeFilesByUrl = (function() {
    var chkDl, chkFolder, chkStatus, createCfgDl, createCfgJoin, createRanges, createSingleFile, downloadMain, fetch, fetchAll, fetchRaw, getLocation, loadCfg, recreateLocation, resumableDl, resumableJoin, resumableUploading, saveCfg, saveChunkToFile;

    function DownloadLargeFilesByUrl(r_) {
      this.name = "DownloadLargeFilesByUrl";
      this.startTime = Date.now();
      this.accessToken = ScriptApp.getOAuthToken();
      this.chunkSize = r_.chunkSize && r_.chunkSize >= 1048576 && r_.chunkSize <= 51380224 ? Math.floor(r_.chunkSize / 1024) * 1024 : 1048576 * 49;
      this.downloadPerExecution = r_.downloadPerExecution && r_.downloadPerExecution >= this.chunkSize ? r_.downloadPerExecution : 4;
      this.url = r_.url;
      this.exportFolderId = r_.exportFolderId || "";
      this.tempFolderId = r_.tempFolderId || "";
      this.temporalFiles = this.name;
      this.location = "";
      this.cfg = this.name + ".cfg";
      this.cfgFileId = "";
      if (this.tempFolderId === "") {
        this.cfgVal = {
          url: this.url,
          fileName: "",
          fileSize: 0,
          mimeType: "",
          exportFolderId: this.exportFolderId || DriveApp.getRootFolder().getId(),
          nextDownload: 0,
          nextJoin: -1,
          chunks: [],
          startDate: this.startTime,
          totalDownloadTime: 0,
          totalJoinTime: 0,
          totalElapsedTime: 0,
          location: "",
          expirationOfLocation: 0
        };
      } else {
        this.cfgVal = {};
      }
    }

    DownloadLargeFilesByUrl.prototype.download = function() {
      if (!this.url) {
        throw new Error("In order to download file, please set URL.");
      }
      return downloadMain.call(this);
    };

    DownloadLargeFilesByUrl.prototype.getStatus = function() {
      if (this.tempFolderId !== "" && chkFolder.call(this, this.tempFolderId)) {
        this.cfgVal = loadCfg.call(this);
        this.cfgVal.status = chkStatus.call(this);
        return this.cfgVal;
      }
    };

    downloadMain = function() {
      var chunks, fileSize, nStart, ranges;
      ranges = [];
      if (this.tempFolderId !== "") {
        if (chkFolder.call(this, this.tempFolderId)) {
          this.cfgVal = loadCfg.call(this);
          chunks = this.cfgVal.chunks;
          if (this.url !== this.cfgVal.url) {
            throw new Error("URL is different. URL of config file is " + this.cfgVal.url + ".");
          }
          if (this.cfgVal.nextDownload === -1 && this.cfgVal.nextJoin !== -1) {
            if (this.cfgVal.location !== "" && this.cfgVal.expirationOfLocation < this.startTime) {
              recreateLocation.call(this);
            }
            if (this.cfgVal.nextJoin === 0) {
              this.cfgVal.exportFolderId = this.exportFolderId || DriveApp.getRootFolder().getId();
            }
            return resumableJoin.call(this);
          }
          if (this.cfgVal.nextDownload === -1 && this.cfgVal.nextJoin === -1) {
            return chkStatus.call(this);
          }
          nStart = chunks[this.cfgVal.nextDownload].start;
          if (nStart === 0) {
            throw new Error("Offset is wrong.");
          }
          this.cfgVal.chunks.pop();
          fileSize = this.cfgVal.fileSize - nStart;
          if (fileSize <= this.downloadPerExecution * this.chunkSize) {
            ranges = createRanges.call(this, fileSize, nStart);
          } else {
            ranges = createRanges.call(this, this.downloadPerExecution * this.chunkSize, nStart);
          }
        } else {
          throw new Error("Folder of folderId '" + this.tempFolderId + "'' cannot be found.");
        }
      } else {
        chkDl.call(this);
        if (this.cfgVal.fileSize < this.chunkSize) {
          return createSingleFile.call(this, blob);
        }
        if (this.cfgVal.fileSize <= this.downloadPerExecution * this.chunkSize) {
          ranges = createRanges.call(this, this.cfgVal.fileSize, 0);
        } else {
          ranges = createRanges.call(this, this.downloadPerExecution * this.chunkSize, 0);
        }
      }
      return resumableDl.call(this, ranges);
    };

    loadCfg = function() {
      var cFile, cfg, cv;
      cfg = DriveApp.getFolderById(this.tempFolderId).getFilesByName(this.cfg);
      if (cfg.hasNext()) {
        cFile = cfg.next();
        this.cfgFileId = cFile.getId();
        cv = cFile.getBlob().getDataAsString();
        return JSON.parse(cv);
      } else {
        throw new Error(this.cfg + " file cannot be found in the folder of " + this.tempFolderId + ".");
      }
    };

    recreateLocation = function() {
      this.cfgVal.nextJoin = 0;
      this.cfgVal.location = "";
      saveCfg.call(this);
      throw new Error("Expiration time of location was over. Please run again. By this, files are joined from 1st chunk using new location.");
    };

    createRanges = function(fileSize, offset) {
      var end, i, j, quotient, ranges, ref, remainder, start;
      quotient = Math.floor(fileSize / this.chunkSize);
      remainder = fileSize % this.chunkSize;
      ranges = [];
      start = offset;
      end = offset + this.chunkSize - 1;
      for (i = j = 0, ref = quotient; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
        ranges.push({
          start: start,
          end: end,
          range: "bytes=" + start + "-" + end
        });
        if (i === quotient - 1) {
          break;
        }
        start = end + 1;
        end = start + (this.chunkSize - 1);
      }
      if (quotient > 0 && remainder > 0) {
        start = end + 1;
        end = start + (remainder - 1);
        ranges.push({
          start: start,
          end: end,
          range: "bytes=" + start + "-" + end
        });
      } else if (quotient === 0 && remainder > 0) {
        start = offset;
        end = start + (remainder - 1);
        ranges.push({
          start: start,
          end: end,
          range: "bytes=" + start + "-" + end
        });
      }
      return ranges;
    };

    chkFolder = function(folderId_) {
      var req, res;
      req = {
        url: "https://www.googleapis.com/drive/v3/files/" + folderId_,
        method: "get",
        muteHttpExceptions: true,
        headers: {
          Authorization: "Bearer " + this.accessToken
        }
      };
      res = fetchRaw.call(this, [req]);
      if (res[0].getResponseCode() !== 200) {
        return false;
      }
      return true;
    };

    chkStatus = function() {
      var obj;
      obj = {};
      if (this.cfgVal.nextDownload === -1 && this.cfgVal.nextJoin === -1) {
        obj.message = "Download of file had already been done.";
      } else if (this.cfgVal.nextDownload === -1 && this.cfgVal.nextJoin !== -1) {
        obj.message = "Download was completed. Joining file is not completed. Please join next chunk.";
      } else if (this.cfgVal.nextDownload !== -1 && this.cfgVal.nextJoin === -1) {
        obj.message = "Downloading file is not completed. Please download next chunk.";
      } else if (this.cfgVal.nextDownload !== -1 && this.cfgVal.nextJoin !== -1) {
        throw new Error("cfg file is wrong.");
      }
      return obj;
    };

    chkDl = function() {
      var headers, range, req, res;
      req = {
        url: this.url,
        method: "get",
        muteHttpExceptions: true,
        headers: {
          Range: "bytes=0-1"
        }
      };
      res = fetch.call(this, [req]);
      if (res.getResponseCode() === 206) {
        headers = res.getHeaders();
        range = headers["Content-Range"].split("\/");
        this.cfgVal.fileName = headers["Content-Disposition"].match(/filename=\"([a-zA-Z0-9\s\S].+)\";/)[1].trim() || this.startTime.toString();
        if (this.cfgVal.mimeType === "") {
          this.cfgVal.mimeType = headers["Content-Type"].split(";")[0];
        }
        if (this.cfgVal.fileSize === 0) {
          return this.cfgVal.fileSize = Number(range[1]);
        }
      } else {
        throw new Error("This file cannot be done the resumable download.");
      }
    };

    resumableDl = function(ranges_) {
      var obj, reqs, res;
      reqs = ranges_.map((function(_this) {
        return function(e) {
          return {
            url: _this.url,
            method: "get",
            muteHttpExceptions: true,
            headers: {
              Range: e.range
            }
          };
        };
      })(this));
      res = fetchAll.call(this, reqs);
      obj = {};
      res.forEach((function(_this) {
        return function(e, i) {
          var blob, dlChunkEnd, headers, range;
          if (e.getResponseCode() === 206) {
            blob = e.getBlob();
            headers = e.getHeaders();
            range = headers["Content-Range"].split("\/");
            dlChunkEnd = Number(range[0].split("-")[1]) + 1;
            _this.cfgVal.chunks.push({
              fileId: saveChunkToFile.call(_this, blob),
              start: ranges_[i].start,
              end: ranges_[i].end
            });
            if (i === res.length - 1) {
              if (_this.cfgVal.fileSize !== dlChunkEnd) {
                obj = {
                  nextStart: ranges_[i].end + 1
                };
                _this.cfgVal.nextDownload += 1;
                return;
              } else if (_this.cfgVal.fileSize === dlChunkEnd) {
                return;
              }
            }
            _this.cfgVal.nextDownload += 1;
            if (_this.cfgVal.fileSize < dlChunkEnd) {
              throw new Error("Chunk size is larger than the file size.");
            }
          } else {
            throw new Error("This file cannot be done the resumable download.");
          }
        };
      })(this));
      return createCfgDl.call(this, obj);
    };

    createSingleFile = function(blob_) {
      var file, folder;
      folder = DriveApp.getFolderById(this.cfgVal.exportFolderId);
      file = folder.createFile(blob_.setName(this.cfgVal.fileName));
      return {
        fileName: this.cfgVal.fileName,
        fileId: file.getId(),
        mimeType: this.cfgVal.mimeType,
        fileSize: this.cfgVal.fileSize,
        downloadUrl: this.url,
        totalElapsedTime: Math.floor((Date.now() - this.startTime) / 1000)
      };
    };

    saveChunkToFile = function(blob_) {
      var err, file, fileId, numTempFiles;
      if (this.cfgFileId === "" && this.tempFolderId === "") {
        this.tempFolderId = DriveApp.createFolder(this.name + Math.floor(this.startTime / 1000).toString()).getId();
      }
      fileId = "";
      try {
        numTempFiles = 0;
        blob_.setName(this.temporalFiles + (this.cfgVal.nextDownload + 1).toString());
        file = DriveApp.getFolderById(this.tempFolderId).createFile(blob_);
        fileId = file.getId();
      } catch (error) {
        err = error;
        throw new Error(err);
      }
      return fileId;
    };

    createCfgDl = function(obj_) {
      var processTime;
      processTime = Math.floor((Date.now() - this.startTime) / 1000);
      this.cfgVal.totalDownloadTime += processTime;
      this.cfgVal.totalElapsedTime += processTime;
      if (this.cfgFileId === "") {
        this.cfgVal.chunks.push({
          start: obj_.nextStart
        });
        this.cfgFileId = DriveApp.getFolderById(this.tempFolderId).createFile(this.cfg, JSON.stringify(this.cfgVal), MimeType.PLAIN_TEXT).getId();
      } else {
        if (obj_.nextStart) {
          this.cfgVal.chunks.push({
            start: obj_.nextStart
          });
        } else {
          this.cfgVal.nextDownload = -1;
          this.cfgVal.nextJoin = 0;
        }
        saveCfg.call(this);
      }
      this.cfgVal["tempFolderId"] = this.tempFolderId;
      return this.cfgVal;
    };

    resumableJoin = function() {
      var chunks, range, req, res;
      if (this.cfgVal.nextJoin === 0) {
        this.cfgVal.expirationOfLocation = this.startTime + (7 * 24 * 60 * 60 * 1000);
        this.location = getLocation.call(this);
      } else {
        this.location = this.cfgVal.location;
        if (!this.location) {
          throw new Error("Location value couldn't be found.");
        }
      }
      chunks = this.cfgVal.chunks;
      range = "bytes " + chunks[this.cfgVal.nextJoin].start + "-" + chunks[this.cfgVal.nextJoin].end + "/" + this.cfgVal.fileSize;
      req = {
        url: this.location,
        method: "put",
        muteHttpExceptions: true,
        payload: DriveApp.getFileById(this.cfgVal.chunks[this.cfgVal.nextJoin].fileId).getBlob().getBytes(),
        headers: {
          "Content-Range": range
        }
      };
      res = fetch.call(this, [req]);
      return createCfgJoin.call(this, res.getResponseCode());
    };

    getLocation = function() {
      var payload, req, res;
      payload = {
        mimeType: this.cfgVal.mimeType,
        name: this.cfgVal.fileName,
        parents: [this.cfgVal.exportFolderId]
      };
      req = {
        url: "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable",
        method: "post",
        muteHttpExceptions: true,
        contentType: "application/json",
        payload: JSON.stringify(payload),
        headers: {
          Authorization: "Bearer " + this.accessToken
        }
      };
      res = fetch.call(this, [req]);
      return res.getHeaders()["Location"];
    };

    resumableUploading = function(dlFiles_) {
      var res;
      res = [];
      dlFiles_.forEach((function(_this) {
        return function(e, i) {
          var complete, eTime, payload, req;
          if (_this.location === "") {
            payload = {
              mimeType: _this.cfgVal.mimeType,
              name: _this.cfgVal.fileName,
              parents: [_this.cfgVal.exportFolderId]
            };
            req = {
              url: "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable",
              method: "post",
              muteHttpExceptions: true,
              contentType: "application/json",
              payload: JSON.stringify(payload),
              headers: {
                Authorization: "Bearer " + _this.accessToken
              }
            };
            res = fetch.call(_this, [req]);
            _this.location = res.getHeaders()["Location"];
          }
          req = {
            url: _this.location,
            method: "put",
            muteHttpExceptions: true,
            payload: DriveApp.getFileById(e.fileId).getBlob().getBytes(),
            headers: {
              "Content-Range": e.range
            }
          };
          r = fetch.call(_this, [req]);
          res.push(r);
          eTime = Math.floor((Date.now() - _this.startTime) / 1000);
          if (eTime > _this.limitTime) {
            setNextUpload.call(_this, start, end, eTime);
            complete = false;
          }
        };
      })(this));
      return res[res.length - 1];
    };

    createCfgJoin = function(status_) {
      var processTime;
      if (status_ === 308 || status_ === 200) {
        processTime = Math.floor((Date.now() - this.startTime) / 1000);
        this.cfgVal.totalJoinTime += processTime;
        this.cfgVal.totalElapsedTime += processTime;
        if (this.cfgVal.nextJoin === 0) {
          this.cfgVal.location = this.location;
        }
        if (this.cfgVal.nextJoin < this.cfgVal.chunks.length - 1) {
          this.cfgVal.nextJoin += 1;
        } else {
          this.cfgVal.nextJoin = -1;
        }
        saveCfg.call(this);
        this.cfgVal["tempFolderId"] = this.tempFolderId;
      } else {
        throw new Error("It couldn't join the file. Please run the script again.");
      }
      return this.cfgVal;
    };

    saveCfg = function() {
      return DriveApp.getFileById(this.cfgFileId).setContent(JSON.stringify(this.cfgVal));
    };

    fetchRaw = function(req) {
      return UrlFetchApp.fetchAll(req);
    };

    fetchAll = function(reqs_) {
      var err, res;
      res = UrlFetchApp.fetchAll(reqs_);
      err = res.filter(function(e) {
        var code;
        code = e.getResponseCode();
        return code !== 200 && code !== 206 && code !== 308 && code !== 416;
      });
      if (err.length > 0) {
        throw new Error(err.length + " errors occurred. ErrorMessage: " + err);
        return;
      }
      return res;
    };

    fetch = function(req) {
      var err, res;
      res = UrlFetchApp.fetchAll(req);
      err = res.filter(function(e) {
        var code;
        code = e.getResponseCode();
        return code !== 200 && code !== 206 && code !== 308 && code !== 416;
      });
      if (err.length > 0) {
        throw new Error(err.length + " errors occurred. ErrorMessage: " + err);
        return;
      }
      return res[0];
    };

    return DownloadLargeFilesByUrl;

  })();
  return r.DownloadLargeFilesByUrl = DownloadLargeFilesByUrl;
})(this);
