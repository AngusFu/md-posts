#!/usr/bin/env node
var Spinner = require('cli-spinner').Spinner;
var spinner = new Spinner('processing.. %s');
spinner.setSpinnerString('|/-\\');
spinner.start();

var fs = require('fs');
var path = require('path');
var exec = require('child_process').exec;

var argvs = Array.from(process.argv).slice(2);
var category = argvs[0];
var filename = argvs[1];

var dbjsonPath = './db.json';
checkDB(dbjsonPath);
var DBData = require(dbjsonPath),
    translations = DBData['translation'],
    articles = DBData['article'];

if (!translations) {
    translations = DBData['translation'] = [];
}

if (!articles) {
    articles = DBData['article'] = [];
}

// post -t [name]
if (category === '-t' && filename) {

    initDirectory({
        dirname: 'translation',
        filename: filename
    });

    translations.push({
        name: filename,
        createAt: +new Date
    });

    saveDB(dbjsonPath, DBData);
    spinner.stop();
    return;
}

// post -a [name]
if (category === '-a' && filename) {

    initDirectory({
        dirname: 'blog',
        filename: filename
    });

    articles.push({
        name: filename,
        createAt: +new Date
    });

    saveDB(dbjsonPath, DBData);
    spinner.stop();
    return;
}


// deploy to github
// post -d
if (category === '-d') {
    collectMeta(translations, './translation');
    collectMeta(articles, './blog');
    rewriteReadMe({
        translation: translations,
        'notes & articles': articles
    });

    saveDB(dbjsonPath, DBData);
    exec(`npm run deploy`, function(error, stdout, stderr) {
        console.log(stdout);
        spinner.stop();
        console.log('\n\ndone!!!');
    });
    return;
}

// init db.json with current files
// post -i
// if (category === '-i') {
//     updateCurrentDirectory({
//         './translation': translations,
//         './blog': articles
//     });
//     rewriteReadMe({
//         translation: translations,
//         'notes & articles': articles
//     });
//     saveDB(dbjsonPath, DBData);
//     spinner.stop();
//     return;
// }


// else
// console.log(
// `Usage: 
//   > post -t [name]    --- add translations
//   > post -a [name]    --- add articles
//   > post -d           --- deploy
//   > post -i           --- init db.json with current files
// `);

console.log(
`Usage: 
  > post -t [name]    --- add translations
  > post -a [name]    --- add articles
  > post -d           --- deploy
`);
spinner.stop();



// ========================================================

function joinp() {
    [].unshift.call(arguments, __dirname);
    return path.join.apply(path, arguments);
}


// ========================================================

function checkDB(dbPath) {
    var stat = null,
        dbObj = {};
    
    dbPath = joinp(dbPath);

    try {
        stat = fs.statSync(dbPath);
    } catch (e) {}

    if (!stat) {
        fs.writeFileSync(dbPath, '{}', 'utf-8');
    }
}

function saveDB(dbPath, DBData) {
    fs.writeFileSync(dbPath, JSON.stringify(DBData), 'utf-8');
}

// ===========================================================

function makeDirIfNotExists(path) {
    var stat = null;
    try {
        stat = fs.statSync(path);
    } catch (e) {}

    if (!stat || !stat.isDirectory()) {
        fs.mkdirSync(path);
    }
}

function writeBlankFile(filename) {
    fs.writeFileSync(filename, '', 'utf-8');
}

function initDirectory(config) {
    var dirname = config.dirname,
        filename = config.filename,
        type = config.type || 'md';
    makeDirIfNotExists(joinp(dirname));
    writeBlankFile(joinp(dirname, filename + '.' + type));
}


// ===========================================================


function collectMeta(collection, dir) {
    var H1_RE = /(?:\n|^)#\s*([^\n#]+)\s*\n/;
    collection.forEach(function(item) {
        try {
            if (item.title && item.url) return;
            var content = fs.readFileSync(joinp(dir, item.name + '.md')).toString(),
                macth = content.match(H1_RE),
                title = macth && macth[1];
            
            if (!title) return;
            
            item.title = title.trim();
            item.url = path.join(dir, item.name + '.md').replace(/\\/g, '/');
        } catch (e) {}
    });
}


function rewriteReadMe(obj) {
    var content = `# blog

I am Wemlin(文蔺) from China, now working as a web developer. 

This repository will witness my progress & growth in this industry.

Your [contact](mailto:angusfu1126@qq.com) is appreciated if any question/problem.

You can also see [my blog online](https://segmentfault.com/blog/wemlin).`;

    Object.keys(obj).forEach(function(key) {
        var arr = obj[key];
        content += `\n\n## ${key}`
        arr.forEach(function(item) {
            content += `\n\n- [${item.title}](${item.url})`;
        });
    });

    fs.writeFileSync('./README.md', content, 'utf-8');
}

function updateCurrentDirectory(obj) {
    var H1_RE = /(?:\n|^)#\s*([^\n#]+)\s*\n/;

    Object.keys(obj).forEach(function(dirname) {
        makeDirIfNotExists(joinp(dirname));

        var data = obj[dirname],
            files= fs.readdirSync(joinp(dirname));
        
        data.length = 0;

        files.forEach(function(filename) {
            var content = fs.readFileSync(joinp(dirname, filename)).toString(),
                macth = content.match(H1_RE),
                title = macth && macth[1];

            if (!title) return;

            data.push({
                name: filename.slice(0, -3),
                url: dirname + '/' + filename + '.md',
                title: title.trim()
            });
        });
    });
}