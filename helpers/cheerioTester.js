const fetch = require("node-fetch");
const cheerio = require("cheerio");

const options =  {
    reddit : {
        url: 'https://www.reddit.com/r/all',
        selector: `const link = $('#siteTable').find('a').first().attr('href'); link.startsWith('http') ? link : 'https://www.reddit.com' + link;`        
    }
};

(async () => {
  const opts = options['vincit_kurssi'];
  const result = await fetch(opts.url);
  const html = await result.text();
  const $ = cheerio.load(html);
  const url = eval(opts.selector);
  console.log(url);
})();
