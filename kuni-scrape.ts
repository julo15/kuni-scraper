import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import * as notifier from 'node-notifier';
import * as fs from 'fs';

const URLS: string[] = [
    'https://www.evga.com/products/product.aspx?pn=10G-P5-3881-KR',
    'https://www.evga.com/products/product.aspx?pn=10G-P5-3895-KR',
    'https://www.evga.com/products/product.aspx?pn=10G-P5-3897-KR',
    'https://www.evga.com/products/product.aspx?pn=10G-P5-3883-KR',
    'https://www.evga.com/products/product.aspx?pn=10G-P5-3885-KR',
    'https://www.newegg.com/p/pl?d=RTX+3080&N=100007709%20601357282&isdeptsrh=1',
    'https://www.bhphotovideo.com/c/search?q=rtx%203080&filters=fct_category%3Agraphic_cards_6567',
];

const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.121 Safari/537.36';

type StockResult = {
    available: boolean;
    product: string;
    url?: string;
};

const evgaGetProductStock = (dom: JSDOM): StockResult[] => [({
    available: dom.window.document.querySelector('#LFrame_pnlOutOfStock') === null,
    product: dom.window.document.querySelector('#LFrame_lblProductName').innerHTML,
})];

const neweggGetProductStock = (dom: JSDOM): StockResult[] => {
    // Assumes the link is a search results page
    const queryItem = '.item-container .item-info';
    const promoTexts = dom.window.document.querySelectorAll(`${queryItem} .item-promo`);
    const infos = dom.window.document.querySelectorAll(`${queryItem} .item-title`);
    const results: StockResult[] = [];
    promoTexts.forEach((node, index) => {
        const available = !node.innerHTML.includes('OUT OF STOCK');
        const url = infos.item(index).href;
        const product = infos.item(index).innerHTML;
        log(`Product: ${product}\nLink: ${url}\nAvailable: ${available}\n`);
        results.push({
            available,
            product,
            url,
        });
    });
    return results;
};

const bestbuyGetProductStock = (dom: JSDOM): StockResult[] => {
    console.log('best buy');
    const itemLinks = dom.window.document.querySelectorAll('.sku-item .sku-header a');
    const addToCardButtons = dom.window.document.querySelectorAll('.sku-item .fulfillment-add-to-cart-button');

    itemLinks.forEach((node, index) => {
        console.log(node);
    });
    return [{
        available: false,
        product: 'fake',
    }];
};

const bhGetProductStock = (dom: JSDOM): StockResult[] => {
    const productNames = dom.window.document.querySelectorAll('div[class^=productInner] h3 a span');
    const links = dom.window.document.querySelectorAll('div[class^=productInner] h3 a');
    const conversions = dom.window.document.querySelectorAll('div[class^=productInner] div[class^=conversion]');

    let results: StockResult[] = [];
    productNames.forEach((node, index) => {
        const product = node.innerHTML;
        const available = !!conversions[index].querySelector('button[class^=atcBtn]');
        const url = `https://www.bhphotovideo.com${links[index].href}`;
        log(`Product: ${product}\nLink: ${url}\nAvailable: ${available}\n`);
        results.push({
            available,
            product,
            url,
        });
    });
    return results;
};

const getProductStock = async (url: string): Promise<StockResult[] | null> => {
    try {
        const response = await fetch(url, {
            'Accept': 'text/html',
            'User-Agent': userAgent,
        });
        const text = await response.text();
        const dom = await new JSDOM(text);
        if (url.startsWith('https://www.evga.com')) {
            return evgaGetProductStock(dom);
        } 
        if (url.startsWith('https://www.newegg.com')) {
            return neweggGetProductStock(dom);
        }
        if (url.startsWith('https://www.bestbuy.com')) {
            return bestbuyGetProductStock(dom);
        }
        if (url.startsWith('https://www.bhphotovideo.com')) {
            return bhGetProductStock(dom);
        }
    } catch (e) {
        log(`Failed checking url: ${url}\nError: ${e}`);
    }

    return null;
};

const checkUrl = async (queryUrl: string): Promise<void> => {
    const results = await getProductStock(queryUrl);
    let text: string;
    if (results) {
      results.forEach((result: StockResult) => {
        const { available, product, url } = result;
        text = `Product: ${product}\nAvailable: ${available}`;
        log(`${text}\n\n`);
        if (available) {
            notifier.notify({
                title: 'GO GO GO CLICK ME BUY NOW!!!',
                message: `${product}`,
                open: url || queryUrl,
            });
        }
      });
    } else {
      text = `Failed: ${queryUrl}`;
    }
};

const checkAllUrls = async (urls: string[]) => {
    const promises = urls.map(url => checkUrl(url));
    return Promise.all(promises);
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const stream = fs.createWriteStream('log.txt', { flags: 'a' });

const log = (text: string) => {
    console.log(text);
    stream.write(`${text}\n`);
};


const main = async () => {
    const url = process.argv[2];
    if (url === 'push') {
        console.log('Sending test push');
        notifier.notify({
            title: 'Enabling push',
            message: 'If you see this, then things work.',
        });
        return;
    }

    if (url) {
        log('Checking passed-in url');
        await checkUrl(url);
        log('Done checking url');
        return;
    }

    const wait = 10;
    while (true) {
        log(`Starting iteration: ${new Date()}`);
        await checkAllUrls(URLS);
        log(`Ending iteration: ${new Date()}`);
        log(`Waiting ${wait} seconds before trying again...`);
        log('Press ctrl+c to quit.');
        await sleep(wait * 1000);
    }
};



main();
