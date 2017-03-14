"use strict";
const url = require('url');
const path = require('path');
const querystring = require('querystring');
const opn = require('opn');
const http = require('http');
const shell = require('shelljs');
const urljoin = require('url-join');
const fs = require('fs');
const request = require('request-promise');
const beautify_js = require('js-beautify').js;
const beautify_css = require('js-beautify').css;
const beautify_html = require('js-beautify').html;
const lodash = require('lodash');

var Entities = require('html-entities').XmlEntities;

var entities = new Entities();

function encode(str) {
    return new Buffer(str).toString("base64");
}

function hostServer(data) {
    let server = http.createServer((req, res) => {
        let tpl = fs.readFileSync(path.join(__dirname, "bin/index.html"), 'utf-8');
        tpl = tpl.replace("data_place_holder", data);
        res.write(tpl, "utf-8", function () {
                res.end();
        })
    })
    server.listen(0);
    let port = server.address().port;
    console.log(`listen at: ${port}`);
    opn('http://localhost:' + port);
}

function outPutFile(data, filePath) {
    let tpl = fs.readFileSync(path.join(__dirname, "bin/index.html"), 'utf-8');
    tpl = tpl.replace("data_place_holder", data);
    if (fs.existsSync(filePath)) {
        shell.rm(filePath);
    }
    fs.writeFileSync(filePath, tpl, "utf-8");
}


module.exports = function (config) {
    console.log(config.remote);
    let server;

    if (config.local && config.remote) {
        let absLocalRoot = path.resolve(config.local);
        let reg = /^http/ig;
        if (!reg.test(config.remote)) {
            config.remote = `http://${config.remote}`
        }
        let obj = shell.find(absLocalRoot).filter(function (file) {
            return file.match(/\.(js|html|css)$/ig);
        }).map(absPath => {
            absPath = path.normalize(absPath);
            let relativePath = absPath.replace(absLocalRoot, "");
            relativePath = relativePath[0] == path.sep ? relativePath.substr(1) : relativePath;
            let baseName = path.basename(absPath);
            let removeUrl = relativePath ? urljoin(config.remote, relativePath) : urljoin(config.remote)
            let type = path.extname(absPath);
            let status = fs.lstatSync(absPath);
            let localTxt;
            if (type && type.match(/\.(js|html|css)$/ig)) {
                localTxt = fs.readFileSync(absPath, 'utf-8');
            }
            return {
                status,
                absPath,
                relativePath,
                removeUrl,
                type,
                localTxt,
                baseName
            }
        });

        config.time = config.time || "1d";
        if (config.time) {
            let val = parseInt(config.time);
            let type = config.time.replace(val, "");
            let millisecond;

            switch (type) {
                case "d":
                    millisecond = val * 24 * 60 * 60 * 1000;
                    break;
                case "h":
                    millisecond = val * 60 * 60 * 1000;
                    break;
                case "m":
                    millisecond = val * 60 * 1000;
                    break;
                case "s":
                    millisecond = val * 1000;
                    break;
            }

            config.time = millisecond;
        }
        obj = obj.filter(file => {
            let lastModifyTime = new Date(file.status.mtime);
            let timeSpan = new Date() - lastModifyTime;
            return timeSpan < config.time
        });

        let promisePool = [];

        function beautify(item) {
            // switch (item.type) {
            //     case ".js":
            //         item.localTxt = beautify_js(item.localTxt);
            //         item.remoteTxt = beautify_js(item.remoteTxt);

            //         break;
            //     case ".css":
            //         item.localTxt = beautify_css(item.localTxt);
            //         item.remoteTxt = beautify_css(item.remoteTxt);
            //         break;
            //     case ".html":
            //         item.localTxt = beautify_html(item.localTxt);
            //         item.remoteTxt = beautify_html(item.remoteTxt);
            //         break;
            // }
        }
        obj.forEach(item => {
            let promise = new Promise((resolve, reject) => {
                request(item.removeUrl)
                    .then(function (str) {
                        item.remoteTxt = str;
                        item.diffFlag = !(item.localTxt === item.remoteTxt);
                        beautify(item);
                        resolve(item);
                    })
                    .catch(function (err) {
                        item.diffFlag = true;
                        item.remoteTxt = `` //JSON.stringify(err, null, 2);
                        beautify(item);
                        item.remoteTxt = err.response.body; //JSON.stringify(err.response.body, null, 2);
                        resolve(item);
                        //console.log(err);
                    });
            });
            promisePool.push(promise);
        });

        Promise.all(promisePool).then(arr => {
            let json = JSON.stringify(arr);
            if (!config.outPutFile) {
                hostServer(encode(json));
            } else {
                outPutFile(encode(json), config.outPutFile);
            }
        });
    } else {
        //console.log("");
    }
}