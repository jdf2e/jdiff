const program = require('./bin/commander');
const url = require('url');
const path = require('path');
const querystring = require('querystring');
const opn = require('opn');
const http = require('http');
const shell = require('shelljs');
const fs = require('fs');
const request = require('request-promise');
const beautify_js = require('js-beautify').js;
const beautify_css = require('js-beautify').css;
const beautify_html = require('js-beautify').html;

let server;

if (program.local && program.remote) {
    let absLocalRoot = path.resolve(program.local);


    let obj = shell.find(absLocalRoot).filter(function (file) {
        return file.match(/\.(js|html|css|jpg|png|gif)$/ig);
    }).map(absPath => {
        absPath = path.normalize(absPath);
        let relativePath = absPath.replace(absLocalRoot, "");
        let baseName = path.basename(absPath);
        let removeUrl = url.resolve(program.remote, relativePath);
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

    program.time = program.time || "1d";
    if (program.time) {
        let val = parseInt(program.time);
        let type = program.time.replace(val, "");
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

        program.time = millisecond;
    }
    obj = obj.filter(file => {
        let lastModifyTime = new Date(file.status.mtime);
        let timeSpan = new Date() - lastModifyTime;
        return timeSpan < program.time
    });

    let promisePool = [];

    function beautify(item) {
        switch (item.type) {
            case ".js":
                item.localTxt = beautify_js(item.localTxt);
                item.remoteTxt = beautify_js(item.remoteTxt);

                break;
            case ".css":
                item.localTxt = beautify_css(item.localTxt);
                item.remoteTxt = beautify_css(item.remoteTxt);
                break;
            case ".html":
                item.localTxt = beautify_html(item.localTxt);
                item.remoteTxt = beautify_html(item.remoteTxt);
                fs.writeFileSync("aa.html", item.localTxt)
                break;
        }
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
        server = http.createServer((req, res) => {
            let myUrl = querystring.parse(url.parse(req.url).query);
            if (myUrl.action == "fetch") {
                res.write(JSON.stringify(arr), "utf-8", function () {
                    res.end();
                });
            } else {
                let tpl = fs.readFileSync(path.join(__dirname, "bin/index.html"), 'utf-8');
                res.write(tpl, "utf-8", function () {
                    res.end();
                })
            }
        })
        server.listen(8081);
        let port = server.address().port;
        console.log(port);
        //opn('http://localhost:' + port);
    });
} else {
    console.log("-l -r");
}