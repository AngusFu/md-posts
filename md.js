var markdown = require( "markdown" ).markdown;
var fs = require('fs');

var content = fs.readFileSync('./README.md').toString();
var html_content = markdown.toHTML(content);
fs.writeFileSync('xxxxxxx.html', html_content, 'utf-8');